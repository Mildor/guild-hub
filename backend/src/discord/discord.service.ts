import { Injectable } from '@nestjs/common';

@Injectable()
export class DiscordService {
  async announceNewEvent(event: any, creator: any): Promise<void> {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn(
        'DISCORD_WEBHOOK_URL is not configured. Skipping Discord announcement.',
      );
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');
    const eventUrl = frontendUrl ? `${frontendUrl}/events/${event.id}` : undefined;

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
}