import { ApiProperty } from '@nestjs/swagger';
import { SharedProfile } from '@prisma/client';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SharedProfileAssignmentDto {
  @ApiProperty()
  @IsUUID()
  characterId: string;

  @ApiProperty({ enum: SharedProfile, required: false, nullable: true })
  @IsOptional()
  @IsEnum(SharedProfile)
  sharedProfile?: SharedProfile | null;
}

export class UpdateSharedProfilesDto {
  @ApiProperty({ type: [SharedProfileAssignmentDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SharedProfileAssignmentDto)
  assignments: SharedProfileAssignmentDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pin?: string;
}
