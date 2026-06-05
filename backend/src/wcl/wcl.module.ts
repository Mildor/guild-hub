import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WclService } from './wcl.service';

import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [HttpModule, PrismaModule],
  providers: [WclService],
  exports: [WclService],
})
export class WclModule {}
