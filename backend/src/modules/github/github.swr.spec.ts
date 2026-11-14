import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GithubService } from './github.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { GithubStaleStore, StaleRedisClient } from './github-stale.store';
import { GITHUB_CACHE_TTL } from './constants/cache.constants';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

/** In-memory stand-in for ioredis (ignores TTL; the stale TTL is 1h). */
class FakeRedis implements StaleRedisClient {
  data = new Map<string, string>();
  down = false;
  get = jest.fn(async (key: string) => {
    if (this.down) throw new Error('redis down');
    return this.data.get(key) ?? null;
  });
  set = jest.fn(async (key: string, value: string) => {
    if (this.down) throw new Error('redis down');
    this.data.set(key, value);
    return 'OK';
  });
  del = jest.fn(async (key: string) => {
    if (this.down) throw new Error('redis down');
    this.data.delete(key);
    return 1;
  });
}

const rawProfile = (followers: number) => ({
  data: {
    id: 1,
    login: 'octo',
    name: 'Octo',
    avatar_url: 'a',
    html_url: 'h',
    public_repos: 1,
    followers,
    created_at: '2020-01-01T00:00:00Z',
  },
});

const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

describe('GithubService stale-while-revalidate + circuit breaker', () => {
  let now: number;
  let fakeRedis: FakeRedis;
  let cache: Map<string, { value: unknown; expiresAt: number }>;
  let service: GithubService;
  let breaker: CircuitBreakerService;

  const cacheManager = {
    get: jest.fn(async (key: string) => {
      const hit = cache.get(key);
      if (!hit || hit.expiresAt <= now) return undefined;
      return hit.value;
    }),
    set: jest.fn(async (key: string, value: unknown, ttl: number) => {
      cache.set(key, { value, expiresAt: now + ttl });
    }),
    del: jest.fn(async (key: string) => {
      cache.delete(key);
    }),
  };

  beforeEach(() => {
    now = 1_000_000;
    cache = new Map();
    fakeRedis = new FakeRedis();
    jest.clearAllMocks();
    mockedAxios.get.mockReset();
    breaker = new CircuitBreakerService({
      failureThreshold: 3,
      cooldownMs: 30_000,
      now: () => now,
    });
    service = new GithubService(
      { get: jest.fn() } as unknown as ConfigService,
      cacheManager as any,
      breaker,
      new GithubStaleStore(fakeRedis),
    );
  });

  it('serves a fresh hit without calling GitHub', async () => {
    mockedAxios.get.mockResolvedValueOnce(rawProfile(10));
    const first = await service.getUserProfileCached('octo');
    expect(first).toMatchObject({ followers: 10, cached: false });
    expect(first).not.toHaveProperty('stale');

    now += 60_000;
    const second = await service.getUserProfileCached('octo');
    expect(second).toMatchObject({ followers: 10, cached: true });
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('writes a stale copy to Redis alongside the fresh key', async () => {
    mockedAxios.get.mockResolvedValueOnce(rawProfile(10));
    await service.getUserProfileCached('octo');
    expect(fakeRedis.set).toHaveBeenCalledWith(
      'github:stale:github:profile:octo',
      expect.any(String),
      'PX',
      60 * 60 * 1000,
    );
  });

  it('serves the stale copy immediately and revalidates in the background', async () => {
    mockedAxios.get.mockResolvedValueOnce(rawProfile(10));
    await service.getUserProfileCached('octo');

    now += GITHUB_CACHE_TTL.PROFILE + 1; // fresh key expired

    let resolveUpstream!: (v: unknown) => void;
    mockedAxios.get.mockReturnValueOnce(
      new Promise((resolve) => (resolveUpstream = resolve)),
    );

    const stale = await service.getUserProfileCached('octo');
    expect(stale).toMatchObject({ followers: 10, cached: false, stale: true });
    expect(mockedAxios.get).toHaveBeenCalledTimes(2); // background call started, not awaited

    resolveUpstream(rawProfile(99));
    await flush();

    const refreshed = await service.getUserProfileCached('octo');
    expect(refreshed).toMatchObject({ followers: 99, cached: true });
    expect(refreshed).not.toHaveProperty('stale');
  });

  it('runs a single revalidation for concurrent requests (no stampede)', async () => {
    mockedAxios.get.mockResolvedValueOnce(rawProfile(10));
    await service.getUserProfileCached('octo');
    now += GITHUB_CACHE_TTL.PROFILE + 1;

    let resolveUpstream!: (v: unknown) => void;
    mockedAxios.get.mockReturnValueOnce(
      new Promise((resolve) => (resolveUpstream = resolve)),
    );

    const results = await Promise.all(
      Array.from({ length: 8 }, () => service.getUserProfileCached('octo')),
    );
    expect(results.every((r) => (r as any).stale === true)).toBe(true);
    expect(mockedAxios.get).toHaveBeenCalledTimes(2); // 1 initial + exactly 1 revalidation

    resolveUpstream(rawProfile(11));
    await flush();
  });

  it('shares one upstream fetch between concurrent cold-cache requests', async () => {
    let resolveUpstream!: (v: unknown) => void;
    mockedAxios.get.mockReturnValueOnce(
      new Promise((resolve) => (resolveUpstream = resolve)),
    );
    const pending = Promise.all([
      service.getUserProfileCached('octo'),
      service.getUserProfileCached('octo'),
      service.getUserProfileCached('octo'),
    ]);
    await flush();
    resolveUpstream(rawProfile(5));
    const results = await pending;
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(results.every((r) => (r as any).followers === 5)).toBe(true);
  });

  it('serves the stale copy when a forced refresh hits an upstream failure', async () => {
    mockedAxios.get.mockResolvedValueOnce(rawProfile(10));
    await service.getUserProfileCached('octo');

    mockedAxios.get.mockRejectedValueOnce({
      response: { status: 502 },
      message: 'bad gateway',
    });
    const result = await service.getUserProfileCached('octo', undefined, true);
    expect(result).toMatchObject({ followers: 10, stale: true, cached: false });
    expect(result).not.toHaveProperty('fallbackSource');
  });

  it('falls back to mock data when GitHub fails and nothing is cached', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      response: { status: 500 },
      message: 'boom',
    });
    const result = await service.getUserProfileCached('octo');
    expect(result).toMatchObject({
      username: 'octo',
      stale: true,
      fallbackSource: 'mock',
    });
  });

  it('still serves stale data when Redis is down (in-process fallback)', async () => {
    mockedAxios.get.mockResolvedValueOnce(rawProfile(10));
    await service.getUserProfileCached('octo');
    fakeRedis.down = true;
    now += GITHUB_CACHE_TTL.PROFILE + 1;
    mockedAxios.get.mockResolvedValueOnce(rawProfile(12));

    const result = await service.getUserProfileCached('octo');
    expect(result).toMatchObject({ followers: 10, stale: true });
    await flush();
  });

  it('opens the breaker after 3 failures, stops calling GitHub, and recovers via HALF_OPEN', async () => {
    mockedAxios.get.mockRejectedValue({
      response: { status: 503 },
      message: 'down',
    });
    for (let i = 0; i < 3; i++) {
      await service.getUserProfileCached(`user${i}`);
    }
    expect(breaker.getState()).toBe('OPEN');
    expect(mockedAxios.get).toHaveBeenCalledTimes(3);

    const whileOpen = await service.getUserProfileCached('another');
    expect(whileOpen).toMatchObject({ stale: true, fallbackSource: 'mock' });
    expect(mockedAxios.get).toHaveBeenCalledTimes(3); // no upstream call while OPEN

    now += 30_000;
    expect(breaker.getState()).toBe('HALF_OPEN');
    mockedAxios.get.mockReset();
    mockedAxios.get.mockResolvedValueOnce(rawProfile(7));
    const trial = await service.getUserProfileCached('another');
    expect(trial).toMatchObject({ followers: 7, cached: false });
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('serves stale data without touching GitHub while the breaker is OPEN', async () => {
    mockedAxios.get.mockResolvedValueOnce(rawProfile(10));
    await service.getUserProfileCached('octo');
    now += GITHUB_CACHE_TTL.PROFILE + 1;

    mockedAxios.get.mockRejectedValue({
      response: { status: 500 },
      message: 'down',
    });
    for (let i = 0; i < 3; i++) {
      await service.getUserProfileCached(`other${i}`);
    }
    expect(breaker.getState()).toBe('OPEN');
    mockedAxios.get.mockClear();

    const result = await service.getUserProfileCached('octo');
    expect(result).toMatchObject({ followers: 10, stale: true });
    await flush();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('does not trip the breaker or serve stale data for an unknown user (404)', async () => {
    mockedAxios.get.mockRejectedValue({
      response: { status: 404, data: { message: 'Not Found' } },
      message: 'nope',
    });
    for (let i = 0; i < 4; i++) {
      await expect(service.getUserProfileCached(`ghost${i}`)).rejects.toThrow(
        /was not found/,
      );
    }
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('marks list endpoints as stale too', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      response: { status: 500 },
      message: 'x',
    });
    const repos = await service.getUserReposCached('octo');
    expect(repos).toMatchObject({
      repos: [],
      stale: true,
      fallbackSource: 'mock',
    });
  });
});
