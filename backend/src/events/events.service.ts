import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  createEvent(userId: string, data: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        eventDate: new Date(data.eventDate),
        createdById: userId,
      },
    });
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
