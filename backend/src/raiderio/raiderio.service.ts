import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

export interface RaiderIoProfile {
  name: string;
  mythic_plus_scores_by_season?: Array<{
    scores?: {
      all?: number;
    };
  }>;
  raid_progression?: Record<string, { summary: string }>;
}

interface RaiderIoCharacterMplusResponse {
  mythic_plus_scores_by_season?: Array<{
    scores?: {
      all?: number;
    };
  }>;
  mythic_plus_best_runs?: Array<{
    mythic_level?: number;
  }>;
}

export interface RaiderIoGuildProfile {
  name: string;
  realm: string;
  raid_progression?: Record<string, { summary: string }>;
  raid_rankings?: Record<string, unknown>;
}

export interface RaiderIoGuildLeaderboardEntry {
  characterId: string;
  name: string;
  realm: string;
  class: string;
  avatarUrl: string | null;
  battletag: string;
  rioScore: number;
  bestKeyLevel: number | null;
}

type CachedMplusValue = {
  score: number;
  bestKeyLevel: number | null;
};

type CachedMplusEntry = {
  expiresAt: number;
  value: CachedMplusValue;
};

@Injectable()
export class RaiderioService {
  private readonly logger = new Logger(RaiderioService.name);
  private readonly characterMplusCache = new Map<string, CachedMplusEntry>();
  private readonly scoreCacheTtlMs = 5 * 60 * 1000;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

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

  async getGuildProfile(
    realm: string,
    name: string,
  ): Promise<RaiderIoGuildProfile | null> {
    const realmSlug = this.toRealmSlug(realm);

    try {
      const response = await firstValueFrom(
        this.httpService.get<RaiderIoGuildProfile>(
          `https://raider.io/api/v1/guilds/profile?region=eu&realm=${realmSlug}&name=${encodeURIComponent(name)}&fields=raid_progression,raid_rankings`,
        ),
      );

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 400) {
        this.logger.warn(
          `Raider.IO guilde introuvable pour ${name}-${realmSlug}`,
        );
        return null;
      }

      this.logger.error(
        `Erreur Raider.IO guilde pour ${name}-${realmSlug}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new BadGatewayException(
        'Impossible de recuperer les donnees Raider.IO de la guilde',
      );
    }
  }

  async getGuildLeaderboard(
    realm: string,
    name: string,
  ): Promise<RaiderIoGuildLeaderboardEntry[]> {
    const mains = await this.prisma.character.findMany({
      where: { isMain: true },
      select: {
        id: true,
        name: true,
        realm: true,
        class: true,
        avatarUrl: true,
        user: {
          select: {
            battletag: true,
          },
        },
      },
    });

    const leaderboard: RaiderIoGuildLeaderboardEntry[] = [];

    for (let i = 0; i < mains.length; i += 5) {
      const chunk = mains.slice(i, i + 5);

      const chunkEntries = await Promise.all(
        chunk.map(async (character) => {
          try {
            const rioData = await this.getCharacterMplusSummary(
              character.realm,
              character.name,
            );

            return {
              characterId: character.id,
              name: character.name,
              realm: character.realm,
              class: character.class,
              avatarUrl: character.avatarUrl,
              battletag: character.user.battletag,
              rioScore: rioData.score,
              bestKeyLevel: rioData.bestKeyLevel,
            } satisfies RaiderIoGuildLeaderboardEntry;
          } catch (error) {
            this.logger.warn(
              `Impossible de recuperer le score Raider.IO pour ${character.name}-${character.realm} (${name}-${realm})`,
            );

            return {
              characterId: character.id,
              name: character.name,
              realm: character.realm,
              class: character.class,
              avatarUrl: character.avatarUrl,
              battletag: character.user.battletag,
              rioScore: 0,
              bestKeyLevel: null,
            } satisfies RaiderIoGuildLeaderboardEntry;
          }
        }),
      );

      leaderboard.push(...chunkEntries);
    }

    return leaderboard.sort((a, b) => b.rioScore - a.rioScore);
  }

  private async getCharacterMplusSummary(
    realm: string,
    characterName: string,
  ): Promise<CachedMplusValue> {
    const realmSlug = this.toRealmSlug(realm);
    const key = `${realmSlug}:${characterName.trim().toLowerCase()}`;
    const now = Date.now();
    const cached = this.characterMplusCache.get(key);

    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<RaiderIoCharacterMplusResponse>(
          'https://raider.io/api/v1/characters/profile',
          {
            params: {
              region: 'eu',
              realm: realmSlug,
              name: characterName,
              fields: 'mythic_plus_scores_by_season:current,mythic_plus_best_runs',
            },
          },
        ),
      );

      const score =
        response.data.mythic_plus_scores_by_season?.[0]?.scores?.all ?? 0;
      const bestKeyLevel = this.getBestKeyLevel(response.data.mythic_plus_best_runs);
      const value: CachedMplusValue = { score, bestKeyLevel };

      this.characterMplusCache.set(key, {
        expiresAt: now + this.scoreCacheTtlMs,
        value,
      });

      return value;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 400) {
        const value: CachedMplusValue = { score: 0, bestKeyLevel: null };
        this.characterMplusCache.set(key, {
          expiresAt: now + this.scoreCacheTtlMs,
          value,
        });
        return value;
      }

      throw error;
    }
  }

  private getBestKeyLevel(
    bestRuns: RaiderIoCharacterMplusResponse['mythic_plus_best_runs'],
  ): number | null {
    if (!bestRuns || bestRuns.length === 0) {
      return null;
    }

    const levels = bestRuns
      .map((run) => run.mythic_level)
      .filter((level): level is number => typeof level === 'number');

    if (levels.length === 0) {
      return null;
    }

    return Math.max(...levels);
  }

  private toRealmSlug(realm: string): string {
    return realm.trim().toLowerCase().replace(/\s+/g, '-');
  }
}
