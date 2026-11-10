import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncService } from './sync.service';

@Injectable()
export class SyncCronService {
  private readonly logger = new Logger(SyncCronService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncService: SyncService
  ) {}

  /**
   * Daily Midnight Cron Worker:
   * Selects active developers (logged in or active within last 30 days) and synchronizes
   * GitHub contribution metrics, streaks, and ranking percentiles.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyContributionSync() {
    if (this.isRunning) {
      this.logger.warn('Previous contribution sync job is still running. Skipping execution.');
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting automated daily GitHub contribution sync worker...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    const failedUsers: string[] = [];

    try {
      // Find active developers to refresh
      const activeUsers = await this.prisma.user.findMany({
        where: {
          updatedAt: { gte: thirtyDaysAgo },
        },
        select: {
          id: true,
          username: true,
        },
        take: 200, // Safe batch limit
      });

      this.logger.log(`Found ${activeUsers.length} active developers to synchronize.`);

      // Batch in chunks of 10 users with 2000ms delay between chunks to respect GitHub rate limits
      const BATCH_SIZE = 10;
      for (let i = 0; i < activeUsers.length; i += BATCH_SIZE) {
        const batch = activeUsers.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (user) => {
            processedCount++;
            try {
              // Trigger user contribution refresh via SyncService
              await this.syncService.syncUser(user.id);
              successCount++;
            } catch (err: any) {
              failedCount++;
              failedUsers.push(user.username);
              this.logger.error(`Failed syncing user @${user.username}: ${err?.message}`);
            }
          })
        );

        // 2-second rate-limit throttle delay between batches
        if (i + BATCH_SIZE < activeUsers.length) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      this.logger.log(
        `Automated Sync Completed: ${processedCount} processed, ${successCount} successful, ${failedCount} failed.`
      );
      if (failedUsers.length > 0) {
        this.logger.warn(`Failed usernames: ${failedUsers.join(', ')}`);
      }
    } catch (globalErr: any) {
      this.logger.error('Fatal error in daily contribution sync cron:', globalErr);
    } finally {
      this.isRunning = false;
    }
  }
}
