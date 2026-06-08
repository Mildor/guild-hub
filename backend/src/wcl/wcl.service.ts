import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { toZonedTime } from 'date-fns-tz';
import { getHours, subDays, getDay, format } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

export interface RaidNight {
  logicalDate: string;
  reports: any[];
}

@Injectable()
export class WclService {
  private readonly logger = new Logger(WclService.name);
  private wclToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async getAuthToken(): Promise<string> {
    const now = Date.now();
    if (this.wclToken && this.tokenExpiry && now < this.tokenExpiry - 300000) {
      return this.wclToken;
    }

    const clientId = this.configService.get<string>('WCL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('WCL_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new HttpException(
        'WCL credentials are not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://www.warcraftlogs.com/oauth/token',
          'grant_type=client_credentials',
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      this.wclToken = response.data.access_token;
      this.tokenExpiry = now + response.data.expires_in * 1000;
      this.logger.log('Successfully retrieved WCL access token');
      return this.wclToken as string;
    } catch (error) {
      this.logger.error(
        'Failed to get WCL token',
        error.response?.data || error.message,
      );
      throw new HttpException(
        'Failed to authenticate with Warcraft Logs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async queryGraphQL(query: string, variables: any = {}): Promise<any> {
    const token = await this.getAuthToken();
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://www.warcraftlogs.com/api/v2/client',
          { query, variables },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      if (response.data.errors) {
        this.logger.error('WCL GraphQL Error', response.data.errors);
        throw new HttpException(
          'WCL GraphQL query returned errors',
          HttpStatus.BAD_REQUEST,
        );
      }
      return response.data.data;
    } catch (error) {
      this.logger.error(
        'Failed to execute WCL GraphQL query',
        error.response?.data || error.message,
      );
      const responseData = error.response?.data;
      if (
        error.response?.status === 429 ||
        responseData?.status === 429 ||
        error.status === 429
      ) {
        const nextHour = new Date();
        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
        const zoned = toZonedTime(nextHour, 'Europe/Paris');
        const timeString = `${String(zoned.getHours()).padStart(2, '0')}:00`;
        throw new HttpException(
          `Limite de requêtes Warcraft Logs atteinte. Veuillez patienter et réessayer après ${timeString}.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new HttpException(
        'Failed to fetch data from Warcraft Logs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  getLogicalRaidDate(timestamp: number): string {
    const zonedTime = toZonedTime(timestamp, 'Europe/Paris');
    let logicalDate = zonedTime;
    const hour = getHours(zonedTime);

    // Règle d'or de minuit: Si l'heure est comprise entre 00h00 et 04h00 du matin, on soustrait 1 jour
    if (hour >= 0 && hour < 4) {
      logicalDate = subDays(zonedTime, 1);
    }

    return format(logicalDate, 'yyyy-MM-dd');
  }

  async getReports(): Promise<RaidNight[]> {
    const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;

    let page = 1;
    let lastPage = 1;
    const apiReports: any[] = [];

    do {
      const query = `
        query { 
          reportData { 
            reports(guildID: 415881, limit: 100, page: ${page}, startTime: ${sixtyDaysAgo}) { 
              data { code, startTime, title, zone { id } } 
              last_page
            } 
          }
        }
      `;
      const data = await this.queryGraphQL(query).catch((e) => {
        this.logger.error('Failed getting WCL page ' + page, e);
        return null;
      });

      const res = data?.reportData?.reports;
      if (!res?.data || res.data.length === 0) break;

      apiReports.push(...res.data);
      lastPage = res.last_page || 1;
      page++;
    } while (page <= lastPage);

    // Deduplicate by code
    const uniqueReports: any[] = [];
    const seenCodes = new Set<string>();
    for (const r of apiReports) {
      if (!seenCodes.has(r.code)) {
        seenCodes.add(r.code);
        uniqueReports.push(r);
      }
    }

    const grouped = new Map<string, any[]>();
    for (const report of uniqueReports) {
      const logicalDateStamp = this.getLogicalRaidDate(report.startTime);

      const zonedTime = toZonedTime(report.startTime, 'Europe/Paris');
      let logicDateObj = zonedTime;
      const hour = getHours(zonedTime);
      if (hour >= 0 && hour < 4) {
        logicDateObj = subDays(zonedTime, 1);
      }
      const dayOfWeek = getDay(logicDateObj);

      // Lundi (1) ou Mercredi (3) uniquement
      if (dayOfWeek !== 1 && dayOfWeek !== 3) {
        continue;
      }

      if (!grouped.has(logicalDateStamp)) {
        grouped.set(logicalDateStamp, []);
      }
      grouped.get(logicalDateStamp)!.push(report);
    }

    const raidNights: RaidNight[] = [];
    for (const [date, reports] of grouped.entries()) {
      raidNights.push({ logicalDate: date, reports });
    }

    // Sort descending by date
    raidNights.sort((a, b) => b.logicalDate.localeCompare(a.logicalDate));

    return raidNights;
  }

  async getReportActors(code: string): Promise<string[]> {
    const query = `
      query { 
        reportData { 
          report(code: "${code}") { 
            masterData { 
              actors(type: "Player") { 
                name
              } 
            } 
          } 
        } 
      }
    `;
    const data = await this.queryGraphQL(query);
    const actors = data.reportData?.report?.masterData?.actors || [];
    return actors.map((a: any) => a.name);
  }

  async syncCharacterPerformances(characterId: string) {
    const character = await this.prisma.character.findUnique({ where: { id: characterId } });
    if (!character) throw new NotFoundException('Character not found');

    const region = 'EU';
    const serverSlug = character.realm.toLowerCase().replace(/['\s]/g, '-');
    const name = character.name;

    const dungeons = [112526, 12811, 12874, 12915, 10658, 361753, 61209, 12805];
    const raidEncounters = [3129, 3131, 3130, 3132, 3122, 3133, 3134, 3135, 3176, 3177, 3179, 3178, 3180, 3181, 3306, 3182, 3183];
    const raidDifficulties = [4, 5];

    const bestRankPerKey = new Map<string, { encounterId: number, keyLevel: number, rank: number, rankRegion?: number, url: string, amount: number, parsePercent?: number, ilvlParsePercent?: number }>();
    
    // To store runs that might be in the Top 100 on the leaderboard
    const potentialQueries = new Map<number, Set<number>>();
    const tempUrls = new Map<string, string>();

    let encounterQueries = '';
    for (const encounterId of dungeons) {
      encounterQueries += `e${encounterId}: encounterRankings(encounterID: ${encounterId}, metric: dps, byBracket: true)\n`;
    }

    let raidQueries = '';
    for (const encounterId of raidEncounters) {
      for (const difficulty of raidDifficulties) {
        raidQueries += `r${encounterId}_d${difficulty}_global: encounterRankings(encounterID: ${encounterId}, difficulty: ${difficulty}, metric: dps)\n`;
        raidQueries += `r${encounterId}_d${difficulty}_ilvl: encounterRankings(encounterID: ${encounterId}, difficulty: ${difficulty}, metric: dps, byBracket: true)\n`;
        if (character.gameRole === 'HEALER') {
          raidQueries += `r${encounterId}_d${difficulty}_hps_global: encounterRankings(encounterID: ${encounterId}, difficulty: ${difficulty}, metric: hps)\n`;
          raidQueries += `r${encounterId}_d${difficulty}_hps_ilvl: encounterRankings(encounterID: ${encounterId}, difficulty: ${difficulty}, metric: hps, byBracket: true)\n`;
        }
      }
    }

    const query = `
      query {
        characterData {
          character(name: "${name}", serverSlug: "${serverSlug}", serverRegion: "${region}") {
            ${encounterQueries}
            ${raidQueries}
          }
        }
      }
    `;

    const data = await this.queryGraphQL(query);

    const charData = data?.characterData?.character;
    if (!charData) {
      this.logger.warn(`No WCL data found for ${name}-${serverSlug}`);
      return [];
    }

    const WCL_CLASSES: Record<string, string> = {
      'Guerrier': 'Warrior', 'Paladin': 'Paladin', 'Chasseur': 'Hunter', 'Voleur': 'Rogue', 'Prêtre': 'Priest',
      'Chevalier de la mort': 'DeathKnight', 'Chaman': 'Shaman', 'Mage': 'Mage', 'Démoniste': 'Warlock',
      'Moine': 'Monk', 'Druide': 'Druid', 'Chasseur de démons': 'DemonHunter', 'Évocateur': 'Evoker',
    };
    
    const WCL_SPECS: Record<string, string> = {
      'Sang': 'Blood', 'Givre': 'Frost', 'Impie': 'Unholy', 'Dévastation': 'Havoc', 'Vengeance': 'Vengeance',
      'Équilibre': 'Balance', 'Farouche': 'Feral', 'Gardien': 'Guardian', 'Restauration': 'Restoration',
      'Préservation': 'Preservation', 'Augmentation': 'Augmentation', 'Maîtrise des bêtes': 'BeastMastery',
      'Précision': 'Marksmanship', 'Survie': 'Survival', 'Arcanes': 'Arcane', 'Feu': 'Fire',
      'Maître brasseur': 'Brewmaster', 'Tisse-brume': 'Mistweaver', 'Marche-vent': 'Windwalker',
      'Sacré': 'Holy', 'Protection': 'Protection', 'Vindicte': 'Retribution', 'Discipline': 'Discipline',
      'Ombre': 'Shadow', 'Assassinat': 'Assassination', 'Hors-la-loi': 'Outlaw', 'Finesse': 'Subtlety',
      'Élémentaire': 'Elemental', 'Amélioration': 'Enhancement', 'Affliction': 'Affliction',
      'Démonologie': 'Demonology', 'Destruction': 'Destruction', 'Armes': 'Arms', 'Fureur': 'Fury', 'Dévoreur': 'Devourer', 'Devourer': 'Devourer',
    };
    const engClass = character.class ? (WCL_CLASSES[character.class] || character.class) : '';
    const engSpec = character.activeSpecName ? (WCL_SPECS[character.activeSpecName] || character.activeSpecName) : '';

    const performances: any[] = [];
    const raidPerformances: any[] = [];

    // Process Dungeons
    for (const encounterId of dungeons) {
      const encounterResult = charData[`e${encounterId}`];
      const runs = encounterResult?.ranks;
      if (!runs || !Array.isArray(runs)) continue;

      for (const run of runs) {
        if (typeof run.bracketData !== 'number') continue;
        
        // WCL bracketData + 1 = keystone level (e.g. bracket 10 = key +11)
        const keyLevel = run.bracketData + 1;
        const bracket = run.bracketData;
        
        // Calculate the parse rank from percent and total parses
        if (typeof run.rankPercent === 'number' && typeof run.rankTotalParses === 'number') {
          const trueRank = Math.round((1 - run.rankPercent / 100) * run.rankTotalParses) + 1;

          // If the parse is in the Top 500, we'll query the actual leaderboard to get the exact rank
          if (trueRank <= 500) {
            if (!potentialQueries.has(encounterId)) potentialQueries.set(encounterId, new Set());
            potentialQueries.get(encounterId)!.add(bracket);
            
            let reportUrl = '';
            if (run.report && run.report.code) {
              reportUrl = `https://www.warcraftlogs.com/reports/${run.report.code}#fight=${run.report.fightID || 'last'}`;
            } else {
              reportUrl = `https://www.warcraftlogs.com/character/eu/${serverSlug}/${name.toLowerCase()}`;
            }
            tempUrls.set(`${encounterId}_${keyLevel}`, reportUrl);
          }
        }
      }
    }


    const raidPerfMap = new Map<string, any>();
    const getRaidKey = (encounterId: number, difficulty: number, metric: string, reportCode?: string, fightId?: number) => {
      if (!reportCode || typeof fightId !== 'number') return null;
      return `${reportCode}_${fightId}_${encounterId}_${difficulty}_${metric}`;
    };

    for (const encounterId of raidEncounters) {
      for (const difficulty of raidDifficulties) {
        const metrics = ['dps'];
        if (character.gameRole === 'HEALER') {
          metrics.push('hps');
        }

        for (const metric of metrics) {
          const suffix = metric === 'hps' ? '_hps' : '';
          const globalResult = charData[`r${encounterId}_d${difficulty}${suffix}_global`];
          const ilvlResult = charData[`r${encounterId}_d${difficulty}${suffix}_ilvl`];
          const globalRuns = globalResult?.ranks;
          const ilvlRuns = ilvlResult?.ranks;

          if (globalRuns && Array.isArray(globalRuns)) {
            for (const run of globalRuns) {
              const reportCode = run.report?.code;
              const fightId = run.report?.fightID ?? run.fightID;
              const key = getRaidKey(encounterId, difficulty, metric, reportCode, fightId);
              if (!key) continue;
              const reportUrl = reportCode
                ? `https://www.warcraftlogs.com/reports/${reportCode}#fight=${fightId || 'last'}`
                : `https://www.warcraftlogs.com/character/eu/${serverSlug}/${name.toLowerCase()}`;
              const reportStart = run.report?.startTime ?? run.startTime;
              const parsePercent = typeof run.rankPercent === 'number' ? run.rankPercent : 0;
              const amount = typeof run.amount === 'number' ? run.amount : 0;

              raidPerfMap.set(key, {
                characterId: character.id,
                encounterId,
                keyLevel: difficulty,
                bestRank: 0,
                rankRegion: null,
                amount,
                parsePercent,
                ilvlParsePercent: 0,
                reportUrl,
                reportCode,
                fightId,
                date: reportStart ? new Date(reportStart) : null,
                metric,
              });
            }
          }

          if (ilvlRuns && Array.isArray(ilvlRuns)) {
            for (const run of ilvlRuns) {
              const reportCode = run.report?.code;
              const fightId = run.report?.fightID ?? run.fightID;
              const key = getRaidKey(encounterId, difficulty, metric, reportCode, fightId);
              if (!key) continue;
              const ilvlParsePercent = typeof run.rankPercent === 'number' ? run.rankPercent : 0;
              const reportStart = run.report?.startTime ?? run.startTime;

              const existing = raidPerfMap.get(key);
              if (existing) {
                existing.ilvlParsePercent = ilvlParsePercent;
                if (!existing.date && reportStart) {
                  existing.date = new Date(reportStart);
                }
                raidPerfMap.set(key, existing);
              } else {
                const reportUrl = reportCode
                  ? `https://www.warcraftlogs.com/reports/${reportCode}#fight=${fightId || 'last'}`
                  : `https://www.warcraftlogs.com/character/eu/${serverSlug}/${name.toLowerCase()}`;
                raidPerfMap.set(key, {
                  characterId: character.id,
                  encounterId,
                  keyLevel: difficulty,
                  bestRank: 0,
                  rankRegion: null,
                  amount: typeof run.amount === 'number' ? run.amount : 0,
                  parsePercent: 0,
                  ilvlParsePercent,
                  reportUrl,
                  reportCode,
                  fightId,
                  date: reportStart ? new Date(reportStart) : null,
                  metric,
                });
              }
            }
          }
        }
      }
    }


    // Step 2: Fetch the exact leaderboard ranks for potential top parses
    if (potentialQueries.size > 0 && engClass && engSpec) {
      let leaderboardQueryBody = '';
      
      // Dungeon Leaderboards
      for (const [encId, brackets] of potentialQueries.entries()) {
        leaderboardQueryBody += `e${encId}: encounter(id: ${encId}) {\n`;
        for (const b of brackets) {
          leaderboardQueryBody += `b${b}_global: characterRankings(metric: dps, className: "${engClass}", specName: "${engSpec}", bracket: ${b})\n`;
          leaderboardQueryBody += `b${b}_eu: characterRankings(metric: dps, className: "${engClass}", specName: "${engSpec}", bracket: ${b}, serverRegion: "${region}")\n`;
        }
        leaderboardQueryBody += `}\n`;
      }
      
      const leaderboardQuery = `query { worldData { ${leaderboardQueryBody} } }`;
      
      const lbData = await this.queryGraphQL(leaderboardQuery).catch(err => {
        this.logger.error(`WCL Leaderboard query failed for ${name}`, err);
        return null;
      });
      
      if (lbData?.worldData) {
        // Parse Dungeon Leaderboard results
        for (const [encId, brackets] of potentialQueries.entries()) {
          const encData = lbData.worldData[`e${encId}`];
          if (!encData) continue;
          for (const b of brackets) {
            const ranksGlobal = encData[`b${b}_global`]?.rankings;
            const ranksEu = encData[`b${b}_eu`]?.rankings;
            
            let actualRankGlobal = -1;
            let actualRankEu = -1;
            let amount = 0;
            let reportUrlFromLeaderboard = '';

            if (ranksGlobal && Array.isArray(ranksGlobal)) {
              const idx = ranksGlobal.findIndex((r: any) => r.name.toLowerCase() === name.toLowerCase());
              if (idx !== -1) {
                actualRankGlobal = idx + 1;
                amount = ranksGlobal[idx].amount || 0;
                const rep = ranksGlobal[idx].report;
                if (rep && rep.code) {
                  reportUrlFromLeaderboard = `https://www.warcraftlogs.com/reports/${rep.code}#fight=${rep.fightID || 'last'}`;
                }
              }
            }
            if (ranksEu && Array.isArray(ranksEu)) {
              const idx = ranksEu.findIndex((r: any) => r.name.toLowerCase() === name.toLowerCase());
              if (idx !== -1) {
                actualRankEu = idx + 1;
                if (!amount) amount = ranksEu[idx].amount || 0;
                if (!reportUrlFromLeaderboard) {
                  const rep = ranksEu[idx].report;
                  if (rep && rep.code) {
                    reportUrlFromLeaderboard = `https://www.warcraftlogs.com/reports/${rep.code}#fight=${rep.fightID || 'last'}`;
                  }
                }
              }
            }

            if (actualRankGlobal > 0 || actualRankEu > 0) {
              const keyLevel = b + 1;
              const cacheKey = `${encId}_${keyLevel}`;
              const reportUrl = reportUrlFromLeaderboard || tempUrls.get(cacheKey) || '';
              
              const currentBest = bestRankPerKey.get(cacheKey);
              if (!currentBest || (actualRankGlobal > 0 && actualRankGlobal < currentBest.rank)) {
                bestRankPerKey.set(cacheKey, { 
                  encounterId: encId, 
                  keyLevel, 
                  rank: actualRankGlobal > 0 ? actualRankGlobal : (currentBest?.rank || 0), 
                  rankRegion: actualRankEu > 0 ? actualRankEu : undefined,
                  url: reportUrl,
                  amount
                });
              }
            }
          }
        }

      }
    }

    for (const [_, data] of bestRankPerKey.entries()) {
      performances.push({
        characterId: character.id,
        encounterId: data.encounterId,
        keyLevel: data.keyLevel,
        bestRank: data.rank,
        rankRegion: data.rankRegion,
        amount: data.amount,
        parsePercent: data.parsePercent,
        ilvlParsePercent: data.ilvlParsePercent,
        reportUrl: data.url,
        metric: 'dps',
      });
    }

    for (const [_, data] of raidPerfMap.entries()) {
      raidPerformances.push(data);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.wclPerformance.deleteMany({ where: { characterId: character.id } });
      const allPerformances = performances.concat(raidPerformances);
      if (allPerformances.length > 0) {
        await tx.wclPerformance.createMany({ data: allPerformances });
      }
      await tx.character.update({
        where: { id: character.id },
        data: { wclSynced: true }
      });
    });

    return this.prisma.wclPerformance.findMany({ where: { characterId: character.id } });
  }

  async syncMainCharactersPerformances() {
    const characters = await this.prisma.character.findMany({
      where: {
        OR: [
          { isMain: true },
          { wclSynced: true }
        ]
      }
    });
    let synced = 0;
    for (const char of characters) {
      try {
        await this.syncCharacterPerformances(char.id);
        synced++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        this.logger.error(`Failed to sync WCL for ${char.name}`, err);
      }
    }
    return { synced, total: characters.length };
  }
}
