import { Injectable } from '@nestjs/common';

@Injectable()
export class DiscordService {
  private async sendWebhook(payload: Record<string, unknown>): Promise<void> {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn(
        'DISCORD_WEBHOOK_URL is not configured. Skipping Discord announcement.',
      );
      return;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Discord webhook failed (${response.status} ${response.statusText}): ${errorText}`,
      );
    }
  }

  async announceNewEvent(event: any, creator: any): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');
    const eventUrl = frontendUrl
      ? `${frontendUrl}/events/${event.id}`
      : undefined;

    const payload = {
      embeds: [
        {
          title: `⚔️ Nouvel Événement : ${event.title}`,
          description: event.description || 'Aucune description fournie.',
          color: 15105570,
          ...(eventUrl ? { url: eventUrl } : {}),
          fields: [
            {
              name: '📅 Date et Heure',
              value: new Date(event.eventDate).toLocaleString('fr-FR'),
              inline: true,
            },
            {
              name: '👑 Créé par',
              value: creator?.battletag || 'Inconnu',
              inline: true,
            },
          ],
          footer: {
            text: 'The Good Place - Guild Hub',
          },
        },
      ],
    };

    await this.sendWebhook(payload);
  }

  async sendEventReminder(
    event: any,
    reminderType: 'ONE_DAY' | 'THREE_HOURS',
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');
    const eventUrl = frontendUrl
      ? `${frontendUrl}/events/${event.id}`
      : undefined;

    const reminderLabel =
      reminderType === 'ONE_DAY' ? 'dans 24 heures' : 'dans 3 heures';

    const payload = {
      embeds: [
        {
          title: `⏰ Rappel Événement : ${event.title}`,
          description: `L'événement commence ${reminderLabel}.`,
          color: reminderType === 'ONE_DAY' ? 5814783 : 16098851,
          ...(eventUrl ? { url: eventUrl } : {}),
          fields: [
            {
              name: '📅 Date et Heure',
              value: new Date(event.eventDate).toLocaleString('fr-FR'),
              inline: true,
            },
            {
              name: '📝 Description',
              value: event.description || 'Aucune description fournie.',
              inline: false,
            },
          ],
          footer: {
            text: 'The Good Place - Guild Hub',
          },
        },
      ],
    };

    await this.sendWebhook(payload);
  }
}
