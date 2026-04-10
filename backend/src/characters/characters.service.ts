import { Injectable, NotFoundException } from '@nestjs/common';
import { SharedProfile } from '@prisma/client';
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
    });
  }

  findByUserIdForSharedConfig(userId: string) {
    return this.prisma.character.findMany({ where: { userId } });
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
      where: { inRoster: true },
      include: { user: true },
      orderBy: [{ gameRole: 'asc' }, { ilvl: 'desc' }],
    });
  }

  getAllCharacters() {
    return this.prisma.character.findMany({
      include: { user: true },
      orderBy: [{ name: 'asc' }, { ilvl: 'desc' }],
    });
  }

  async toggleRosterStatus(id: string, inRoster: boolean) {
    const character = await this.findOneOrFail(id);

    if (!inRoster) {
      return this.prisma.character.update({
        where: { id },
        data: { inRoster: false },
        include: { user: true },
      });
    }

    const [, updatedCharacter] = await this.prisma.$transaction([
      this.prisma.character.updateMany({
        where: {
          userId: character.userId,
          inRoster: true,
          id: { not: id },
        },
        data: { inRoster: false },
      }),
      this.prisma.character.update({
        where: { id },
        data: { inRoster: true },
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

    const [, updatedCharacter] = await this.prisma.$transaction([
      this.prisma.character.updateMany({
        where: {
          userId,
          ...(selectedProfile ? { sharedProfile: selectedProfile } : {}),
        },
        data: { inRoster: false },
      }),
      this.prisma.character.update({
        where: { id: characterId },
        data: { inRoster: true },
        include: { user: true },
      }),
    ]);

    return updatedCharacter;
  }

  async remove(id: string) {
    await this.findOneOrFail(id);
    return this.prisma.character.delete({ where: { id } });
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
    const character = await this.prisma.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundException(`Character #${id} not found`);
    return character;
  }

  private async getSelectedSharedProfile(
    userId: string,
    sharedProfileHeader?: string,
  ): Promise<SharedProfile | null> {
    const profile = this.parseSharedProfile(sharedProfileHeader);

    if (!profile) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSharedAccount: true },
    });

    if (!user?.isSharedAccount) {
      return null;
    }

    return profile;
  }

  private parseSharedProfile(
    value?: string,
  ): SharedProfile | null {
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

    return null;
  }
}
