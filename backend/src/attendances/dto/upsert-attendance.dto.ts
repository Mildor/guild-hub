import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';

export class UpsertAttendanceDto {
  @ApiProperty()
  @IsUUID()
  eventId: string;

  @ApiPropertyOptional({
    description:
      'Utilisateur cible. Reserve aux roles ADMIN/OFFICER (sinon utilisateur authentifie).',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  characterId?: string;
}
