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

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  async verifyGuildMembership(
    userId: string,
    characterName: string,
    targetGuild: string = 'The Good Place',
  ): Promise<BnetCharacter> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user?.bnetAccessToken) {
      throw new UnauthorizedException(
        'Aucun token Battle.net trouvé. Veuillez vous reconnecter via Battle.net.',
      );
    }

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
              Authorization: `Bearer ${user.bnetAccessToken}`,
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

    // Chercher le personnage (case-insensitive)
    const character = allCharacters.find(
      (char) => char.name.toLowerCase() === characterName.toLowerCase(),
    );

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
      user.bnetAccessToken,
    );

    const characterGuild = characterDetails?.guild?.name;

    // Vérifier la guilde
    if (!characterGuild) {
      throw new UnauthorizedException({
        message: "Ce personnage n'est pas dans une guilde.",
        guildName: null,
      } as any);
    }

    const targetGuildLower = targetGuild.toLowerCase();

    if (characterGuild.toLowerCase() !== targetGuildLower) {
      throw new UnauthorizedException({
        message: `Ce personnage est dans la guilde "${characterGuild}", pas dans "${targetGuild}".`,
        guildName: characterGuild,
      } as any);
    }

    return character;
  }

  async syncUserCharacters(userId: string): Promise<Character[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user?.bnetAccessToken) {
      throw new UnauthorizedException(
        'Aucun token Battle.net trouvé. Veuillez vous reconnecter via Battle.net.',
      );
    }

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
              Authorization: `Bearer ${user.bnetAccessToken}`,
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
        user.bnetAccessToken,
      );

      const activeSpec = details?.active_spec?.name ?? 'Unknown';
      const ilvl = details?.equipped_item_level ?? 0;
      const gameRole = SPEC_TO_ROLE[activeSpec] ?? 'DPS';

      // Récupérer les médias (photos)
      const media = await this.fetchMediaUrls(
        char.realm.slug,
        char.name.toLowerCase(),
        user.bnetAccessToken,
      );

      // Récupérer l'équipement
      const equipmentData = await this.fetchEquipment(
        char.realm.slug,
        char.name.toLowerCase(),
        user.bnetAccessToken,
      );

      // Récupérer les spécialisations détaillées
      const specializationInfo = await this.fetchSpecializations(
        char.realm.slug,
        char.name.toLowerCase(),
        user.bnetAccessToken,
      );

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

      syncedCharacters.push(synced);
      syncedCharacterIds.push(synced.id);
    }

    await this.prisma.character.deleteMany({
      where: {
        userId: user.id,
        id: {
          notIn: syncedCharacterIds,
        },
      },
    });

    return syncedCharacters;
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
        } else if (asset.key === 'inset') {
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
