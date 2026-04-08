import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { RaiderioController } from './raiderio.controller';
import { RaiderioGuildController } from './raiderio-guild.controller';
import { RaiderioService } from './raiderio.service';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [RaiderioController, RaiderioGuildController],
  providers: [RaiderioService],
  exports: [RaiderioService],
})
export class RaiderioModule {}
