import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';

@Injectable()
export class CharactersService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateCharacterDto) {
    return this.prisma.character.create({ data: dto });
  }

  findByUserId(userId: string) {
    return this.prisma.character.findMany({ where: { userId } });
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

  async setRosterCharacter(userId: string, characterId: string) {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character || character.userId !== userId) {
      throw new NotFoundException(
        `Character #${characterId} not found or does not belong to user`,
      );
    }

    const [, updatedCharacter] = await this.prisma.$transaction([
      this.prisma.character.updateMany({
        where: { userId },
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

  async setMainCharacter(userId: string, characterId: string) {
    // Vérifier que le personnage existe et appartient à cet utilisateur
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });
    if (!character || character.userId !== userId) {
      throw new NotFoundException(
        `Character #${characterId} not found or does not belong to user`,
      );
    }

    // Transaction: désactiver tous les isMain pour cet user, puis activer celui-ci
    return this.prisma.$transaction([
      // 1) Mettre isMain: false pour TOUS les personnages de cet userId
      this.prisma.character.updateMany({
        where: { userId },
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
}
