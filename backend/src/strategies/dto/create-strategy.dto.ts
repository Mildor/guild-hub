import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStrategyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bossName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  raidName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  positioningImageUrl?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  generalMechanics: string;

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
