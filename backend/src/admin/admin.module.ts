import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { WclModule } from '../wcl/wcl.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [WclModule, PrismaModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
