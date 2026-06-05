import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { ModulesController } from './modules.controller';
import { ModulesService } from './modules.service';
import { WclModule } from '../wcl/wcl.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [WclModule, PrismaModule],
  controllers: [AdminController, ModulesController],
  providers: [AdminService, ModulesService],
  exports: [AdminService, ModulesService],
})
export class AdminModule {}
