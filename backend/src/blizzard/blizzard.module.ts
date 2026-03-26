import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BlizzardService } from './blizzard.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  providers: [BlizzardService],
  exports: [BlizzardService],
})
export class BlizzardModule {}

