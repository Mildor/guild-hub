import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { toZonedTime } from 'date-fns-tz';
import { getHours, subDays, getDay, format } from 'date-fns';

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
}
