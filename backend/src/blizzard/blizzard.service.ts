import { Injectable, UnauthorizedException, BadGatewayException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Character } from '@prisma/client';

interface BnetCharacter {
  name: string;
  realm: { slug: string };
  playable_class: { name: string };
  level: number;
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
}

const SPEC_TO_ROLE: Record<string, 'TANK' | 'HEALER' | 'DPS'> = {
  // Chevalier de la mort
  'Sang': 'TANK',
  'Givre': 'DPS',
  'Impie': 'DPS',
  // Chasseur de démons
  'Dévastation': 'DPS',
  'Vengeance': 'TANK',
  // Druide
  'Équilibre': 'DPS',
  'Féral': 'DPS',
  'Gardien': 'TANK',
  'Restauration': 'HEALER',
  // Guerrier
  'Armes': 'DPS',
  'Furie': 'DPS',
  'Protection': 'TANK',
  // Moine
  'Maître brasseur': 'TANK',
  'Marche-vent': 'DPS',
  'Tisse-brume': 'HEALER',
  // Paladin
  'Sacré': 'HEALER',
  'Vindicte': 'DPS',
  // Prêtre
  'Discipline': 'HEALER',
  'Ombre': 'DPS',
  // Voleur
  'Assassinat': 'DPS',
  'Hors-la-loi': 'DPS',
  'Subtilité': 'DPS',
  // Chaman
  // Chasseur
  'Maîtrise des bêtes': 'DPS',
  'Précision': 'DPS',
  'Survie': 'DPS',
  // Mage
  'Arcanes': 'DPS',
  'Feu': 'DPS',
  // Démoniste
  'Affliction': 'DPS',
  'Démonologie': 'DPS',
  'Destruction': 'DPS',
  // Évocateur
  'Augmentation': 'DPS',
  'Préservation': 'HEALER',
};

@Injectable()
export class BlizzardService {
  private readonly logger = new Logger(BlizzardService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

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
        'Erreur lors de la communication avec l\'API Blizzard.',
      );
    }

    const allCharacters = response.data.wow_accounts.flatMap(
      (account) => account.characters ?? [],
    );

    const maxLevelCharacters = allCharacters.filter(
      (char) => char.level >= 80,
    );

    const syncedCharacters: Character[] = [];

    for (const char of maxLevelCharacters) {
      const details = await this.fetchCharacterProfile(
        char.realm.slug,
        char.name.toLowerCase(),
        user.bnetAccessToken,
      );

      const activeSpec = details?.active_spec?.name ?? 'Unknown';
      const ilvl = details?.equipped_item_level ?? 0;
      const gameRole = SPEC_TO_ROLE[activeSpec] ?? 'DPS';

      const synced = await this.prisma.character.upsert({
        where: {
          userId_name_realm: {
            userId,
            name: char.name,
            realm: char.realm.slug,
          },
        },
        update: {
          class: char.playable_class.name,
          activeSpec,
          ilvl,
          gameRole,
          lastSyncAt: new Date(),
        },
        create: {
          userId,
          name: char.name,
          realm: char.realm.slug,
          class: char.playable_class.name,
          activeSpec,
          gameRole,
          ilvl,
          lastSyncAt: new Date(),
        },
      });

      syncedCharacters.push(synced);
    }

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
}
