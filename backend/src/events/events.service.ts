import { Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async createEvent(userId: string, data: CreateEventDto) {
    const parsedDate = new Date(data.eventDate);
    console.log('📅 createEvent - Received eventDate:', data.eventDate);
    console.log('📅 createEvent - Parsed to:', parsedDate);
    console.log('📅 createEvent - Server NOW:', new Date());
    console.log('📅 createEvent - Is future?', parsedDate > new Date());
    
    const event = await this.prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        eventDate: parsedDate,
        createdById: userId,
      },
    });
    
    console.log('✅ Event created:', event);

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

  async findUpcoming() {
    const now = new Date();
    console.log('🔍 findUpcoming - Server time NOW:', now);
    console.log('🔍 findUpcoming - Server timezone offset:', new Date().getTimezoneOffset());
    
    // TEMPORAIRE: Test avec findAll() au lieu de filter
    const events = await this.prisma.event.findMany({
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
    
    console.log('🔍 findUpcoming - All events found:', events.length);
    events.forEach(e => {
      console.log(`  - ${e.title} at ${e.eventDate} (diff from now: ${e.eventDate.getTime() - now.getTime()}ms)`);
    });
    
    return events;
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
