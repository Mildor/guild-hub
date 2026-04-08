import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

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

  async deleteMyAccount(userId: string) {
    await this.findOne(userId);

    await this.prisma.user.delete({ where: { id: userId } });

    return {
      message:
        'Votre compte et les donnees associees ont ete supprimes definitivement.',
    };
  }
}
