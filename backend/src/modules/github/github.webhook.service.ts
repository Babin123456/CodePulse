import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface WebhookPushPayload {
  commits?: Array<{ id: string; message: string; author?: { username?: string; email?: string } }>;
  repository?: { full_name: string; name: string };
  pusher?: { name: string; email?: string };
  ref?: string;
}

export interface WebhookPullRequestPayload {
  action: string;
  pull_request?: {
    number: number;
    title: string;
    merged: boolean;
    user?: { login: string };
  };
  repository?: { full_name: string; name: string };
}

export interface WebhookStarPayload {
  action: string;
  starred_at?: string;
  sender?: { login: string };
  repository?: { full_name: string; name: string };
}

@Injectable()
export class GithubWebhookService {
  private readonly logger = new Logger(GithubWebhookService.name);
  private readonly processedDeliveries = new Set<string>();

  constructor(private readonly prisma: PrismaService) {}

  isDeliveryProcessed(deliveryId: string): boolean {
    if (!deliveryId) return false;
    return this.processedDeliveries.has(deliveryId);
  }

  recordDelivery(deliveryId: string) {
    if (!deliveryId) return;
    this.processedDeliveries.add(deliveryId);
    // Keep set bounded
    if (this.processedDeliveries.size > 10000) {
      const firstEntries = Array.from(this.processedDeliveries).slice(0, 2000);
      firstEntries.forEach((id) => this.processedDeliveries.delete(id));
    }
  }

  async processPushEvent(payload: WebhookPushPayload) {
    const commits = payload.commits || [];
    const commitCount = commits.length;
    const authorUsername = payload.pusher?.name || commits[0]?.author?.username;
    this.logger.log(`Processing push: ${commitCount} commits by ${authorUsername}`);

    if (!authorUsername || commitCount === 0) return { awardedXp: 0 };

    try {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { username: authorUsername },
            { githubId: authorUsername },
          ],
        },
      });

      if (user) {
        const xpGained = commitCount * 10;
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            xpTransactions: {
              create: {
                amount: xpGained,
                source: 'GITHUB_PUSH',
                description: `GitHub Webhook: Pushed ${commitCount} commits to ${payload.repository?.name || 'repository'}`,
              },
            },
          },
        });
        return { awardedXp: xpGained, userId: user.id };
      }
    } catch (err: any) {
      this.logger.warn(`Could not award push XP: ${err?.message}`);
    }

    return { awardedXp: 0 };
  }

  async processPullRequestEvent(payload: WebhookPullRequestPayload) {
    const isMerged = payload.action === 'closed' && payload.pull_request?.merged === true;
    const authorUsername = payload.pull_request?.user?.login;

    if (!isMerged || !authorUsername) return { awardedXp: 0 };

    try {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { username: authorUsername },
            { githubId: authorUsername },
          ],
        },
      });

      if (user) {
        const xpGained = 50;
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            xpTransactions: {
              create: {
                amount: xpGained,
                source: 'GITHUB_PR_MERGE',
                description: `GitHub Webhook: PR #${payload.pull_request?.number} merged in ${payload.repository?.name || 'repo'}`,
              },
            },
            activities: {
              create: {
                type: 'PULL_REQUEST',
                title: `PR #${payload.pull_request?.number} Merged`,
                description: payload.pull_request?.title || 'Pull request merged',
                repository: payload.repository?.name,
              },
            },
          },
        });
        return { awardedXp: xpGained, userId: user.id };
      }
    } catch (err: any) {
      this.logger.warn(`Could not award PR merge XP: ${err?.message}`);
    }

    return { awardedXp: 0 };
  }

  async processStarEvent(payload: WebhookStarPayload) {
    if (payload.action !== 'created') return { awardedXp: 0 };

    const repoOwner = payload.repository?.full_name?.split('/')[0];
    if (!repoOwner) return { awardedXp: 0 };

    try {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { username: repoOwner },
            { githubId: repoOwner },
          ],
        },
      });

      if (user) {
        const xpGained = 20;
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            xpTransactions: {
              create: {
                amount: xpGained,
                source: 'GITHUB_STAR',
                description: `GitHub Webhook: New star received on ${payload.repository?.name || 'repo'}`,
              },
            },
          },
        });
        return { awardedXp: xpGained, userId: user.id };
      }
    } catch (err: any) {
      this.logger.warn(`Could not award Star XP: ${err?.message}`);
    }

    return { awardedXp: 0 };
  }
}
