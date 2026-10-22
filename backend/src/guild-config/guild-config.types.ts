export interface PublicGuildConfig {
  isConfigured: boolean;
  guildName: string;
  realm: string;
  realmSlug: string;
  region: string;
  faction?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  primaryColor: string;
  theme: string;
  welcomeTitle?: string | null;
  welcomeText?: string | null;
  recruitmentStatus?: string | null;
  recruitmentMessage?: string | null;
  discordInviteUrl?: string | null;
  wclGuildUrl?: string | null;
  raiderIoGuildUrl?: string | null;

  // Indicateurs booléens de présence des intégrations (sans fuite de secret)
  hasBnetConfigured: boolean;
  hasWclConfigured: boolean;
  hasDiscordConfigured: boolean;

  updatedAt?: Date;
}

export interface DecryptedGuildSecrets {
  bnetClientId: string | null;
  bnetClientSecret: string | null;
  wclClientId: string | null;
  wclClientSecret: string | null;
  discordWebhookUrl: string | null;
  discordBotToken: string | null;
}

export interface AdminGuildConfig extends PublicGuildConfig {
  bnetClientId?: string | null;
  wclClientId?: string | null;
  isBnetSecretSet: boolean;
  isWclSecretSet: boolean;
  isDiscordWebhookSet: boolean;
  isDiscordBotTokenSet: boolean;
}

