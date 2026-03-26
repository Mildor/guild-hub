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

  async update(id: string, dto: UpdateCharacterDto) {
    await this.findOneOrFail(id);
    return this.prisma.character.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOneOrFail(id);
    return this.prisma.character.delete({ where: { id } });
  }

  async setMainCharacter(userId: string, characterId: string) {
    // Vérifier que le personnage existe et appartient à cet utilisateur
    const character = await this.prisma.character.findUnique({ where: { id: characterId } });
    if (!character || character.userId !== userId) {
      throw new NotFoundException(`Character #${characterId} not found or does not belong to user`);
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
