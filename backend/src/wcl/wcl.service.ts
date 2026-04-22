import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

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
    // Refresh token if null or expiring in less than 5 minutes (300,000 ms)
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
      // expires_in is typically in seconds
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
          {
            query,
            variables,
          },
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

  async getRecentReports() {
    const query = `
      query { 
        reportData { 
          reports(guildID: 415881, limit: 50, zoneID: 46) { 
            data { code, startTime, title, zone { id } } 
          } 
        }
      }
    `;
    const data = await this.queryGraphQL(query);

    // Extraction des logs
    const guildReports = data.reportData?.reports?.data || [];

    // Deduplication par code WCL
    const uniqueReports: any[] = [];
    const seen = new Set<string>();
    for (const r of guildReports) {
      if (!seen.has(r.code)) {
        seen.add(r.code);
        uniqueReports.push(r);
      }
    }

    // Tri descendant par date pour s'assurer de bien lire les plus récents
    uniqueReports.sort((a: any, b: any) => b.startTime - a.startTime);

    // On conserve un maximum de 30 logs
    return uniqueReports.slice(0, 30);
  }

  async getReportDetails(code: string) {
    const query = `
      query { 
        reportData { 
          report(code: "${code}") { 
            fights(killType: Encounters) { 
              difficulty 
            }
            masterData { 
              actors(type: "Player") { 
                name, 
                server 
              } 
            } 
          } 
        } 
      }
    `;
    const data = await this.queryGraphQL(query);
    return data.reportData?.report || null;
  }
}
