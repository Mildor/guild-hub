import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class StatusReasonDto {
  @ApiPropertyOptional({ description: 'Motif du changement de statut' })
  @IsOptional()
  @IsString()
  reason?: string;
}
