import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';
import { GithubWebhookController } from './github-webhook.controller';
import { CircuitBreakerService } from './circuit-breaker.service';
import { GITHUB_STALE_REDIS, GithubStaleStore } from './github-stale.store';
import { CustomThrottlerGuard } from '../../common/guards/custom-throttler.guard';

@Module({
  imports: [ConfigModule],
  controllers: [GithubController, GithubWebhookController],
  providers: [
    GithubService,
    CircuitBreakerService,
    GithubStaleStore,
    CustomThrottlerGuard,
    {
      // Same connection settings as BullModule in app.module.ts. Failing fast
      // (no offline queue) keeps requests from hanging while Redis is down.
      provide: GITHUB_STALE_REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const password = config.get<string>('REDIS_PASSWORD') || undefined;
        const client = new Redis({
          host: config.get<string>('REDIS_HOST') || 'localhost',
          port: parseInt(config.get<string>('REDIS_PORT') || '6379', 10),
          password,
          tls: password ? {} : undefined,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          retryStrategy: (attempt: number) => Math.min(attempt * 500, 10_000),
        });
        client.on('error', () => {
          /* surfaced per call by GithubStaleStore; avoids unhandled 'error' events */
        });
        return client;
      },
    },
  ],
  exports: [GithubService],
})
export class GithubModule {}
