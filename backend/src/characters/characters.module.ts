import { Module } from '@nestjs/common';
import { CharactersService } from './characters.service';
import { CharactersController } from './characters.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BlizzardModule } from '../blizzard/blizzard.module';

@Module({
  imports: [PrismaModule, BlizzardModule],
  controllers: [CharactersController],
  providers: [CharactersService],
  exports: [CharactersService],
})
export class CharactersModule {}
