import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';

interface FailedLoginAttemptInput {
  provider: string;
  identifier?: string;
  ipAddress?: string;
  userAgent?: string;
  reason: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async validateOAuthLogin(
    bnetId: number,
    battletag: string,
    bnetAccessToken: string,
  ): Promise<User> {
    const encryptedAccessToken = this.encryptionService.encrypt(bnetAccessToken);

    let user = await this.prisma.user.findUnique({ where: { bnetId } });

    if (!user) {
      user = await this.prisma.user.create({
        data: { bnetId, battletag, bnetAccessToken: encryptedAccessToken },
      });
    } else {
      user = await this.prisma.user.update({
        where: { bnetId },
        data: { bnetAccessToken: encryptedAccessToken },
      });
    }

    return user;
  }

  generateJwt(user: User): string {
    const payload = { sub: user.id, role: user.appRole };
    return this.jwtService.sign(payload);
  }

  async logFailedLoginAttempt(input: FailedLoginAttemptInput): Promise<void> {
    await this.prisma.failedLoginAttempt.create({
      data: {
        provider: input.provider,
        identifier: input.identifier,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        reason: input.reason,
        metadata: input.metadata,
      },
    });
  }

  async getFailedLoginAttempts(page = 1, limit = 50) {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeLimit =
      Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 200) : 50;
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      this.prisma.failedLoginAttempt.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.failedLoginAttempt.count(),
    ]);

    return {
      items,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }
}
