import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BlizzardService } from './blizzard.service';
import { BlizzardController } from './blizzard.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [BlizzardController],
  providers: [BlizzardService],
  exports: [BlizzardService],
})
export class BlizzardModule {}
