import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsIn,
} from 'class-validator';

export class SetupGuildConfigDto {
  // Identité de la guilde
  @ApiProperty({ description: 'Nom de la guilde', example: 'The Good Place' })
  @IsString()
  @IsNotEmpty()
  guildName: string;

  @ApiProperty({ description: 'Royaume World of Warcraft', example: 'Archimonde' })
  @IsString()
  @IsNotEmpty()
  realm: string;

  @ApiPropertyOptional({
    description: 'Slug du royaume pour les APIs (généré automatiquement si omis)',
    example: 'archimonde',
  })
  @IsOptional()
  @IsString()
  realmSlug?: string;

  @ApiPropertyOptional({
    description: 'Région WoW (eu, us, kr, tw)',
    default: 'eu',
    example: 'eu',
  })
  @IsOptional()
  @IsString()
  @IsIn(['eu', 'us', 'kr', 'tw'])
  region?: string;

  @ApiPropertyOptional({
    description: 'Faction principale de la guilde',
    example: 'Horde',
  })
  @IsOptional()
  @IsString()
  faction?: string;

  // Branding & Thème
  @ApiPropertyOptional({ description: 'URL du blason/logo de la guilde' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'URL de la bannière de la guilde' })
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @ApiPropertyOptional({
    description: 'Couleur primaire hexadécimale',
    default: '#10b981',
    example: '#10b981',
  })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({
    description: 'Thème par défaut (dark, light)',
    default: 'dark',
    example: 'dark',
  })
  @IsOptional()
  @IsString()
  theme?: string;

  // Landing page & Liens publics
  @ApiPropertyOptional({
    description: 'Titre d\'accueil de la landing page',
    example: 'Bienvenue chez The Good Place',
  })
  @IsOptional()
  @IsString()
  welcomeTitle?: string;

  @ApiPropertyOptional({
    description: 'Présentation de la guilde sur la landing page',
  })
  @IsOptional()
  @IsString()
  welcomeText?: string;

  @ApiPropertyOptional({
    description: 'Statut du recrutement (OPEN, CLOSED, SELECTIVE)',
    default: 'OPEN',
    example: 'OPEN',
  })
  @IsOptional()
  @IsString()
  recruitmentStatus?: string;

  @ApiPropertyOptional({
    description: 'Message ou besoins spécifiques de recrutement',
  })
  @IsOptional()
  @IsString()
  recruitmentMessage?: string;

  @ApiPropertyOptional({ description: 'Lien d\'invitation Discord public' })
  @IsOptional()
  @IsString()
  discordInviteUrl?: string;

  @ApiPropertyOptional({ description: 'Lien vers la guilde WarcraftLogs' })
  @IsOptional()
  @IsString()
  wclGuildUrl?: string;

  @ApiPropertyOptional({ description: 'Lien vers la guilde Raider.io' })
  @IsOptional()
  @IsString()
  raiderIoGuildUrl?: string;

  // Secrets et identifiants API (chiffrés au repos)
  @ApiPropertyOptional({ description: 'Client ID Battle.net Developer Portal' })
  @IsOptional()
  @IsString()
  bnetClientId?: string;

  @ApiPropertyOptional({ description: 'Client Secret Battle.net (sera chiffré)' })
  @IsOptional()
  @IsString()
  bnetClientSecret?: string;

  @ApiPropertyOptional({ description: 'Client ID WarcraftLogs v2' })
  @IsOptional()
  @IsString()
  wclClientId?: string;

  @ApiPropertyOptional({ description: 'Client Secret WarcraftLogs v2 (sera chiffré)' })
  @IsOptional()
  @IsString()
  wclClientSecret?: string;

  @ApiPropertyOptional({ description: 'URL du Webhook Discord pour les notifications (sera chiffré)' })
  @IsOptional()
  @IsString()
  discordWebhookUrl?: string;

  @ApiPropertyOptional({ description: 'Token Bot Discord optionnel (sera chiffré)' })
  @IsOptional()
  @IsString()
  discordBotToken?: string;
}

