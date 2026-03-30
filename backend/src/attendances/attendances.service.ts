import { Injectable } from '@nestjs/common';
import { AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertAttendanceDto } from './dto/upsert-attendance.dto';

@Injectable()
export class AttendancesService {
  constructor(private prisma: PrismaService) {}

  upsert(userId: string, dto: UpsertAttendanceDto) {
    const { eventId, status, characterId } = dto;
    const normalizedCharacterId =
      status === AttendanceStatus.DECLINED ? null : (characterId ?? null);

    return this.prisma.attendance.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, status, characterId: normalizedCharacterId },
      update: { status, characterId: normalizedCharacterId },
      include: {
        user: true,
        character: true,
      },
    });
  }
}
