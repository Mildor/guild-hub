import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SharedProfile, GameRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { SharedProfileAssignmentDto } from './dto/update-shared-profiles.dto';

@Injectable()
export class CharactersService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateCharacterDto) {
    return this.prisma.character.create({ data: dto });
  }

  async findByUserId(userId: string, sharedProfileHeader?: string) {
    const selectedProfile = await this.getSelectedSharedProfile(
      userId,
      sharedProfileHeader,
    );

    return this.prisma.character.findMany({
      where: {
        userId,
        ...(selectedProfile ? { sharedProfile: selectedProfile } : {}),
      },
      include: { wclPerformances: true },
    });
  }

  findByUserIdForSharedConfig(userId: string) {
    return this.prisma.character.findMany({ 
      where: { userId },
      include: { wclPerformances: true }
    });
  }

  async assignSharedProfiles(
    userId: string,
    assignments: SharedProfileAssignmentDto[],
  ) {
    const characterIds = assignments.map((entry) => entry.characterId);
    const uniqueCharacterIds = new Set(characterIds);

    if (uniqueCharacterIds.size !== characterIds.length) {
      throw new NotFoundException(
        'Chaque personnage ne peut etre assigne qu une seule fois par requete.',
      );
    }

    const ownedCharacters = await this.prisma.character.findMany({
      where: {
        id: { in: [...uniqueCharacterIds] },
        userId,
      },
      select: { id: true },
    });

    if (ownedCharacters.length !== uniqueCharacterIds.size) {
      throw new NotFoundException(
        'Un ou plusieurs personnages sont introuvables pour ce compte.',
      );
    }

    await this.prisma.$transaction(
      assignments.map((assignment) =>
        this.prisma.character.update({
          where: { id: assignment.characterId },
          data: { sharedProfile: assignment.sharedProfile ?? null },
        }),
      ),
    );

    return this.prisma.character.findMany({
      where: { userId },
      orderBy: [{ name: 'asc' }, { ilvl: 'desc' }],
    });
  }

  getRoster() {
    return this.prisma.character.findMany({
      where: { OR: [{ inRoster: true }, { inBench: true }] },
      include: { user: true, wclPerformances: true },
      orderBy: [{ inRoster: 'desc' }, { gameRole: 'asc' }, { ilvl: 'desc' }],
    });
  }

  getAllCharacters() {
    return this.prisma.character.findMany({
      include: { user: true, wclPerformances: true },
      orderBy: [{ name: 'asc' }, { ilvl: 'desc' }],
    });
  }

  private async checkRosterLimits(gameRole: GameRole) {
    const count = await this.prisma.character.count({
      where: { inRoster: true, gameRole },
    });

    if (gameRole === 'TANK' && count >= 2)
      throw new BadRequestException(
        'Le roster est complet pour le rôle Tank (Max 2).',
      );
    if (gameRole === 'HEALER' && count >= 4)
      throw new BadRequestException(
        'Le roster est complet pour le rôle Healer (Max 4).',
      );
    if (gameRole === 'DPS' && count >= 14)
      throw new BadRequestException(
        'Le roster est complet pour le rôle DPS (Max 14).',
      );
  }

  async toggleRosterStatus(id: string, inRoster: boolean) {
    const character = await this.findOneOrFail(id);

    if (!inRoster) {
      return this.prisma.character.update({
        where: { id },
        data: { inRoster: false, statusReason: null },
        include: { user: true },
      });
    }

    await this.checkRosterLimits(character.gameRole);

    const user = await this.prisma.user.findUnique({
      where: { id: character.userId },
      select: { isSharedAccount: true },
    });

    const [, updatedCharacter] = await this.prisma.$transaction([
      this.prisma.character.updateMany({
        where: {
          userId: character.userId,
          ...(user?.isSharedAccount
            ? { sharedProfile: character.sharedProfile }
            : {}),
          OR: [{ inRoster: true }, { inBench: true }],
          id: { not: id },
        },
        data: { inRoster: false, inBench: false, statusReason: null },
      }),
      this.prisma.character.update({
        where: { id },
        data: { inRoster: true, inBench: false, statusReason: null },
        include: { user: true },
      }),
    ]);

    return updatedCharacter;
  }

  async toggleBenchStatus(id: string, inBench: boolean) {
    const character = await this.findOneOrFail(id);

    if (!inBench) {
      return this.prisma.character.update({
        where: { id },
        data: { inBench: false, statusReason: null },
        include: { user: true },
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: character.userId },
      select: { isSharedAccount: true },
    });

    const [, updatedCharacter] = await this.prisma.$transaction([
      this.prisma.character.updateMany({
        where: {
          userId: character.userId,
          ...(user?.isSharedAccount
            ? { sharedProfile: character.sharedProfile }
            : {}),
          OR: [{ inRoster: true }, { inBench: true }],
          id: { not: id },
        },
        data: { inRoster: false, inBench: false, statusReason: null },
      }),
      this.prisma.character.update({
        where: { id },
        data: { inRoster: false, inBench: true, statusReason: null },
        include: { user: true },
      }),
    ]);

    return updatedCharacter;
  }

  async update(id: string, dto: UpdateCharacterDto) {
    await this.findOneOrFail(id);
    return this.prisma.character.update({ where: { id }, data: dto });
  }

  async setRosterCharacter(
    userId: string,
    characterId: string,
    sharedProfileHeader?: string,
  ) {
    const selectedProfile = await this.getSelectedSharedProfile(
      userId,
      sharedProfileHeader,
    );

    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });

    if (
      !character ||
      character.userId !== userId ||
      (selectedProfile !== null && character.sharedProfile !== selectedProfile)
    ) {
      throw new NotFoundException(
        `Character #${characterId} not found or does not belong to user`,
      );
    }

    await this.checkRosterLimits(character.gameRole);

    const [, updatedCharacter] = await this.prisma.$transaction([
      this.prisma.character.updateMany({
        where: {
          userId,
          ...(selectedProfile !== undefined
            ? { sharedProfile: selectedProfile }
            : {}),
        },
        data: { inRoster: false, inBench: false, statusReason: null },
      }),
      this.prisma.character.update({
        where: { id: characterId },
        data: { inRoster: true, inBench: false, statusReason: null },
        include: { user: true },
      }),
    ]);

    return updatedCharacter;
  }

  async setBenchCharacter(
    userId: string,
    characterId: string,
    sharedProfileHeader?: string,
    reason?: string,
  ) {
    const selectedProfile = await this.getSelectedSharedProfile(
      userId,
      sharedProfileHeader,
    );

    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });

    if (
      !character ||
      character.userId !== userId ||
      (selectedProfile !== null && character.sharedProfile !== selectedProfile)
    ) {
      throw new NotFoundException(
        `Character #${characterId} not found or does not belong to user`,
      );
    }

    const [, updatedCharacter] = await this.prisma.$transaction([
      this.prisma.character.updateMany({
        where: {
          userId,
          ...(selectedProfile !== undefined
            ? { sharedProfile: selectedProfile }
            : {}),
        },
        data: { inRoster: false, inBench: false, statusReason: null },
      }),
      this.prisma.character.update({
        where: { id: characterId },
        data: { inRoster: false, inBench: true, statusReason: reason || null },
        include: { user: true },
      }),
    ]);

    return updatedCharacter;
  }

  async leaveRoster(
    userId: string,
    characterId: string,
    sharedProfileHeader?: string,
    reason?: string,
  ) {
    const selectedProfile = await this.getSelectedSharedProfile(
      userId,
      sharedProfileHeader,
    );

    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });

    if (
      !character ||
      character.userId !== userId ||
      (selectedProfile !== null && character.sharedProfile !== selectedProfile)
    ) {
      throw new NotFoundException(
        `Character #${characterId} not found or does not belong to user`,
      );
    }

    const [, updatedCharacter] = await this.prisma.$transaction([
      this.prisma.character.updateMany({
        where: {
          userId,
          ...(selectedProfile !== undefined
            ? { sharedProfile: selectedProfile }
            : {}),
        },
        data: { inRoster: false, inBench: false, statusReason: null },
      }),
      this.prisma.character.update({
        where: { id: characterId },
        data: { inRoster: false, inBench: false, statusReason: reason || null },
        include: { user: true },
      }),
    ]);

    return updatedCharacter;
  }

  async remove(id: string) {
    await this.findOneOrFail(id);
    return this.prisma.character.delete({ where: { id } });
  }

  async findOneById(id: string) {
    return this.findOneOrFail(id);
  }

  async setMainCharacter(
    userId: string,
    characterId: string,
    sharedProfileHeader?: string,
  ) {
    const selectedProfile = await this.getSelectedSharedProfile(
      userId,
      sharedProfileHeader,
    );

    // Vérifier que le personnage existe et appartient à cet utilisateur
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });
    if (
      !character ||
      character.userId !== userId ||
      (selectedProfile !== null && character.sharedProfile !== selectedProfile)
    ) {
      throw new NotFoundException(
        `Character #${characterId} not found or does not belong to user`,
      );
    }

    // Transaction: désactiver tous les isMain pour cet user, puis activer celui-ci
    return this.prisma.$transaction([
      // 1) Mettre isMain: false pour TOUS les personnages de cet userId
      this.prisma.character.updateMany({
        where: {
          userId,
          ...(selectedProfile ? { sharedProfile: selectedProfile } : {}),
        },
        data: { isMain: false },
      }),
      // 2) Mettre isMain: true pour le characterId ciblé
      this.prisma.character.update({
        where: { id: characterId },
        data: { isMain: true },
      }),
    ]);
  }

  private async findOneOrFail(id: string) {
    const character = await this.prisma.character.findUnique({ 
      where: { id },
      include: { wclPerformances: true }
    });
    if (!character) throw new NotFoundException(`Character #${id} not found`);
    return character;
  }

  private async getSelectedSharedProfile(
    userId: string,
    sharedProfileHeader?: string,
  ): Promise<SharedProfile | null> {
    const [user, sharedProfiles] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { isSharedAccount: true },
      }),
      this.prisma.userSharedProfile.findMany({
        where: { userId },
        select: { code: true },
      }),
    ]);

    const profile = this.parseSharedProfile(sharedProfileHeader);

    if (!user?.isSharedAccount) {
      return null;
    }

    if (!profile) {
      throw new BadRequestException(
        'Profil partage invalide ou manquant. Selectionnez un profil configure.',
      );
    }

    const allowedProfiles = new Set(sharedProfiles.map((entry) => entry.code));

    if (!allowedProfiles.has(profile)) {
      throw new BadRequestException(
        'Le profil partage selectionne nest pas configure pour ce compte.',
      );
    }

    return profile;
  }

  private parseSharedProfile(value?: string): SharedProfile | null {
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

    return null;
  }
}
