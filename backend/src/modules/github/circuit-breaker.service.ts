import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { GITHUB_BREAKER_CONFIG } from './constants/cache.constants';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  cooldownMs: number;
  /** Injectable clock so tests never have to sleep. */
  now: () => number;
}

export const CIRCUIT_BREAKER_OPTIONS = 'GITHUB_CIRCUIT_BREAKER_OPTIONS';

export class CircuitOpenError extends Error {
  constructor() {
    super('GitHub circuit breaker is open');
    this.name = 'CircuitOpenError';
  }
}

/**
 * Decides whether an error means "GitHub is unhealthy" (and should count
 * towards tripping the breaker) or "GitHub answered, the request was just
 * not satisfiable" (404 for an unknown user and similar).
 *
 * Counts: no response (timeout / network), 5xx, 429 and a 403 that is a
 * rate-limit response (x-ratelimit-remaining: 0 or a rate limit message).
 */
export function isUpstreamFailure(error: any): boolean {
  if (!error) return false;
  // handleAxiosError tags the exceptions it builds from the raw axios error
  if (typeof error.breakerFailure === 'boolean') return error.breakerFailure;

  const status: number | undefined =
    error.response?.status ??
    (typeof error.getStatus === 'function' ? error.getStatus() : undefined);

  if (status === undefined) return true; // timeout, DNS, connection reset...
  if (status >= 500 || status === 429) return true;
  if (status === 403) {
    const remaining = error.response?.headers?.['x-ratelimit-remaining'];
    const message = String(error.response?.data?.message ?? '');
    return String(remaining) === '0' || /rate limit/i.test(message);
  }
  return false;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly options: CircuitBreakerOptions;
  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private openedAt = 0;
  private trialInFlight = false;

  constructor(
    @Optional()
    @Inject(CIRCUIT_BREAKER_OPTIONS)
    options?: Partial<CircuitBreakerOptions>,
  ) {
    this.options = {
      failureThreshold: GITHUB_BREAKER_CONFIG.FAILURE_THRESHOLD,
      cooldownMs: GITHUB_BREAKER_CONFIG.COOLDOWN_MS,
      now: () => Date.now(),
      ...options,
    };
  }

  getState(): CircuitState {
    this.refreshState();
    return this.state;
  }

  /** Read-only check: would a call be let through right now? */
  canAttempt(): boolean {
    this.refreshState();
    if (this.state === 'CLOSED') return true;
    if (this.state === 'HALF_OPEN') return !this.trialInFlight;
    return false;
  }

  /**
   * Asks permission to call GitHub. In HALF_OPEN only one trial request is
   * allowed through; everybody else is rejected until it reports back.
   */
  acquire(): void {
    if (!this.canAttempt()) throw new CircuitOpenError();
    if (this.state === 'HALF_OPEN') this.trialInFlight = true;
  }

  recordSuccess(): void {
    if (this.state !== 'CLOSED') {
      this.logger.log('GitHub circuit breaker closed again');
    }
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.trialInFlight = false;
  }

  recordFailure(): void {
    this.trialInFlight = false;
    if (this.state === 'HALF_OPEN') {
      this.trip();
      return;
    }
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.options.failureThreshold) {
      this.trip();
    }
  }

  private trip(): void {
    this.state = 'OPEN';
    this.openedAt = this.options.now();
    this.logger.warn(
      `GitHub circuit breaker OPEN for ${this.options.cooldownMs}ms after ${this.consecutiveFailures} consecutive failures`,
    );
  }

  private refreshState(): void {
    if (
      this.state === 'OPEN' &&
      this.options.now() - this.openedAt >= this.options.cooldownMs
    ) {
      this.state = 'HALF_OPEN';
      this.trialInFlight = false;
    }
  }

  /** Runs fn through the breaker. Non-upstream errors count as a healthy reply. */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.acquire();
    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      if (isUpstreamFailure(error)) {
        this.recordFailure();
      } else {
        // GitHub answered (e.g. 404): it is reachable, so release a trial
        this.recordSuccess();
      }
      throw error;
    }
  }
}
