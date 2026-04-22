import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppRole, SharedProfile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

const SHARED_PROFILE_ORDER: SharedProfile[] = [
  SharedProfile.A,
  SharedProfile.B,
  SharedProfile.C,
  SharedProfile.D,
  SharedProfile.E,
];

const MAX_SHARED_PROFILES = 5;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        battletag: true,
        appRole: true,
        createdAt: true,
      },
    });
  }

  async updateUserRole(
    adminId: string,
    targetUserId: string,
    newRole: AppRole,
  ) {
    if (adminId === targetUserId && newRole !== AppRole.ADMIN) {
      throw new ForbiddenException(
        'Un admin ne peut pas se retirer ses propres droits.',
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException(`User #${targetUserId} not found`);
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { appRole: newRole },
      select: {
        id: true,
        battletag: true,
        appRole: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { characters: true },
    });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: dto });
  }

  async getMySharedAccountConfig(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isSharedAccount: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User #${userId} not found`);
    }

    if (user.isSharedAccount) {
      await this.ensureAtLeastOneSharedProfile(user.id);
    }

    const profiles = user.isSharedAccount
      ? await this.getOrderedSharedProfiles(user.id)
      : [];

    return {
      userId: user.id,
      isSharedAccount: user.isSharedAccount,
      profiles: profiles.map((profile) => ({
        code: profile.code,
        name: profile.name,
      })),
    };
  }

  async updateMySharedAccountConfig(userId: string, isSharedAccount: boolean) {
    const user = await this.findOne(userId);

    if (!isSharedAccount) {
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: user.id },
          data: { isSharedAccount: false },
          select: {
            id: true,
            isSharedAccount: true,
          },
        }),
        this.prisma.character.updateMany({
          where: { userId: user.id },
          data: { sharedProfile: null },
        }),
      ]);

      return {
        userId: user.id,
        isSharedAccount: false,
        profiles: [],
      };
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { isSharedAccount: true },
      select: {
        id: true,
        isSharedAccount: true,
      },
    });

    await this.ensureAtLeastOneSharedProfile(updated.id);
    const profiles = await this.getOrderedSharedProfiles(updated.id);

    return {
      userId: updated.id,
      isSharedAccount: updated.isSharedAccount,
      profiles: profiles.map((profile) => ({
        code: profile.code,
        name: profile.name,
      })),
    };
  }

  async createMySharedProfile(userId: string, name: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isSharedAccount: true },
    });

    if (!user) {
      throw new NotFoundException(`User #${userId} not found`);
    }

    if (!user.isSharedAccount) {
      throw new BadRequestException(
        'Le mode compte partage doit etre actif pour creer des profils.',
      );
    }

    const existingProfiles = await this.getOrderedSharedProfiles(user.id);
    if (existingProfiles.length >= MAX_SHARED_PROFILES) {
      throw new BadRequestException('Maximum 5 profils atteint.');
    }

    const usedCodes = new Set(existingProfiles.map((profile) => profile.code));
    const nextCode = SHARED_PROFILE_ORDER.find((code) => !usedCodes.has(code));

    if (!nextCode) {
      throw new BadRequestException('Aucun slot de profil disponible.');
    }

    const normalizedName = this.normalizeProfileName(name, nextCode);

    const created = await this.prisma.userSharedProfile.create({
      data: {
        userId: user.id,
        code: nextCode,
        name: normalizedName,
      },
      select: {
        code: true,
        name: true,
      },
    });

    return created;
  }

  async renameMySharedProfile(
    userId: string,
    code: SharedProfile,
    name: string,
  ) {
    const normalizedName = this.normalizeProfileName(name, code);

    try {
      return await this.prisma.userSharedProfile.update({
        where: {
          userId_code: {
            userId,
            code,
          },
        },
        data: {
          name: normalizedName,
        },
        select: {
          code: true,
          name: true,
        },
      });
    } catch {
      throw new NotFoundException(
        `Profil ${code} introuvable pour cet utilisateur.`,
      );
    }
  }

  async deleteMyAccount(userId: string) {
    await this.findOne(userId);

    await this.prisma.user.delete({ where: { id: userId } });

    return {
      message:
        'Votre compte et les donnees associees ont ete supprimes definitivement.',
    };
  }

  async deleteByAdmin(adminId: string, targetUserId: string) {
    if (adminId === targetUserId) {
      throw new ForbiddenException(
        'Utilisez la suppression de votre compte personnel pour cette operation.',
      );
    }

    await this.findOne(targetUserId);

    await this.prisma.user.delete({ where: { id: targetUserId } });

    return {
      message: 'Compte supprime avec succes par un administrateur.',
    };
  }

  private async ensureAtLeastOneSharedProfile(userId: string): Promise<void> {
    const count = await this.prisma.userSharedProfile.count({
      where: { userId },
    });

    if (count > 0) {
      return;
    }

    await this.prisma.userSharedProfile.create({
      data: {
        userId,
        code: SharedProfile.A,
        name: this.getDefaultProfileName(SharedProfile.A),
      },
    });
  }

  private async getOrderedSharedProfiles(userId: string) {
    const profiles = await this.prisma.userSharedProfile.findMany({
      where: { userId },
      select: {
        code: true,
        name: true,
      },
    });

    return profiles.sort(
      (left, right) =>
        SHARED_PROFILE_ORDER.indexOf(left.code) -
        SHARED_PROFILE_ORDER.indexOf(right.code),
    );
  }

  private normalizeProfileName(name: string, fallbackCode: SharedProfile): string {
    const normalized = name.trim();

    if (!normalized) {
      return this.getDefaultProfileName(fallbackCode);
    }

    if (normalized.length > 32) {
      throw new BadRequestException('Le nom du profil ne peut pas depasser 32 caracteres.');
    }

    return normalized;
  }

  private getDefaultProfileName(code: SharedProfile): string {
    return `Profil ${code}`;
  }
}
