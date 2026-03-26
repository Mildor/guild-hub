import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BlizzardService } from './blizzard.service';

@Module({
  imports: [HttpModule],
  providers: [BlizzardService],
  exports: [BlizzardService],
})
export class BlizzardModule {}
