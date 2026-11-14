import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface DiscordBattleEmbedPayload {
  winnerUsername: string;
  loserUsername: string;
  winnerScore: number;
  loserScore: number;
  battleType?: string;
  winnerXpGain: number;
}

@Injectable()
export class DiscordWebhookService {
  private readonly logger = new Logger(DiscordWebhookService.name);
  private readonly webhookUrl = process.env.DISCORD_BATTLE_WEBHOOK_URL;

  async sendBattleResult(payload: DiscordBattleEmbedPayload): Promise<boolean> {
    if (!this.webhookUrl) {
      this.logger.debug('Discord webhook URL not configured, skipping notification');
      return false;
    }

    try {
      const embed = {
        title: '⚔️ CodePulse Developer Battle Completed!',
        color: 0x38bdf8, // Cyan accent
        description: `**${payload.winnerUsername}** emerged victorious against **${payload.loserUsername}**!`,
        fields: [
          {
            name: '🏆 Victor',
            value: `**${payload.winnerUsername}** (${payload.winnerScore} pts)`,
            inline: true,
          },
          {
            name: '🥈 Runner-up',
            value: `**${payload.loserUsername}** (${payload.loserScore} pts)`,
            inline: true,
          },
          {
            name: '✨ XP Awarded',
            value: `+${payload.winnerXpGain} XP to Victor`,
            inline: false,
          },
        ],
        footer: {
          text: 'CodePulse Realtime Battle Arena • Powered by DevPulse',
        },
        timestamp: new Date().toISOString(),
      };

      await axios.post(this.webhookUrl, {
        username: 'CodePulse BattleBot',
        avatar_url: 'https://codepulse.dev/battle-bot-avatar.png',
        embeds: [embed],
      });

      this.logger.log(`Discord battle notification sent for ${payload.winnerUsername} vs ${payload.loserUsername}`);
      return true;
    } catch (error: any) {
      this.logger.warn(`Failed to dispatch Discord webhook: ${error?.message || error}`);
      return false;
    }
  }
}
