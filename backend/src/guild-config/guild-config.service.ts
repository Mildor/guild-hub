import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { GuildConfig } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { SetupGuildConfigDto } from './dto/setup-guild-config.dto';
import { UpdateGuildConfigDto } from './dto/update-guild-config.dto';
import {
  PublicGuildConfig,
  DecryptedGuildSecrets,
  AdminGuildConfig,
} from './guild-config.types';

@Injectable()
export class GuildConfigService {
  private readonly logger = new Logger(GuildConfigService.name);

  // Cache en mémoire
  private cachedConfig: GuildConfig | null = null;
  private cacheExpiresAt: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Vide le cache en mémoire (appelé après toute modification)
   */
  clearCache(): void {
    this.cachedConfig = null;
    this.cacheExpiresAt = 0;
    this.logger.debug('GuildConfig memory cache cleared');
  }

  /**
   * Récupère la configuration brute (avec secrets chiffrés) depuis le cache ou la BDD
   */
  async getRawConfig(): Promise<GuildConfig | null> {
    const now = Date.now();
    if (this.cachedConfig && now < this.cacheExpiresAt) {
      return this.cachedConfig;
    }

    const config = await this.prisma.guildConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    this.cachedConfig = config;
    this.cacheExpiresAt = now + this.CACHE_TTL_MS;

    return config;
  }

  /**
   * Récupère la configuration publique (accessible sans authentification)
   * Ne contient aucun secret, jeton ou identifiant sensible.
   */
  async getPublicConfig(): Promise<PublicGuildConfig> {
    const raw = await this.getRawConfig();

    if (!raw) {
      return {
        isConfigured: false,
        guildName: process.env.GUILD_NAME || 'Guild Hub',
        realm: process.env.GUILD_REALM || 'Archimonde',
        realmSlug: this.slugify(process.env.GUILD_REALM || 'archimonde'),
        region: process.env.BNET_REGION || 'eu',
        primaryColor: '#10b981',
        theme: 'dark',
        hasBnetConfigured: false,
        hasWclConfigured: false,
        hasDiscordConfigured: false,
      };
    }

    return {
      isConfigured: raw.isConfigured,
      guildName: raw.guildName,
      realm: raw.realm,
      realmSlug: raw.realmSlug,
      region: raw.region,
      faction: raw.faction,
      logoUrl: raw.logoUrl,
      bannerUrl: raw.bannerUrl,
      primaryColor: raw.primaryColor || '#10b981',
      theme: raw.theme || 'dark',
      welcomeTitle: raw.welcomeTitle,
      welcomeText: raw.welcomeText,
      recruitmentStatus: raw.recruitmentStatus,
      recruitmentMessage: raw.recruitmentMessage,
      discordInviteUrl: raw.discordInviteUrl,
      wclGuildUrl: raw.wclGuildUrl,
      raiderIoGuildUrl: raw.raiderIoGuildUrl,
      hasBnetConfigured: Boolean(raw.bnetClientId && raw.bnetClientSecret),
      hasWclConfigured: Boolean(raw.wclClientId && raw.wclClientSecret),
      hasDiscordConfigured: Boolean(raw.discordWebhookUrl),
      updatedAt: raw.updatedAt,
    };
  }

  /**
   * Récupère et déchiffre les secrets API pour l'usage interne du serveur
   * (services Blizzard, WarcraftLogs, Discord, etc.)
   */
  async getDecryptedSecrets(): Promise<DecryptedGuildSecrets> {
    const raw = await this.getRawConfig();

    if (!raw) {
      return {
        bnetClientId: process.env.BNET_CLIENT_ID || null,
        bnetClientSecret: process.env.BNET_CLIENT_SECRET || null,
        wclClientId: process.env.WCL_CLIENT_ID || null,
        wclClientSecret: process.env.WCL_CLIENT_SECRET || null,
        discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || null,
        discordBotToken: null,
      };
    }

    return {
      bnetClientId: raw.bnetClientId || null,
      bnetClientSecret: raw.bnetClientSecret
        ? this.encryptionService.decrypt(raw.bnetClientSecret)
        : null,
      wclClientId: raw.wclClientId || null,
      wclClientSecret: raw.wclClientSecret
        ? this.encryptionService.decrypt(raw.wclClientSecret)
        : null,
      discordWebhookUrl: raw.discordWebhookUrl
        ? this.encryptionService.decrypt(raw.discordWebhookUrl)
        : null,
      discordBotToken: raw.discordBotToken
        ? this.encryptionService.decrypt(raw.discordBotToken)
        : null,
    };
  }

  /**
   * Récupère la configuration détaillée pour le tableau de bord Administrateur
   * (affiche les IDs publics et indique si un secret est configuré sans le divulguer)
   */
  async getAdminConfig(): Promise<AdminGuildConfig> {
    const raw = await this.getRawConfig();
    const publicConfig = await this.getPublicConfig();

    return {
      ...publicConfig,
      bnetClientId: raw?.bnetClientId || null,
      wclClientId: raw?.wclClientId || null,
      isBnetSecretSet: Boolean(raw?.bnetClientSecret),
      isWclSecretSet: Boolean(raw?.wclClientSecret),
      isDiscordWebhookSet: Boolean(raw?.discordWebhookUrl),
      isDiscordBotTokenSet: Boolean(raw?.discordBotToken),
    };
  }

  /**
   * Initialisation / Setup Wizard (premier lancement)
   * Ne peut être exécuté que si aucune configuration active n'existe déjà.
   */
  async setup(dto: SetupGuildConfigDto): Promise<PublicGuildConfig> {
    const existing = await this.getRawConfig();
    if (existing && existing.isConfigured) {
      throw new BadRequestException(
        'L\'application est déjà configurée. Utilisez les paramètres administrateur pour modifier la configuration.',
      );
    }

    const realmSlug = dto.realmSlug || this.slugify(dto.realm);

    // Chiffrement des secrets fournis
    const encryptedBnetSecret = dto.bnetClientSecret?.trim()
      ? this.encryptionService.encrypt(dto.bnetClientSecret.trim())
      : null;

    const encryptedWclSecret = dto.wclClientSecret?.trim()
      ? this.encryptionService.encrypt(dto.wclClientSecret.trim())
      : null;

    const encryptedDiscordWebhook = dto.discordWebhookUrl?.trim()
      ? this.encryptionService.encrypt(dto.discordWebhookUrl.trim())
      : null;

    const encryptedDiscordBotToken = dto.discordBotToken?.trim()
      ? this.encryptionService.encrypt(dto.discordBotToken.trim())
      : null;

    if (existing) {
      await this.prisma.guildConfig.update({
        where: { id: existing.id },
        data: {
          isConfigured: true,
          guildName: dto.guildName.trim(),
          realm: dto.realm.trim(),
          realmSlug,
          region: dto.region || 'eu',
          faction: dto.faction,
          logoUrl: dto.logoUrl,
          bannerUrl: dto.bannerUrl,
          primaryColor: dto.primaryColor || '#10b981',
          theme: dto.theme || 'dark',
          welcomeTitle: dto.welcomeTitle,
          welcomeText: dto.welcomeText,
          recruitmentStatus: dto.recruitmentStatus || 'OPEN',
          recruitmentMessage: dto.recruitmentMessage,
          discordInviteUrl: dto.discordInviteUrl,
          wclGuildUrl: dto.wclGuildUrl,
          raiderIoGuildUrl: dto.raiderIoGuildUrl,
          bnetClientId: dto.bnetClientId?.trim() || null,
          bnetClientSecret: encryptedBnetSecret,
          wclClientId: dto.wclClientId?.trim() || null,
          wclClientSecret: encryptedWclSecret,
          discordWebhookUrl: encryptedDiscordWebhook,
          discordBotToken: encryptedDiscordBotToken,
        },
      });
    } else {
      await this.prisma.guildConfig.create({
        data: {
          isConfigured: true,
          guildName: dto.guildName.trim(),
          realm: dto.realm.trim(),
          realmSlug,
          region: dto.region || 'eu',
          faction: dto.faction,
          logoUrl: dto.logoUrl,
          bannerUrl: dto.bannerUrl,
          primaryColor: dto.primaryColor || '#10b981',
          theme: dto.theme || 'dark',
          welcomeTitle: dto.welcomeTitle,
          welcomeText: dto.welcomeText,
          recruitmentStatus: dto.recruitmentStatus || 'OPEN',
          recruitmentMessage: dto.recruitmentMessage,
          discordInviteUrl: dto.discordInviteUrl,
          wclGuildUrl: dto.wclGuildUrl,
          raiderIoGuildUrl: dto.raiderIoGuildUrl,
          bnetClientId: dto.bnetClientId?.trim() || null,
          bnetClientSecret: encryptedBnetSecret,
          wclClientId: dto.wclClientId?.trim() || null,
          wclClientSecret: encryptedWclSecret,
          discordWebhookUrl: encryptedDiscordWebhook,
          discordBotToken: encryptedDiscordBotToken,
        },
      });
    }

    this.clearCache();
    this.logger.log(`Setup complété avec succès pour la guilde: ${dto.guildName} (${dto.realm})`);
    return this.getPublicConfig();
  }

  /**
   * Mise à jour de la configuration par un Administrateur
   */
  async update(dto: UpdateGuildConfigDto): Promise<PublicGuildConfig> {
    let existing = await this.getRawConfig();

    if (!existing) {
      // Si la table est encore vide, on crée une configuration par défaut
      existing = await this.prisma.guildConfig.create({
        data: {
          isConfigured: true,
          guildName: dto.guildName || 'My Guild',
          realm: dto.realm || 'Archimonde',
          realmSlug: this.slugify(dto.realm || 'Archimonde'),
        },
      });
    }

    const dataToUpdate: any = {};

    // Données textuelles & branding
    if (dto.guildName !== undefined) dataToUpdate.guildName = dto.guildName.trim();
    if (dto.realm !== undefined) {
      dataToUpdate.realm = dto.realm.trim();
      dataToUpdate.realmSlug = dto.realmSlug || this.slugify(dto.realm);
    } else if (dto.realmSlug !== undefined) {
      dataToUpdate.realmSlug = dto.realmSlug.trim();
    }
    if (dto.region !== undefined) dataToUpdate.region = dto.region;
    if (dto.faction !== undefined) dataToUpdate.faction = dto.faction;
    if (dto.logoUrl !== undefined) dataToUpdate.logoUrl = dto.logoUrl;
    if (dto.bannerUrl !== undefined) dataToUpdate.bannerUrl = dto.bannerUrl;
    if (dto.primaryColor !== undefined) dataToUpdate.primaryColor = dto.primaryColor;
    if (dto.theme !== undefined) dataToUpdate.theme = dto.theme;
    if (dto.welcomeTitle !== undefined) dataToUpdate.welcomeTitle = dto.welcomeTitle;
    if (dto.welcomeText !== undefined) dataToUpdate.welcomeText = dto.welcomeText;
    if (dto.recruitmentStatus !== undefined) dataToUpdate.recruitmentStatus = dto.recruitmentStatus;
    if (dto.recruitmentMessage !== undefined) dataToUpdate.recruitmentMessage = dto.recruitmentMessage;
    if (dto.discordInviteUrl !== undefined) dataToUpdate.discordInviteUrl = dto.discordInviteUrl;
    if (dto.wclGuildUrl !== undefined) dataToUpdate.wclGuildUrl = dto.wclGuildUrl;
    if (dto.raiderIoGuildUrl !== undefined) dataToUpdate.raiderIoGuildUrl = dto.raiderIoGuildUrl;

    // Identifiants & Secrets (ne chiffre et ne remplace que s'ils sont fournis non vides)
    if (dto.bnetClientId !== undefined) {
      dataToUpdate.bnetClientId = dto.bnetClientId.trim() || null;
    }
    if (dto.bnetClientSecret !== undefined && dto.bnetClientSecret.trim() !== '') {
      dataToUpdate.bnetClientSecret = this.encryptionService.encrypt(dto.bnetClientSecret.trim());
    }

    if (dto.wclClientId !== undefined) {
      dataToUpdate.wclClientId = dto.wclClientId.trim() || null;
    }
    if (dto.wclClientSecret !== undefined && dto.wclClientSecret.trim() !== '') {
      dataToUpdate.wclClientSecret = this.encryptionService.encrypt(dto.wclClientSecret.trim());
    }

    if (dto.discordWebhookUrl !== undefined && dto.discordWebhookUrl.trim() !== '') {
      dataToUpdate.discordWebhookUrl = this.encryptionService.encrypt(dto.discordWebhookUrl.trim());
    }
    if (dto.discordBotToken !== undefined && dto.discordBotToken.trim() !== '') {
      dataToUpdate.discordBotToken = this.encryptionService.encrypt(dto.discordBotToken.trim());
    }

    await this.prisma.guildConfig.update({
      where: { id: existing.id },
      data: dataToUpdate,
    });

    this.clearCache();
    this.logger.log('Configuration de guilde mise à jour par un administrateur');
    return this.getPublicConfig();
  }

  /**
   * Utilitaire pour slugifier un nom de royaume
   */
  private slugify(input: string): string {
    return input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

