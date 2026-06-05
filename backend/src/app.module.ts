import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { CharactersModule } from './characters/characters.module';
import { EventsModule } from './events/events.module';
import { AttendancesModule } from './attendances/attendances.module';
import { AuthModule } from './auth/auth.module';
import { BlizzardModule } from './blizzard/blizzard.module';
import { StrategiesModule } from './strategies/strategies.module';
import { DiscordModule } from './discord/discord.module';
import { PollsModule } from './polls/polls.module';
import { EncryptionModule } from './encryption/encryption.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RaiderioModule } from './raiderio/raiderio.module';
import { ProfessionsModule } from './professions/professions.module';
import { WclModule } from './wcl/wcl.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'guild-hub',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // Should be false in production
    }),
    // Redis cache disabled for development
    // TODO: Enable when Redis is available
    // CacheModule.registerAsync({...}),
    EncryptionModule,
    PrismaModule,
    UsersModule,
    CharactersModule,
    EventsModule,
    AttendancesModule,
    AuthModule,
    BlizzardModule,
    StrategiesModule,
    DiscordModule,
    PollsModule,
    RaiderioModule,
    ProfessionsModule,
    WclModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
