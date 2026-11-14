import { Controller, Post, Headers, Body, BadRequestException, UnauthorizedException, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import * as crypto from 'crypto';

@ApiTags('github-webhooks')
@Controller('github/webhook')
export class GithubWebhookController {
  private readonly logger = new Logger(GithubWebhookController.name);
  private readonly webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || 'codepulse-webhook-secret';

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
  @ApiOperation({ summary: 'Handle incoming GitHub push and pull request webhooks' })
  async handleWebhook(
    @Headers('x-hub-signature-256') signature: string,
    @Headers('x-github-event') event: string,
    @Body() body: any,
  ) {
    const rawPayload = JSON.stringify(body);

    // In production with secret configured, enforce signature check
    if (process.env.NODE_ENV === 'production' && !this.verifySignature(rawPayload, signature)) {
      this.logger.warn('GitHub webhook signature mismatch');
      throw new UnauthorizedException('Invalid HMAC signature');
    }

    this.logger.log(`Received GitHub webhook event: ${event}`);

    switch (event) {
      case 'push': {
        const repoName = body?.repository?.full_name;
        const pusher = body?.pusher?.name;
        const commitCount = Array.isArray(body?.commits) ? body.commits.length : 0;
        this.logger.log(`Push event: ${commitCount} commits by ${pusher} in ${repoName}`);
        return { status: 'processed', event: 'push', commits: commitCount };
      }

      case 'pull_request': {
        const action = body?.action;
        const prNumber = body?.pull_request?.number;
        const repoName = body?.repository?.full_name;
        this.logger.log(`PR event: #${prNumber} ${action} in ${repoName}`);
        return { status: 'processed', event: 'pull_request', action, number: prNumber };
      }

      case 'ping':
        return { status: 'pong', zen: body?.zen };

      default:
        this.logger.debug(`Unhandled GitHub event: ${event}`);
        return { status: 'ignored', event };
    }
  }
}
