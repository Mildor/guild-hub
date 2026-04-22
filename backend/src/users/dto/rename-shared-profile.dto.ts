import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class RenameSharedProfileDto {
  @ApiProperty({
    description: 'Nouveau nom du profil.',
    maxLength: 32,
  })
  @IsString()
  @MaxLength(32)
  name: string;
}
