import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

export interface RaiderIoProfile {
  name: string;
  mythic_plus_scores_by_season?: Array<{
    scores?: {
      all?: number;
    };
  }>;
  raid_progression?: Record<string, { summary: string }>;
}

@Injectable()
export class RaiderioService {
  private readonly logger = new Logger(RaiderioService.name);

  constructor(private readonly httpService: HttpService) {}

  async getCharacterProfile(
    realm: string,
    characterName: string,
  ): Promise<RaiderIoProfile | null> {
    const realmSlug = this.toRealmSlug(realm);

    try {
      const response = await firstValueFrom(
        this.httpService.get<RaiderIoProfile>(
          'https://raider.io/api/v1/characters/profile',
          {
            params: {
              region: 'eu',
              realm: realmSlug,
              name: characterName,
              fields: 'mythic_plus_scores_by_season:current,raid_progression',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 400) {
        this.logger.warn(
          `Raider.IO profile introuvable pour ${characterName}-${realmSlug}`,
        );
        return null;
      }

      this.logger.error(
        `Erreur Raider.IO pour ${characterName}-${realmSlug}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new BadGatewayException(
        'Impossible de recuperer les donnees Raider.IO',
      );
    }
  }

  private toRealmSlug(realm: string): string {
    return realm.trim().toLowerCase().replace(/\s+/g, '-');
  }
}
