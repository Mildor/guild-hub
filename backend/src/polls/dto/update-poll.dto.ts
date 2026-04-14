import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsArray,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePollDto {
  @ApiPropertyOptional({ minLength: 5, maxLength: 250 })
  @IsOptional()
  @IsString()
  @Length(5, 250)
  question?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowMultipleSelections?: boolean;

  @ApiPropertyOptional({
    type: [String],
    minItems: 2,
    maxItems: 5,
    example: ['Mardi', 'Mercredi', 'Jeudi'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @Length(1, 120, { each: true })
  options?: string[];
}