import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VotePollDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  optionId: string;
}
