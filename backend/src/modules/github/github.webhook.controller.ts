import {
  Controller,
  Post,
  Headers,
  Body,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import * as crypto from 'crypto';
import { GithubWebhookService } from './github.webhook.service';

@ApiTags('github-webhooks')
@Controller('api/v1/github/webhooks')
export class GithubWebhookController {
  private readonly logger = new Logger(GithubWebhookController.name);
  private readonly webhookSecret =
    process.env.GITHUB_WEBHOOK_SECRET || 'codepulse-webhook-secret';

  constructor(private readonly webhookService: GithubWebhookService) {}

  private verifySignature(payload: string, signature: string): boolean {
    if (!signature) return false;
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    const digest = `sha256=${hmac.update(payload).digest('hex')}`;
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
    } catch {
      return false;
    }
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle incoming GitHub push, PR, and star webhooks' })
  async handleWebhook(
    @Headers('x-hub-signature-256') signature: string,
    @Headers('x-github-event') event: string,
    @Headers('x-github-delivery') deliveryId: string,
    @Body() body: any,
  ) {
    const rawPayload = JSON.stringify(body);

    // Validate HMAC signature (reject if signature missing or invalid)
    if (!signature || !this.verifySignature(rawPayload, signature)) {
      this.logger.warn('GitHub webhook signature mismatch or missing');
      throw new UnauthorizedException('Invalid or missing HMAC signature');
    }

    // Idempotency check: ignore duplicate deliveries via X-GitHub-Delivery GUID tracking
    if (deliveryId && this.webhookService.isDeliveryProcessed(deliveryId)) {
      this.logger.log(`Ignoring duplicate delivery: ${deliveryId}`);
      return { status: 'duplicate_ignored', deliveryId };
    }

    if (deliveryId) {
      this.webhookService.recordDelivery(deliveryId);
    }

    this.logger.log(`Received GitHub webhook event: ${event} (Delivery: ${deliveryId})`);

    switch (event) {
      case 'push': {
        const result = await this.webhookService.processPushEvent(body);
        return { status: 'processed', event: 'push', ...result };
      }

      case 'pull_request': {
        const result = await this.webhookService.processPullRequestEvent(body);
        return { status: 'processed', event: 'pull_request', ...result };
      }

      case 'star': {
        const result = await this.webhookService.processStarEvent(body);
        return { status: 'processed', event: 'star', ...result };
      }

      case 'ping':
        return { status: 'pong', zen: body?.zen };

      default:
        this.logger.debug(`Unhandled GitHub event: ${event}`);
        return { status: 'ignored', event };
    }
  }
}
