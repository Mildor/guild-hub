import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum Theme {
  DARK = 'dark',
  LIGHT = 'light',
  HORDE = 'horde',
  ALLIANCE = 'alliance',
}

export class UpdatePreferencesDto {
  @ApiProperty({
    description: 'Thème de l’application choisi par l’utilisateur',
    enum: Theme,
    example: Theme.DARK,
  })
  @IsEnum(Theme, {
    message: 'Le thème doit être l’une des valeurs suivantes : dark, light, horde, alliance',
  })
  theme: Theme;
}
