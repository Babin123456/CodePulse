import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';

export const GITHUB_STALE_REDIS = 'GITHUB_STALE_REDIS';

/** The small slice of ioredis that the stale store needs. */
export interface StaleRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'PX', ttlMs: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
  quit?(): Promise<unknown>;
}

/**
 * Holds the long-lived "stale" copy of each proxied GitHub response.
 *
 * The app-wide CacheManager is an in-memory store (CacheModule.register has
 * no Redis store), so the stale copies go to Redis directly through ioredis.
 * If Redis is unreachable it degrades to a per-process Map, so the proxy
 * never fails just because the stale layer is down.
 */
@Injectable()
export class GithubStaleStore implements OnModuleDestroy {
  private readonly logger = new Logger(GithubStaleStore.name);
  private readonly local = new Map<
    string,
    { value: string; expiresAt: number }
  >();
  private readonly now: () => number = () => Date.now();

  constructor(
    @Optional()
    @Inject(GITHUB_STALE_REDIS)
    private readonly redis?: StaleRedisClient,
  ) {}

  async get<T>(key: string): Promise<T | undefined> {
    let raw: string | null | undefined;
    if (this.redis) {
      try {
        raw = await this.redis.get(key);
      } catch (error: any) {
        this.logger.warn(
          `Redis stale read failed for ${key}: ${error?.message}`,
        );
      }
    }
    if (raw == null) raw = this.readLocal(key);
    if (raw == null) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: unknown, ttlMs: number): Promise<void> {
    const raw = JSON.stringify(value);
    this.local.set(key, { value: raw, expiresAt: this.now() + ttlMs });
    if (!this.redis) return;
    try {
      await this.redis.set(key, raw, 'PX', ttlMs);
    } catch (error: any) {
      this.logger.warn(
        `Redis stale write failed for ${key}: ${error?.message}`,
      );
    }
  }

  async del(key: string): Promise<void> {
    this.local.delete(key);
    if (!this.redis) return;
    try {
      await this.redis.del(key);
    } catch (error: any) {
      this.logger.warn(
        `Redis stale delete failed for ${key}: ${error?.message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis?.quit?.();
    } catch {
      /* already closed */
    }
  }

  private readLocal(key: string): string | undefined {
    const hit = this.local.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt <= this.now()) {
      this.local.delete(key);
      return undefined;
    }
    return hit.value;
  }
}
