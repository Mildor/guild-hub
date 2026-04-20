import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SelectedCharacterDto {
  @IsString()
  name: string;

  @IsString()
  realm: string;
}

export class ImportSelectedCharactersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SelectedCharacterDto)
  characters: SelectedCharacterDto[];
}
