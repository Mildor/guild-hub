import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsString,
  ValidateNested,
} from 'class-validator';

export class OnboardingCharacterSelectionDto {
  @IsString()
  name: string;

  @IsString()
  realm: string;
}

export class ConfirmOnboardingDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OnboardingCharacterSelectionDto)
  characters: OnboardingCharacterSelectionDto[];
}
