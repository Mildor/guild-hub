import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ModulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.systemModule.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async update(code: string, isActive: boolean) {
    const module = await this.prisma.systemModule.findUnique({
      where: { code },
    });

    if (!module) {
      throw new NotFoundException(`Module with code "${code}" not found`);
    }

    return this.prisma.systemModule.update({
      where: { code },
      data: { isActive },
    });
  }
}
