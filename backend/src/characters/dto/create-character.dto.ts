import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GameRole } from '@prisma/client';

export class CreateCharacterDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  realm: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  class: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  activeSpec: string;

  @ApiProperty({ enum: GameRole })
  @IsEnum(GameRole)
  gameRole: GameRole;
}
