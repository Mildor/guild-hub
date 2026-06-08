import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WclService } from './wcl/wcl.service';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const wclService = app.get(WclService);
  const prisma = app.get(PrismaService);

  const character = await prisma.character.findFirst({
    where: {
      name: {
        contains: 'Hild',
        mode: 'insensitive'
      }
    }
  });

  if (!character) {
    console.error('Character not found');
    await app.close();
    return;
  }

  const region = 'EU';
  const serverSlug = character.realm.toLowerCase().replace(/['\s]/g, '-');
  const name = character.name;

  const query = `
    query {
      characterData {
        character(name: "${name}", serverSlug: "${serverSlug}", serverRegion: "${region}") {
          e10658: encounterRankings(encounterID: 10658, metric: dps, byBracket: true)
        }
      }
    }
  `;

  try {
    const res = await wclService.queryGraphQL(query);
    const ranks = res.characterData?.character?.e10658?.ranks || [];
    console.log('Filtered raw rankings (bracket 11 and 12):');
    console.log(JSON.stringify(ranks.filter((r: any) => r.bracketData === 11 || r.bracketData === 12), null, 2));
  } catch (e) {
    console.error('Failed to query raw rankings:', e);
  }

  await app.close();
}
bootstrap();
