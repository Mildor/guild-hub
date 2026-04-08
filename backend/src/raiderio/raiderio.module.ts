import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { RaiderioController } from './raiderio.controller';
import { RaiderioService } from './raiderio.service';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [RaiderioController],
  providers: [RaiderioService],
  exports: [RaiderioService],
})
export class RaiderioModule {}
