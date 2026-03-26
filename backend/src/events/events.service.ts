import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        ...dto,
        eventDate: new Date(dto.eventDate),
      },
    });
  }

  findAll() {
    return this.prisma.event.findMany({
      where: { eventDate: { gte: new Date() } },
      orderBy: { eventDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
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
