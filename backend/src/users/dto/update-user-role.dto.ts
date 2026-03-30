import { ApiProperty } from '@nestjs/swagger';
import { AppRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: AppRole })
  @IsEnum(AppRole)
  role: AppRole;
}
