import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus, SharedProfile } from '@prisma/client';

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

  @ApiPropertyOptional({
    enum: SharedProfile,
    description:
      'Profil cible. Utilise surtout par ADMIN/OFFICER pour un compte partage.',
  })
  @IsOptional()
  @IsEnum(SharedProfile)
  sharedProfile?: SharedProfile;
}
