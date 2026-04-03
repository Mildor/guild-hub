import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
