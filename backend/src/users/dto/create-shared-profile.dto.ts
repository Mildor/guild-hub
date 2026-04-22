import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSharedProfileDto {
  @ApiProperty({
    required: false,
    description: 'Nom du profil. Si vide, un nom par defaut sera applique.',
    maxLength: 32,
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  name?: string;
}
