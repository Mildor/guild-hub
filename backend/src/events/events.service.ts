import { Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async createEvent(userId: string, data: CreateEventDto) {
    const event = await this.prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        eventDate: new Date(data.eventDate),
        createdById: userId,
      },
    });

    if (data.autoInviteRoster) {
      const roster = await this.prisma.character.findMany({ where: { inRoster: true } });

      const uniqueByUser = new Map(roster.map((char) => [char.userId, char]));
      const attendancesToCreate = Array.from(uniqueByUser.values()).map((char) => ({
        eventId: event.id,
        userId: char.userId,
        characterId: char.id,
        status: AttendanceStatus.ACCEPTED,
      }));

      if (attendancesToCreate.length > 0) {
        await this.prisma.attendance.createMany({
          data: attendancesToCreate,
          skipDuplicates: true,
        });
      }
    }

    return event;
  }

  findUpcoming() {
    return this.prisma.event.findMany({
      where: {
        eventDate: {
          gte: new Date(),
        },
      },
      include: {
        createdBy: true,
        _count: {
          select: {
            attendances: true,
          },
        },
      },
      orderBy: { eventDate: 'asc' },
    });
  }

  findAll() {
    return this.prisma.event.findMany({
      include: {
        createdBy: true,
        _count: {
          select: {
            attendances: true,
          },
        },
      },
      orderBy: { eventDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        createdBy: true,
        attendances: {
          include: {
            user: true,
            character: true,
          },
        },
      },
    });
    if (!event) throw new NotFoundException(`Event #${id} not found`);
    return event;
  }

  async update(id: string, dto: UpdateEventDto) {
    await this.findOne(id);
    return this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.eventDate && { eventDate: new Date(dto.eventDate) }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.event.delete({ where: { id } });
  }
}
