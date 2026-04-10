import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateSharedAccountDto {
  @ApiProperty({
    description: 'Active le mode compte partage pour separer les personnages par profil.',
  })
  @IsBoolean()
  isSharedAccount: boolean;
}
