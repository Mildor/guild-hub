import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceStatus, SharedProfile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertAttendanceDto } from './dto/upsert-attendance.dto';

@Injectable()
export class AttendancesService {
  constructor(private prisma: PrismaService) {}

  async upsert(
    userId: string,
    dto: UpsertAttendanceDto,
    sharedProfileHeader?: string,
  ) {
    const { eventId, status, characterId } = dto;
    const { profile, isSharedAccount } = await this.resolveSharedProfileForAttendance(
      userId,
      dto.sharedProfile,
      sharedProfileHeader,
    );

    const normalizedCharacterId =
      status === AttendanceStatus.DECLINED ? null : (characterId ?? null);

    if (normalizedCharacterId) {
      const character = await this.prisma.character.findUnique({
        where: { id: normalizedCharacterId },
        select: {
          id: true,
          userId: true,
          sharedProfile: true,
        },
      });

      if (!character || character.userId !== userId) {
        throw new NotFoundException('Personnage introuvable pour ce compte.');
      }

      if (isSharedAccount && character.sharedProfile !== profile) {
        throw new BadRequestException(
          'Le personnage selectionne n appartient pas au profil actif.',
        );
      }
    }

    return this.prisma.attendance.upsert({
      where: {
        eventId_userId_sharedProfile: {
          eventId,
          userId,
          sharedProfile: profile,
        },
      },
      create: {
        eventId,
        userId,
        sharedProfile: profile,
        status,
        characterId: normalizedCharacterId,
      },
      update: { status, characterId: normalizedCharacterId },
      include: {
        user: true,
        character: true,
      },
    });
  }

  private async resolveSharedProfileForAttendance(
    userId: string,
    bodyProfile?: SharedProfile,
    headerProfile?: string,
  ): Promise<{ profile: SharedProfile; isSharedAccount: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSharedAccount: true },
    });

    if (!user) {
      throw new NotFoundException(`User #${userId} not found`);
    }

    if (!user.isSharedAccount) {
      return { profile: SharedProfile.A, isSharedAccount: false };
    }

    const requestedProfile =
      bodyProfile ?? this.parseSharedProfileFromHeader(headerProfile);

    if (!requestedProfile) {
      throw new BadRequestException(
        'Profil partage invalide ou manquant pour ce compte.',
      );
    }

    const profileExists = await this.prisma.userSharedProfile.findUnique({
      where: {
        userId_code: {
          userId,
          code: requestedProfile,
        },
      },
      select: { code: true },
    });

    if (!profileExists) {
      throw new BadRequestException(
        'Le profil partage selectionne nest pas configure pour cet utilisateur.',
      );
    }

    return { profile: requestedProfile, isSharedAccount: true };
  }

  private parseSharedProfileFromHeader(
    value?: string,
  ): SharedProfile | undefined {
    const normalized = value?.trim().toUpperCase();

    if (normalized === SharedProfile.A) {
      return SharedProfile.A;
    }

    if (normalized === SharedProfile.B) {
      return SharedProfile.B;
    }

    if (normalized === SharedProfile.C) {
      return SharedProfile.C;
    }

    if (normalized === SharedProfile.D) {
      return SharedProfile.D;
    }

    if (normalized === SharedProfile.E) {
      return SharedProfile.E;
    }

    return undefined;
  }
}
