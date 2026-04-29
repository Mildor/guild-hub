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
  mythic_plus_weekly_highest_level_runs?: Array<{
    dungeon?: string;
    short_name?: string;
    mythic_level?: number;
    url?: string;
  }>;
  raid_progression?: Record<string, { summary: string }>;
  raid_weekly_progress?: {
    raidSlug: string;
    summary: string;
    killedBosses: number;
    totalBosses: number;
  };
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

export interface RaiderIoGuildUnlinkedMember {
  name: string;
  realm: string;
  class: string | null;
  guildRank: number | null;
}

interface RaiderIoGuildMembersResponse {
  members?: Array<{
    rank?: number;
    character?: {
      name?: string;
      class?: string;
      realm?: {
        name?: string;
      };
    };
  }>;
}

type CachedMplusValue = {
  score: number;
  bestKeyLevel: number | null;
};

type CachedMplusEntry = {
  expiresAt: number;
  value: CachedMplusValue;
};

const MIDNIGHT_RAID_PRIORITY_SLUGS = [
  'manaforge-omega',
  'eco-dome-aldani',
  'liberation-of-undermine',
  'nerubar-palace',
];

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
              fields:
                'mythic_plus_scores_by_season:current,mythic_plus_weekly_highest_level_runs,raid_progression',
            },
          },
        ),
      );

      const raidWeeklyProgress = this.getRaidWeeklyProgress(
        response.data.raid_progression,
      );

      return {
        ...response.data,
        raid_weekly_progress: raidWeeklyProgress,
      };
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

  async getGuildUnlinkedMembers(
    realm: string,
    name: string,
  ): Promise<RaiderIoGuildUnlinkedMember[]> {
    const realmSlug = this.toRealmSlug(realm);

    let membersResponse: RaiderIoGuildMembersResponse;
    try {
      const response = await firstValueFrom(
        this.httpService.get<RaiderIoGuildMembersResponse>(
          'https://raider.io/api/v1/guilds/profile',
          {
            params: {
              region: 'eu',
              realm: realmSlug,
              name,
              fields: 'members',
            },
          },
        ),
      );
      membersResponse = response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 400) {
        this.logger.warn(
          `Raider.IO guilde introuvable pour ${name}-${realmSlug}`,
        );
        return [];
      }

      this.logger.error(
        `Erreur Raider.IO membres guilde pour ${name}-${realmSlug}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new BadGatewayException(
        'Impossible de recuperer la liste des membres de guilde Raider.IO',
      );
    }

    const members = membersResponse.members ?? [];
    if (members.length === 0) {
      return [];
    }

    const linkedCharacters = await this.prisma.character.findMany({
      select: {
        name: true,
        realm: true,
      },
    });

    const linkedCharacterKeys = new Set(
      linkedCharacters.map((character) =>
        this.toCharacterKey(character.name, character.realm),
      ),
    );

    const unlinkedMembers: RaiderIoGuildUnlinkedMember[] = [];
    for (const member of members) {
      const memberName = member.character?.name?.trim();
      const memberRealm = member.character?.realm?.name?.trim() || realm;

      if (!memberName) {
        continue;
      }

      const characterKey = this.toCharacterKey(memberName, memberRealm);
      if (linkedCharacterKeys.has(characterKey)) {
        continue;
      }

      unlinkedMembers.push({
        name: memberName,
        realm: memberRealm,
        class: member.character?.class ?? null,
        guildRank: member.rank ?? null,
      });
    }

    return unlinkedMembers.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
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
              fields:
                'mythic_plus_scores_by_season:current,mythic_plus_best_runs',
            },
          },
        ),
      );

      const score =
        response.data.mythic_plus_scores_by_season?.[0]?.scores?.all ?? 0;
      const bestKeyLevel = this.getBestKeyLevel(
        response.data.mythic_plus_best_runs,
      );
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

  private getRaidWeeklyProgress(
    raidProgression?: Record<string, { summary: string }>,
  ): RaiderIoProfile['raid_weekly_progress'] {
    if (!raidProgression) {
      return undefined;
    }

    for (const slug of MIDNIGHT_RAID_PRIORITY_SLUGS) {
      const summary = raidProgression[slug]?.summary;
      if (!summary) {
        continue;
      }

      const parsed = this.parseSummaryKills(summary);
      if (!parsed) {
        continue;
      }

      return {
        raidSlug: slug,
        summary,
        killedBosses: parsed.killedBosses,
        totalBosses: parsed.totalBosses,
      };
    }

    const firstEntry = Object.entries(raidProgression).find(
      ([, value]) => !!value?.summary,
    );
    if (!firstEntry) {
      return undefined;
    }

    const [raidSlug, raidData] = firstEntry;
    const parsed = this.parseSummaryKills(raidData.summary);

    if (!parsed) {
      return undefined;
    }

    return {
      raidSlug,
      summary: raidData.summary,
      killedBosses: parsed.killedBosses,
      totalBosses: parsed.totalBosses,
    };
  }

  private parseSummaryKills(
    summary: string,
  ): { killedBosses: number; totalBosses: number } | null {
    const match = summary.match(/(\d+)\s*\/\s*(\d+)/);
    if (!match) {
      return null;
    }

    const killedBosses = Number(match[1]);
    const totalBosses = Number(match[2]);

    if (!Number.isFinite(killedBosses) || !Number.isFinite(totalBosses)) {
      return null;
    }

    return { killedBosses, totalBosses };
  }

  private toRealmSlug(realm: string): string {
    return realm.trim().toLowerCase().replace(/\s+/g, '-');
  }

  private toCharacterKey(name: string, realm: string): string {
    return `${this.normalize(name)}:${this.normalize(realm)}`;
  }

  private normalize(value: string): string {
    return value
      .trim()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '-');
  }
}
