import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertAttendanceDto } from './dto/upsert-attendance.dto';

@Injectable()
export class AttendancesService {
  constructor(private prisma: PrismaService) {}

  upsert(dto: UpsertAttendanceDto) {
    const { eventId, userId, status, characterId } = dto;
    return this.prisma.attendance.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, status, characterId },
      update: { status, characterId },
      include: {
        user: true,
        character: true,
      },
    });
  }
}
