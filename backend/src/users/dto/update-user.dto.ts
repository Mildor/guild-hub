import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AppRole } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({ enum: AppRole })
  @IsOptional()
  @IsEnum(AppRole)
  appRole?: AppRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  discordId?: string;
}
