import {
  Injectable,
  UnauthorizedException,
  BadGatewayException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Character } from '@prisma/client';
import { EncryptionService } from '../encryption/encryption.service';
import { Cron } from '@nestjs/schedule';

interface BnetCharacter {
  id: number;
  name: string;
  realm: { slug: string };
  playable_class: { name: string };
  level: number;
  guild?: { name: string };
}

interface BnetWowAccount {
  characters: BnetCharacter[];
}

interface BnetProfileResponse {
  wow_accounts: BnetWowAccount[];
}

interface BnetCharacterProfile {
  equipped_item_level: number;
  active_spec?: { name: string };
  guild?: { name: string };
}

interface BnetMediaResponse {
  assets?: Array<{
    key: string;
    value: string;
  }>;
}

interface BnetEquipmentItem {
  slot: {
    type: string;
    name: string;
  };
  item: {
    id: number;
    name: string;
  };
  level?: {
    value: number;
  };
  quality?: {
    type: string;
    name: string;
  };
  is_equipped?: boolean;
}

interface BnetEquipmentResponse {
  equipped_items?: BnetEquipmentItem[];
}

interface BnetSpecializationChoice {
  specialization?: {
    id: number;
    name: string;
    icon: string;
  };
  is_active?: boolean;
}

interface BnetSpecializationsResponse {
  specializations?: BnetSpecializationChoice[];
  active_specialization?: {
    id: number;
    name: string;
    icon: string;
  };
}

interface BnetRecipeRef {
  id?: number;
  name?: string;
}

interface BnetProfessionTier {
  skill_points?: number;
  known_recipes?: BnetRecipeRef[];
}

interface BnetPrimaryProfession {
  profession?: {
    id?: number;
    name?: string;
  };
  skill_points?: number;
  known_recipes?: BnetRecipeRef[];
  tiers?: BnetProfessionTier[];
}

interface BnetProfessionsResponse {
  primaries?: BnetPrimaryProfession[];
}

interface NormalizedProfession {
  professionId: number | null;
  profession: string;
  skillLevel: number;
  recipes: Array<{
    id: number | null;
    nameFr: string;
    nameEn: string;
  }>;
}

interface LocalizedProfessionSnapshot {
  professionId: number | null;
  profession: string;
  skillLevel: number;
  recipes: Array<{
    id: number | null;
    name: string;
  }>;
}

interface BnetOAuthTokenResponse {
  access_token: string;
}

interface BnetWowTokenResponse {
  price: number;
}

interface TrackTokenResult {
  price: number;
  createdAt: Date;
}

export interface SyncAllCharactersResult {
  totalUsers: number;
  processedUsers: number;
  syncedCharacters: number;
  failedUsers: Array<{
    userId: string;
    battletag: string;
    reason: string;
  }>;
}

const SPEC_TO_ROLE: Record<string, 'TANK' | 'HEALER' | 'DPS'> = {
  // Chevalier de la mort
  Sang: 'TANK',
  Givre: 'DPS',
  Impie: 'DPS',
  // Chasseur de démons
  Dévastation: 'DPS',
  Vengeance: 'TANK',
  // Druide
  Équilibre: 'DPS',
  Féral: 'DPS',
  Gardien: 'TANK',
  Restauration: 'HEALER',
  // Guerrier
  Armes: 'DPS',
  Furie: 'DPS',
  Protection: 'TANK',
  // Moine
  'Maître brasseur': 'TANK',
  'Marche-vent': 'DPS',
  'Tisse-brume': 'HEALER',
  // Paladin
  Sacré: 'HEALER',
  Vindicte: 'DPS',
  // Prêtre
  Discipline: 'HEALER',
  Ombre: 'DPS',
  // Voleur
  Assassinat: 'DPS',
  'Hors-la-loi': 'DPS',
  Subtilité: 'DPS',
  // Chaman
  // Chasseur
  'Maîtrise des bêtes': 'DPS',
  Précision: 'DPS',
  Survie: 'DPS',
  // Mage
  Arcanes: 'DPS',
  Feu: 'DPS',
  // Démoniste
  Affliction: 'DPS',
  Démonologie: 'DPS',
  Destruction: 'DPS',
  // Évocateur
  Augmentation: 'DPS',
  Préservation: 'HEALER',
};

@Injectable()
export class BlizzardService {
  private readonly logger = new Logger(BlizzardService.name);
  private readonly itemIconCache: Map<number, string> = new Map();
  private readonly recipeNameCache: Map<string, string> = new Map();

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  private getBnetRegion(): string {
    return process.env.BNET_REGION || 'eu';
  }

  private async getClientAccessToken(): Promise<string> {
    const clientId = process.env.BNET_CLIENT_ID;
    const clientSecret = process.env.BNET_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new UnauthorizedException(
        'Configuration Battle.net manquante pour le cron token.',
      );
    }

    const region = this.getBnetRegion();

    const response = await firstValueFrom(
      this.httpService.post<BnetOAuthTokenResponse>(
        `https://${region}.battle.net/oauth/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          auth: {
            username: clientId,
            password: clientSecret,
          },
        },
      ),
    );

    if (!response.data?.access_token) {
      throw new BadGatewayException(
        "Impossible de récupérer un token d'application Battle.net.",
      );
    }

    return response.data.access_token;
  }

  private async fetchAndPersistTokenPrice(): Promise<TrackTokenResult> {
    const region = this.getBnetRegion();
    const accessToken = await this.getClientAccessToken();

    const response = await firstValueFrom(
      this.httpService.get<BnetWowTokenResponse>(
        `https://${region}.api.blizzard.com/data/wow/token/index`,
        {
          params: {
            namespace: `dynamic-${region}`,
            locale: 'fr_FR',
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      ),
    );

    const priceInCopper = response.data?.price;

    if (typeof priceInCopper !== 'number') {
      throw new BadGatewayException('Prix du WoW Token invalide reçu.');
    }

    const priceInGold = Math.floor(priceInCopper / 10000);

    const saved = await this.prisma.wowTokenPrice.create({
      data: {
        price: priceInGold,
      },
      select: {
        price: true,
        createdAt: true,
      },
    });

    return saved;
  }

  @Cron('0 */3 * * *')
  async trackTokenPrice(): Promise<void> {
    try {
      const saved = await this.fetchAndPersistTokenPrice();

      this.logger.log(
        `WoW Token tracke: ${saved.price} or (cron toutes les 3h, timezone serveur)`,
      );
    } catch (error) {
      this.logger.error('Echec du tracking WoW Token', error as Error);
    }
  }

  async trackTokenPriceNow() {
    const saved = await this.fetchAndPersistTokenPrice();
    this.logger.log(`WoW Token tracke manuellement: ${saved.price} or`);
    return saved;
  }

  async getWowTokenHistory() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [currentPrice, history] = await Promise.all([
      this.prisma.wowTokenPrice.findFirst({
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.wowTokenPrice.findMany({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
    ]);

    return {
      currentPrice: currentPrice?.price ?? null,
      history,
    };
  }

  async verifyGuildMembership(
    userId: string,
    characterName: string,
    characterRealm: string | undefined,
    targetGuild: string = 'The Good Place',
  ): Promise<BnetCharacter> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user?.bnetAccessToken) {
      throw new UnauthorizedException(
        'Aucun token Battle.net trouvé. Veuillez vous reconnecter via Battle.net.',
      );
    }

    const accessToken = this.encryptionService.decrypt(user.bnetAccessToken);

    let response;
    try {
      response = await firstValueFrom(
        this.httpService.get<BnetProfileResponse>(
          'https://eu.api.blizzard.com/profile/user/wow',
          {
            params: {
              namespace: 'profile-eu',
              locale: 'fr_FR',
            },
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        ),
      );
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(
          `Blizzard API error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`,
        );
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new UnauthorizedException(
            'Token Battle.net expiré ou invalide. Veuillez vous reconnecter via /auth/bnet.',
          );
        }
      }
      throw new BadGatewayException(
        "Erreur lors de la communication avec l'API Blizzard.",
      );
    }

    const allCharacters = response.data.wow_accounts.flatMap(
      (account) => account.characters ?? [],
    );

    const normalizedCharacterName = characterName.trim().toLowerCase();
    const normalizedCharacterRealm = characterRealm
      ? this.toRealmSlug(characterRealm)
      : null;

    // Chercher le personnage (case-insensitive, avec realm si fourni)
    const character = allCharacters.find((char) => {
      const matchesName = char.name.toLowerCase() === normalizedCharacterName;
      const matchesRealm = normalizedCharacterRealm
        ? char.realm.slug === normalizedCharacterRealm
        : true;

      return matchesName && matchesRealm;
    });

    if (!character) {
      throw new UnauthorizedException({
        message: "Ce personnage n'appartient pas à ce compte Battle.net.",
        guildName: null,
      } as any);
    }

    // Récupérer les infos détaillées du perso pour la guilde
    const characterDetails = await this.fetchCharacterProfile(
      character.realm.slug,
      character.name.toLowerCase(),
      accessToken,
    );

    const characterGuild = characterDetails?.guild?.name;

    // Vérifier la guilde
    if (!characterGuild) {
      throw new UnauthorizedException({
        message: "Ce personnage n'est pas dans une guilde.",
        guildName: null,
      } as any);
    }

    if (!this.isSameNormalizedName(characterGuild, targetGuild)) {
      throw new UnauthorizedException({
        message: `Ce personnage est dans la guilde "${characterGuild}", pas dans "${targetGuild}".`,
        guildName: characterGuild,
      } as any);
    }

    return character;
  }

  async syncUserCharacters(userId: string): Promise<Character[]> {
    const targetGuild = 'The Good Place';

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user?.bnetAccessToken) {
      throw new UnauthorizedException(
        'Aucun token Battle.net trouvé. Veuillez vous reconnecter via Battle.net.',
      );
    }

    const accessToken = this.encryptionService.decrypt(user.bnetAccessToken);

    let response;
    try {
      response = await firstValueFrom(
        this.httpService.get<BnetProfileResponse>(
          'https://eu.api.blizzard.com/profile/user/wow',
          {
            params: {
              namespace: 'profile-eu',
              locale: 'fr_FR',
            },
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        ),
      );
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(
          `Blizzard API error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`,
        );
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new UnauthorizedException(
            'Token Battle.net expiré ou invalide. Veuillez vous reconnecter via /auth/bnet.',
          );
        }
      }
      throw new BadGatewayException(
        "Erreur lors de la communication avec l'API Blizzard.",
      );
    }

    const allCharacters = response.data.wow_accounts.flatMap(
      (account) => account.characters ?? [],
    );

    const maxLevelCharacters = allCharacters.filter((char) => char.level >= 80);

    const syncedCharacters: Character[] = [];
    const syncedCharacterIds: string[] = [];

    for (const char of maxLevelCharacters) {
      const details = await this.fetchCharacterProfile(
        char.realm.slug,
        char.name.toLowerCase(),
        accessToken,
      );

      const characterGuild = details?.guild?.name ?? char.guild?.name;
      if (
        characterGuild &&
        !this.isSameNormalizedName(characterGuild, targetGuild)
      ) {
        this.logger.debug(
          `Personnage ignoré hors guilde cible: ${char.name}-${char.realm.slug} (${characterGuild ?? 'sans guilde'})`,
        );
        continue;
      }

      if (!characterGuild) {
        this.logger.warn(
          `Guilde introuvable pour ${char.name}-${char.realm.slug}, synchronisation maintenue.`,
        );
      }

      const activeSpec = details?.active_spec?.name ?? 'Unknown';
      const ilvl = details?.equipped_item_level ?? 0;
      const gameRole = SPEC_TO_ROLE[activeSpec] ?? 'DPS';

      const [media, equipmentData, specializationInfo, professions] =
        await Promise.all([
          this.fetchMediaUrls(
            char.realm.slug,
            char.name.toLowerCase(),
            accessToken,
          ),
          this.fetchEquipment(
            char.realm.slug,
            char.name.toLowerCase(),
            accessToken,
          ),
          this.fetchSpecializations(
            char.realm.slug,
            char.name.toLowerCase(),
            accessToken,
          ),
          this.fetchCharacterProfessions(
            char.realm.slug,
            char.name.toLowerCase(),
            accessToken,
          ),
        ]);

      let existingCharacter = await this.prisma.character.findFirst({
        where: {
          userId,
          blizzardId: char.id,
        },
      });

      if (!existingCharacter) {
        existingCharacter = await this.prisma.character.findFirst({
          where: {
            userId,
            name: {
              equals: char.name,
              mode: 'insensitive',
            },
            realm: {
              equals: char.realm.slug,
              mode: 'insensitive',
            },
          },
        });
      }

      const characterPayload = {
        blizzardId: char.id,
        name: char.name,
        realm: char.realm.slug,
        class: char.playable_class.name,
        activeSpec,
        ilvl,
        gameRole,
        avatarUrl: media.avatarUrl,
        renderUrl: media.renderUrl,
        insetUrl: media.insetUrl,
        activeSpecName: specializationInfo.activeSpecName,
        activeSpecIcon: specializationInfo.activeSpecIcon,
        equipment: equipmentData as any,
        lastSyncAt: new Date(),
      };

      const synced = existingCharacter
        ? await this.prisma.character.update({
            where: { id: existingCharacter.id },
            data: characterPayload,
          })
        : await this.prisma.character.create({
            data: {
              userId,
              ...characterPayload,
            },
          });

      await this.upsertCharacterProfessions(synced.id, professions);

      syncedCharacters.push(synced);
      syncedCharacterIds.push(synced.id);
    }

    if (syncedCharacters.length > 0) {
      const mainCharacter = syncedCharacters.reduce((best, character) => {
        if (!best) {
          return character;
        }

        if (character.ilvl > best.ilvl) {
          return character;
        }

        if (character.ilvl === best.ilvl && character.isMain) {
          return character;
        }

        return best;
      }, syncedCharacters[0]);

      await this.prisma.$transaction(async (tx) => {
        await tx.character.updateMany({
          where: { userId },
          data: { isMain: false },
        });

        await tx.character.update({
          where: { id: mainCharacter.id },
          data: { isMain: true },
        });

        await tx.character.deleteMany({
          where: {
            userId: user.id,
            id: {
              notIn: syncedCharacterIds,
            },
          },
        });
      });
    } else {
      await this.prisma.character.deleteMany({
        where: {
          userId: user.id,
          id: {
            notIn: syncedCharacterIds,
          },
        },
      });
    }

    return syncedCharacters;
  }

  async syncAllUsersCharacters(): Promise<SyncAllCharactersResult> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        battletag: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const failedUsers: SyncAllCharactersResult['failedUsers'] = [];
    let syncedCharacters = 0;

    for (const user of users) {
      try {
        const characters = await this.syncUserCharacters(user.id);
        syncedCharacters += characters.length;
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : 'Erreur inconnue';
        failedUsers.push({
          userId: user.id,
          battletag: user.battletag,
          reason,
        });
        this.logger.warn(
          `Sync métiers ignorée pour ${user.battletag} (${user.id}): ${reason}`,
        );
      }
    }

    return {
      totalUsers: users.length,
      processedUsers: users.length - failedUsers.length,
      syncedCharacters,
      failedUsers,
    };
  }

  private async fetchCharacterProfile(
    realmSlug: string,
    characterName: string,
    token: string,
  ): Promise<BnetCharacterProfile | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<BnetCharacterProfile>(
          `https://eu.api.blizzard.com/profile/wow/character/${realmSlug}/${encodeURIComponent(characterName)}`,
          {
            params: {
              namespace: 'profile-eu',
              locale: 'fr_FR',
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.warn(
        `Impossible de récupérer le profil de ${characterName}-${realmSlug}: ${(error as AxiosError).response?.status}`,
      );
      return null;
    }
  }

  private async fetchMediaUrls(
    realmSlug: string,
    characterName: string,
    token: string,
  ): Promise<{ avatarUrl?: string; renderUrl?: string; insetUrl?: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<any>(
          `https://eu.api.blizzard.com/profile/wow/character/${realmSlug}/${encodeURIComponent(characterName)}/character-media`,
          {
            params: {
              namespace: 'profile-eu',
              locale: 'fr_FR',
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );

      this.logger.debug(
        `Media response for ${characterName}: ${JSON.stringify(response.data)}`,
      );

      const assets = response.data.assets || [];
      const media: {
        avatarUrl?: string;
        renderUrl?: string;
        insetUrl?: string;
      } = {};

      for (const asset of assets) {
        if (asset.key === 'avatar') {
          media.avatarUrl = asset.value;
        } else if (
          asset.key === 'main' ||
          asset.key === 'bust' ||
          asset.key === 'full'
        ) {
          media.renderUrl = asset.value;
        } else if (asset.key === 'main-raw') {
          media.insetUrl = asset.value;
        }
      }

      this.logger.debug(`Parsed media: ${JSON.stringify(media)}`);

      return media;
    } catch (error) {
      this.logger.error(
        `Erreur médias de ${characterName}-${realmSlug}: ${(error as AxiosError).response?.status} - ${JSON.stringify((error as AxiosError).response?.data)}`,
      );
      return {};
    }
  }

  private async fetchEquipment(
    realmSlug: string,
    characterName: string,
    token: string,
  ): Promise<BnetEquipmentItem[] | undefined> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<any>(
          `https://eu.api.blizzard.com/profile/wow/character/${realmSlug}/${encodeURIComponent(characterName)}/equipment`,
          {
            params: {
              namespace: 'profile-eu',
              locale: 'fr_FR',
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );

      this.logger.debug(
        `Equipment response for ${characterName}: ${JSON.stringify(response.data)}`,
      );

      return response.data.equipped_items || undefined;
    } catch (error) {
      this.logger.error(
        `Erreur équipement de ${characterName}-${realmSlug}: ${(error as AxiosError).response?.status} - ${JSON.stringify((error as AxiosError).response?.data)}`,
      );
      return undefined;
    }
  }

  private async fetchSpecializations(
    realmSlug: string,
    characterName: string,
    token: string,
  ): Promise<{ activeSpecName?: string; activeSpecIcon?: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<any>(
          `https://eu.api.blizzard.com/profile/wow/character/${realmSlug}/${encodeURIComponent(characterName)}/specializations`,
          {
            params: {
              namespace: 'profile-eu',
              locale: 'fr_FR',
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );

      this.logger.debug(
        `Specializations response for ${characterName}: ${JSON.stringify(response.data)}`,
      );

      const activeSpec = response.data.active_specialization;
      if (activeSpec) {
        return {
          activeSpecName: activeSpec.name,
          activeSpecIcon: activeSpec.icon,
        };
      }

      return {};
    } catch (error) {
      this.logger.error(
        `Erreur spécialisations de ${characterName}-${realmSlug}: ${(error as AxiosError).response?.status} - ${JSON.stringify((error as AxiosError).response?.data)}`,
      );
      return {};
    }
  }

  private async fetchCharacterProfessions(
    realmSlug: string,
    characterName: string,
    token: string,
  ): Promise<NormalizedProfession[]> {
    try {
      const [frData, enData] = await Promise.all([
        this.fetchCharacterProfessionsByLocale(
          realmSlug,
          characterName,
          token,
          'fr_FR',
        ),
        this.fetchCharacterProfessionsByLocale(
          realmSlug,
          characterName,
          token,
          'en_GB',
        ),
      ]);

      const merged = this.mergeLocalizedProfessions(frData, enData);
      await this.enrichFrenchRecipeNames(merged);
      return merged;
    } catch (error) {
      this.logger.warn(
        `Impossible de récupérer les métiers de ${characterName}-${realmSlug}: ${(error as AxiosError).response?.status}`,
      );
      return [];
    }
  }

  private async fetchCharacterProfessionsByLocale(
    realmSlug: string,
    characterName: string,
    token: string,
    locale: 'fr_FR' | 'en_GB',
  ): Promise<LocalizedProfessionSnapshot[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<BnetProfessionsResponse>(
          `https://eu.api.blizzard.com/profile/wow/character/${realmSlug}/${encodeURIComponent(characterName)}/professions`,
          {
            params: {
              namespace: 'profile-eu',
              locale,
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );

      return this.normalizePrimaryProfessions(response.data);
    } catch (error) {
      this.logger.warn(
        `Impossible de récupérer les métiers (${locale}) de ${characterName}-${realmSlug}: ${(error as AxiosError).response?.status}`,
      );
      return [];
    }
  }

  private normalizePrimaryProfessions(
    data: BnetProfessionsResponse,
  ): LocalizedProfessionSnapshot[] {
    const primaries = data.primaries ?? [];

    return primaries
      .map((profession) => {
        const professionName = profession.profession?.name?.trim();
        if (!professionName) {
          return null;
        }

        const tierSkillLevels = (profession.tiers ?? [])
          .map((tier) => tier.skill_points ?? 0)
          .filter((value) => Number.isFinite(value));

        const skillLevel = Math.max(
          profession.skill_points ?? 0,
          ...tierSkillLevels,
        );

        const recipes = new Map<string, { id: number | null; name: string }>();

        for (const recipe of profession.known_recipes ?? []) {
          const recipeName = recipe.name?.trim();
          const recipeId = typeof recipe.id === 'number' ? recipe.id : null;
          if (!recipeName && recipeId === null) {
            continue;
          }

          const key = recipeId !== null ? `id:${recipeId}` : `name:${recipeName?.toLowerCase()}`;
          if (!recipes.has(key)) {
            recipes.set(key, {
              id: recipeId,
              name: recipeName || String(recipeId),
            });
          }
        }

        for (const tier of profession.tiers ?? []) {
          for (const recipe of tier.known_recipes ?? []) {
            const recipeName = recipe.name?.trim();
            const recipeId = typeof recipe.id === 'number' ? recipe.id : null;
            if (!recipeName && recipeId === null) {
              continue;
            }

            const key =
              recipeId !== null ? `id:${recipeId}` : `name:${recipeName?.toLowerCase()}`;
            if (!recipes.has(key)) {
              recipes.set(key, {
                id: recipeId,
                name: recipeName || String(recipeId),
              });
            }
          }
        }

        return {
          professionId:
            typeof profession.profession?.id === 'number'
              ? profession.profession.id
              : null,
          profession: professionName,
          skillLevel,
          recipes: Array.from(recipes.values()),
        };
      })
      .filter((profession): profession is LocalizedProfessionSnapshot =>
        Boolean(profession),
      );
  }

  private mergeLocalizedProfessions(
    frData: LocalizedProfessionSnapshot[],
    enData: LocalizedProfessionSnapshot[],
  ): NormalizedProfession[] {
    const merged = new Map<string, NormalizedProfession>();

    const getProfessionKey = (profession: LocalizedProfessionSnapshot): string => {
      if (profession.professionId !== null) {
        return `id:${profession.professionId}`;
      }
      return `name:${profession.profession.toLowerCase()}`;
    };

    const getRecipeKey = (recipe: { id: number | null; name?: string; nameFr?: string; nameEn?: string }): string => {
      if (recipe.id !== null) {
        return `id:${recipe.id}`;
      }
      const nameValue = (recipe as any).name || (recipe as any).nameFr || (recipe as any).nameEn || '';
      return `name:${nameValue.toLowerCase()}`;
    };

    for (const profession of frData) {
      merged.set(getProfessionKey(profession), {
        professionId: profession.professionId,
        profession: profession.profession,
        skillLevel: profession.skillLevel,
        recipes: profession.recipes.map((recipe) => ({
          id: recipe.id,
          nameFr: recipe.name,
          nameEn: recipe.name,
        })),
      });
    }

    for (const professionEn of enData) {
      const professionKey = getProfessionKey(professionEn);
      const existing = merged.get(professionKey);

      if (!existing) {
        merged.set(professionKey, {
          professionId: professionEn.professionId,
          profession: professionEn.profession,
          skillLevel: professionEn.skillLevel,
          recipes: professionEn.recipes.map((recipe) => ({
            id: recipe.id,
            nameFr: recipe.name,
            nameEn: recipe.name,
          })),
        });
        continue;
      }

      existing.skillLevel = Math.max(existing.skillLevel, professionEn.skillLevel);
      const recipeMap = new Map(existing.recipes.map((recipe) => [getRecipeKey(recipe), recipe]));

      for (const recipeEn of professionEn.recipes) {
        const recipeKey = getRecipeKey(recipeEn);
        const existingRecipe = recipeMap.get(recipeKey);

        if (existingRecipe) {
          existingRecipe.nameEn = recipeEn.name;
          continue;
        }

        recipeMap.set(recipeKey, {
          id: recipeEn.id,
          nameFr: recipeEn.name,
          nameEn: recipeEn.name,
        });
      }

      existing.recipes = Array.from(recipeMap.values());
    }

    return Array.from(merged.values());
  }

  private async enrichFrenchRecipeNames(
    professions: NormalizedProfession[],
  ): Promise<void> {
    const clientToken = await this.getClientAccessToken();
    const recipeIdsToEnrich = new Set<number>();

    for (const profession of professions) {
      for (const recipe of profession.recipes) {
        if (
          recipe.id !== null &&
          (!recipe.nameFr ||
            recipe.nameFr.toLowerCase() === recipe.nameEn.toLowerCase())
        ) {
          recipeIdsToEnrich.add(recipe.id);
        }
      }
    }

    const recipeIds = Array.from(recipeIdsToEnrich);
    const batchSize = 8;

    for (let index = 0; index < recipeIds.length; index += batchSize) {
      const batch = recipeIds.slice(index, index + batchSize);

      const batchNames = await Promise.all(
        batch.map(async (recipeId) => ({
          recipeId,
          frenchName: await this.fetchRecipeNameByLocale(
            recipeId,
            'fr_FR',
            clientToken,
          ),
        })),
      );

      for (const { recipeId, frenchName } of batchNames) {
        if (!frenchName) {
          continue;
        }

        for (const profession of professions) {
          for (const recipe of profession.recipes) {
            if (recipe.id === recipeId) {
              recipe.nameFr = frenchName;
            }
          }
        }
      }
    }
  }

  private isSameNormalizedName(left: string, right: string): boolean {
    return (
      this.normalizeComparableName(left) === this.normalizeComparableName(right)
    );
  }

  private normalizeComparableName(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async fetchRecipeNameByLocale(
    recipeId: number,
    locale: 'fr_FR' | 'en_GB',
    token: string,
  ): Promise<string | null> {
    const cacheKey = `${locale}:${recipeId}`;
    const cachedName = this.recipeNameCache.get(cacheKey);

    if (cachedName) {
      return cachedName;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ name?: string }>(
          `https://eu.api.blizzard.com/data/wow/recipe/${recipeId}`,
          {
            params: {
              namespace: 'static-eu',
              locale,
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );

      const recipeName = response.data?.name?.trim();
      if (!recipeName) {
        return null;
      }

      this.recipeNameCache.set(cacheKey, recipeName);
      return recipeName;
    } catch (error) {
      this.logger.debug(
        `Nom de recette introuvable (${locale}) pour recipeId=${recipeId}: ${(error as AxiosError).response?.status}`,
      );
      return null;
    }
  }

  private toRealmSlug(realm: string): string {
    return realm
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async upsertCharacterProfessions(
    characterId: string,
    professions: NormalizedProfession[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const professionNames = professions.map((profession) => profession.profession);

      if (professionNames.length === 0) {
        await tx.characterProfession.deleteMany({ where: { characterId } });
        return;
      }

      await tx.characterProfession.deleteMany({
        where: {
          characterId,
          profession: { notIn: professionNames },
        },
      });

      for (const profession of professions) {
        await tx.characterProfession.upsert({
          where: {
            characterId_profession: {
              characterId,
              profession: profession.profession,
            },
          },
          update: {
            skillLevel: profession.skillLevel,
            recipes: profession.recipes,
          },
          create: {
            characterId,
            profession: profession.profession,
            skillLevel: profession.skillLevel,
            recipes: profession.recipes,
          },
        });
      }
    });
  }

  async fetchItemIcon(itemId: number): Promise<string> {
    // Vérifier le cache
    if (this.itemIconCache.has(itemId)) {
      return this.itemIconCache.get(itemId)!;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ icon?: string }>(
          `https://nether.wowhead.com/tooltip/item/${itemId}`,
        ),
      );

      if (response.data?.icon) {
        const iconUrl = `https://wow.zamimg.com/images/wow/icons/large/${response.data.icon}.jpg`;
        this.itemIconCache.set(itemId, iconUrl);
        return iconUrl;
      }

      throw new Error('No icon found');
    } catch (error) {
      this.logger.warn(
        `Failed to fetch icon for item ${itemId}, using fallback`,
      );
      // Fallback statique fiable pour garantir un affichage.
      const fallbackUrl =
        'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg';
      this.itemIconCache.set(itemId, fallbackUrl);
      return fallbackUrl;
    }
  }
}
