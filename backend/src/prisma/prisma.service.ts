import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    
    // Seed default system modules if they do not exist
    const defaultModules = [
      { code: 'calendar', name: 'Calendrier' },
      { code: 'roster', name: 'Roster' },
      { code: 'guild-link', name: 'Classement & Progress' },
      { code: 'members', name: 'Membres' },
      { code: 'performances', name: 'Performances M+' },
      { code: 'vault', name: 'Great Vault' },
      { code: 'crafter-hub', name: 'Crafter Hub' },
      { code: 'polls', name: 'Sondages' },
      { code: 'strategies', name: 'Stratégies' }
    ];

    for (const m of defaultModules) {
      await this.systemModule.upsert({
        where: { code: m.code },
        update: {},
        create: {
          code: m.code,
          name: m.name,
          isActive: true,
        },
      });
    }
  }
}
