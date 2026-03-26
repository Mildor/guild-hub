import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-bnet';
import { AuthService } from '../auth.service';

@Injectable()
export class BnetStrategy extends PassportStrategy(Strategy, 'bnet') {
  constructor(
    private readonly authService: AuthService,
    config: ConfigService,
  ) {
    super({
      clientID: config.get<string>('BNET_CLIENT_ID'),
      clientSecret: config.get<string>('BNET_CLIENT_SECRET'),
      region: config.get<string>('BNET_REGION'),
      callbackURL: config.get<string>('BNET_CALLBACK_URL'),
      scope: 'wow.profile',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: { id: number; battletag: string },
    done: (err: Error | null, user?: unknown) => void,
  ): Promise<void> {
    const user = await this.authService.validateOAuthLogin(
      profile.id,
      profile.battletag,
      accessToken,
    );
    done(null, user);
  }
}
