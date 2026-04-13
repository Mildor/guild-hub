import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class BnetCallbackGuard extends AuthGuard('bnet') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  handleRequest<TUser = unknown>(
    err: unknown,
    user: unknown,
    info: unknown,
    context: ExecutionContext,
    status?: unknown,
  ): TUser {
    if (err || !user) {
      const request = context.switchToHttp().getRequest<Request>();
      const reason = this.extractReason(info, request);
      const identifier = this.extractIdentifier(request);

      void this.authService.logFailedLoginAttempt({
        provider: 'bnet',
        identifier,
        ipAddress: this.extractIpAddress(request),
        userAgent: request.get('user-agent') ?? undefined,
        reason,
        metadata: this.buildMetadata(request, info),
      });

      if (err instanceof Error) {
        throw err;
      }

      throw new UnauthorizedException(
        typeof status === 'string' && status.length > 0
          ? status
          : 'Connexion Battle.net echouee',
      );
    }

    return user as TUser;
  }

  private extractReason(info: unknown, request: Request): string {
    if (typeof info === 'string' && info.trim().length > 0) {
      return info;
    }

    if (
      typeof info === 'object' &&
      info !== null &&
      'message' in info &&
      typeof (info as { message?: unknown }).message === 'string'
    ) {
      return (info as { message: string }).message;
    }

    const errorQuery = request.query.error;
    if (typeof errorQuery === 'string' && errorQuery.length > 0) {
      return errorQuery;
    }

    return 'unknown_oauth_failure';
  }

  private extractIdentifier(request: Request): string | undefined {
    const battletag = request.query.battletag;
    if (typeof battletag === 'string' && battletag.trim().length > 0) {
      return battletag;
    }

    const account = request.query.account;
    if (typeof account === 'string' && account.trim().length > 0) {
      return account;
    }

    return undefined;
  }

  private extractIpAddress(request: Request): string | undefined {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      return forwardedFor.split(',')[0]?.trim();
    }

    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return forwardedFor[0];
    }

    return request.ip;
  }

  private buildMetadata(
    request: Request,
    info: unknown,
  ): Prisma.InputJsonValue {
    return {
      path: request.originalUrl,
      info:
        typeof info === 'string' || typeof info === 'number' || typeof info === 'boolean'
          ? info
          : undefined,
      query: request.query,
    };
  }
}
