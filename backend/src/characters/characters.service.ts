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

  private async findOneOrFail(id: string) {
    const character = await this.prisma.character.findUnique({ where: { id } });
    if (!character) throw new NotFoundException(`Character #${id} not found`);
    return character;
  }
}
