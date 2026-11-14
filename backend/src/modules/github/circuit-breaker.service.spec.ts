import {
  CircuitBreakerService,
  CircuitOpenError,
  isUpstreamFailure,
} from './circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let now: number;
  let breaker: CircuitBreakerService;

  const fail = () =>
    breaker
      .execute(() => Promise.reject({ response: { status: 503 } }))
      .catch(() => undefined);
  const succeed = () => breaker.execute(() => Promise.resolve('ok'));

  beforeEach(() => {
    now = 1_000;
    breaker = new CircuitBreakerService({
      failureThreshold: 3,
      cooldownMs: 30_000,
      now: () => now,
    });
  });

  it('starts CLOSED and lets calls through', async () => {
    expect(breaker.getState()).toBe('CLOSED');
    await expect(succeed()).resolves.toBe('ok');
  });

  it('stays CLOSED below the failure threshold and resets on success', async () => {
    await fail();
    await fail();
    expect(breaker.getState()).toBe('CLOSED');
    await succeed();
    await fail();
    await fail();
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('opens after 3 consecutive failures and rejects without calling upstream', async () => {
    await fail();
    await fail();
    await fail();
    expect(breaker.getState()).toBe('OPEN');

    const upstream = jest.fn().mockResolvedValue('ok');
    await expect(breaker.execute(upstream)).rejects.toBeInstanceOf(
      CircuitOpenError,
    );
    expect(upstream).not.toHaveBeenCalled();
  });

  it('goes HALF_OPEN after the cool-down and closes when the trial succeeds', async () => {
    await fail();
    await fail();
    await fail();

    now += 29_999;
    expect(breaker.getState()).toBe('OPEN');
    now += 1;
    expect(breaker.getState()).toBe('HALF_OPEN');

    await expect(succeed()).resolves.toBe('ok');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('reopens (and restarts the cool-down) when the HALF_OPEN trial fails', async () => {
    await fail();
    await fail();
    await fail();
    now += 30_000;
    expect(breaker.getState()).toBe('HALF_OPEN');

    await fail();
    expect(breaker.getState()).toBe('OPEN');
    now += 29_999;
    expect(breaker.getState()).toBe('OPEN');
    now += 1;
    expect(breaker.getState()).toBe('HALF_OPEN');
  });

  it('lets only one trial request through while HALF_OPEN', async () => {
    await fail();
    await fail();
    await fail();
    now += 30_000;

    let release!: (v: string) => void;
    const slowTrial = breaker.execute(
      () => new Promise<string>((resolve) => (release = resolve)),
    );

    const second = jest.fn().mockResolvedValue('ok');
    await expect(breaker.execute(second)).rejects.toBeInstanceOf(
      CircuitOpenError,
    );
    expect(second).not.toHaveBeenCalled();

    release('done');
    await expect(slowTrial).resolves.toBe('done');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('does not count a 404 as a failure', async () => {
    for (let i = 0; i < 5; i++) {
      await breaker
        .execute(() => Promise.reject({ response: { status: 404 } }))
        .catch(() => undefined);
    }
    expect(breaker.getState()).toBe('CLOSED');
  });

  describe('isUpstreamFailure', () => {
    it('counts timeouts, 5xx, 429 and rate-limit 403s only', () => {
      expect(isUpstreamFailure(new Error('timeout of 10000ms exceeded'))).toBe(
        true,
      );
      expect(isUpstreamFailure({ response: { status: 500 } })).toBe(true);
      expect(isUpstreamFailure({ response: { status: 429 } })).toBe(true);
      expect(
        isUpstreamFailure({
          response: { status: 403, headers: { 'x-ratelimit-remaining': '0' } },
        }),
      ).toBe(true);
      expect(
        isUpstreamFailure({
          response: { status: 403, headers: { 'x-ratelimit-remaining': '42' } },
        }),
      ).toBe(false);
      expect(isUpstreamFailure({ response: { status: 404 } })).toBe(false);
      expect(isUpstreamFailure({ response: { status: 401 } })).toBe(false);
    });
  });
});
