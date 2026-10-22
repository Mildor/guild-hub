import { PartialType } from '@nestjs/swagger';
import { SetupGuildConfigDto } from './setup-guild-config.dto';

export class UpdateGuildConfigDto extends PartialType(SetupGuildConfigDto) {}

