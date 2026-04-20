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
      const reason = this.extractReason(info, request, err);
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

  private extractReason(info: unknown, request: Request, err: unknown): string {
    const errorQuery = request.query.error;
    const errorDescriptionQuery = request.query.error_description;

    if (typeof errorQuery === 'string' && errorQuery.length > 0) {
      return this.mapOAuthError(errorQuery, errorDescriptionQuery);
    }

    if (typeof info === 'string' && info.trim().length > 0) {
      return `oauth_callback_info:${this.normalizeReasonMessage(info)}`;
    }

    if (
      typeof info === 'object' &&
      info !== null &&
      'message' in info &&
      typeof (info as { message?: unknown }).message === 'string'
    ) {
      return `oauth_callback_info:${this.normalizeReasonMessage(
        (info as { message: string }).message,
      )}`;
    }

    if (err instanceof Error) {
      if (
        typeof err.message === 'string' &&
        err.message.toLowerCase().includes('state')
      ) {
        return 'oauth_state_mismatch';
      }

      return `oauth_callback_error:${this.normalizeReasonMessage(`${err.name}: ${err.message}`)}`;
    }

    return 'oauth_callback_failed_without_error_context';
  }

  private mapOAuthError(
    errorCode: string,
    errorDescriptionQuery: unknown,
  ): string {
    const normalizedCode = errorCode.trim().toLowerCase();
    const normalizedDescription =
      typeof errorDescriptionQuery === 'string'
        ? this.normalizeReasonMessage(errorDescriptionQuery)
        : undefined;

    const knownCodes = new Set([
      'access_denied',
      'invalid_request',
      'unauthorized_client',
      'invalid_scope',
      'server_error',
      'temporarily_unavailable',
    ]);

    if (knownCodes.has(normalizedCode)) {
      return normalizedDescription
        ? `oauth_error_${normalizedCode}: ${normalizedDescription}`
        : `oauth_error_${normalizedCode}`;
    }

    return normalizedDescription
      ? `oauth_error_${normalizedCode}: ${normalizedDescription}`
      : `oauth_error_${normalizedCode}`;
  }

  private normalizeReasonMessage(message: string): string {
    return message.trim().replace(/\s+/g, ' ');
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
