import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStrategyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bossName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  raidName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  positioningImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  generalMechanics?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tankNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  healerNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dpsNotes?: string;
}
