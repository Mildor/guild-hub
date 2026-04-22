import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WclService } from './wcl.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [WclService],
  exports: [WclService],
})
export class WclModule {}
