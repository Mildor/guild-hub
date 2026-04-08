import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';

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
}
