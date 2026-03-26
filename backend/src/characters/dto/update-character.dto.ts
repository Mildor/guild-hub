import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GameRole } from '@prisma/client';

export class UpdateCharacterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  ilvl?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  activeSpec?: string;

  @ApiPropertyOptional({ enum: GameRole })
  @IsOptional()
  @IsEnum(GameRole)
  gameRole?: GameRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}
