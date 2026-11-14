import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { DiscordWebhookService } from './discord-webhook.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, DiscordWebhookService],
  exports: [NotificationsService, DiscordWebhookService],
})
export class NotificationsModule {}
