import { Module } from '@nestjs/common';
import { GuildConfigService } from './guild-config.service';
import { GuildConfigController } from './guild-config.controller';

@Module({
  controllers: [GuildConfigController],
  providers: [GuildConfigService],
  exports: [GuildConfigService],
})
export class GuildConfigModule {}

