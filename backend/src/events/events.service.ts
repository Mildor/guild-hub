import { Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceStatus, SharedProfile } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { DiscordService } from '../discord/discord.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private discordService: DiscordService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sendEventReminders(): Promise<void> {
    const now = new Date();

    const oneDayLowerBound = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const oneDayAgoUpperBound = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const threeHoursLowerBound = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const threeHoursUpperBound = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    const oneDayReminders = await this.prisma.event.findMany({
      where: {
        eventDate: {
          gt: oneDayLowerBound,
          lte: oneDayAgoUpperBound,
        },
        reminderSent1Day: false,
      },
    });

    for (const event of oneDayReminders) {
      try {
        await this.discordService.sendEventReminder(event, 'ONE_DAY');
        await this.prisma.event.update({
          where: { id: event.id },
          data: { reminderSent1Day: true },
        });
      } catch (error) {
        console.error(
          `Failed to send 1-day reminder for event ${event.id}:`,
          error,
        );
      }
    }

    const threeHoursReminders = await this.prisma.event.findMany({
      where: {
        eventDate: {
          gt: threeHoursLowerBound,
          lte: threeHoursUpperBound,
        },
        reminderSent3Hours: false,
      },
    });

    for (const event of threeHoursReminders) {
      try {
        await this.discordService.sendEventReminder(event, 'THREE_HOURS');
        await this.prisma.event.update({
          where: { id: event.id },
          data: { reminderSent3Hours: true },
        });
      } catch (error) {
        console.error(
          `Failed to send 3-hours reminder for event ${event.id}:`,
          error,
        );
      }
    }
  }

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

      const uniqueByUserAndProfile = new Map(
        roster.map((char) => [
          `${char.userId}:${char.sharedProfile ?? SharedProfile.A}`,
          char,
        ]),
      );
      const attendancesToCreate = Array.from(uniqueByUserAndProfile.values()).map((char) => ({
        eventId: event.id,
        userId: char.userId,
        sharedProfile: char.sharedProfile ?? SharedProfile.A,
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

    const creator = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { battletag: true },
    });

    void this.discordService
      .announceNewEvent(event, creator)
      .catch((error: unknown) => {
        console.error('Failed to announce new event on Discord:', error);
      });

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
