import { Injectable, NestMiddleware, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SystemMetricsService } from '../services/system-metrics.service';

export enum TrafficPriorityTier {
  CRITICAL = 1, // Active Battle WebSockets / Live Battle Keystrokes & Submissions (Critical — never shed)
  HIGH = 2, // Authentication, Matchmaking Queue, Battle Join (High)
  NORMAL = 3, // Dashboard navigation, Profile, Leaderboards, Repositories (Normal)
  LOW = 4, // Avatar uploads, analytics queries, sync, exports (Low)
}

// Fair-share priority queuing thresholds
export const FAIR_SHARE_PRIORITY_TIERS = {
  TIER_1: 'Active 1v1 Battle',
  TIER_2: 'Code Submissions',
  TIER_3: 'Analytics & Profiles',
};

export interface LoadShedderStats {
  totalRequests: number;
  admittedRequests: number;
  shedRequests: number;
  shedByTier: Record<TrafficPriorityTier, number>;
  currentSystemHealth: 'GREEN' | 'YELLOW' | 'RED';
  eventLoopLagMs: number;
  cpuUsagePercent: number;
  heapUsagePercent: number;
  inFlightRequests: number;
  concurrencyLimit: number;
}

@Injectable()
export class LoadShedderMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoadShedderMiddleware.name);

  // Netflix CoDel (Controlled Delay) and Little's Law Concurrency Controller settings
  // When event loop lag exceeds 50ms, dynamically drop LOW priority requests
  // When event loop lag exceeds 100ms, escalate drop to NORMAL priority requests
  private readonly LOW_SHED_LAG_THRESHOLD_MS = 50; // > 50ms lag sheds LOW
  private readonly NORMAL_SHED_LAG_THRESHOLD_MS = 100; // > 100ms lag sheds NORMAL & LOW
  private readonly RETRY_AFTER_SECONDS = 30;

  // Little's Law Adaptive Concurrency Limiter: L = λ * W
  // Concurrency ceiling adapts between minConcurrency and maxConcurrency based on latency targets
  private inFlightRequests = 0;
  private concurrencyLimit = 100; // Baseline concurrent capacity
  private minConcurrency = 10;
  private maxConcurrency = 500;

  // Moving average response time tracking for Little's Law / CoDel target (50ms target)
  private averageLatencyMs = 20;

  // Stats tracking
  private totalRequests = 0;
  private admittedRequests = 0;
  private shedRequests = 0;
  private shedByTier: Record<TrafficPriorityTier, number> = {
    [TrafficPriorityTier.CRITICAL]: 0,
    [TrafficPriorityTier.HIGH]: 0,
    [TrafficPriorityTier.NORMAL]: 0,
    [TrafficPriorityTier.LOW]: 0,
  };

  constructor(private readonly systemMetrics: SystemMetricsService) {}

  /**
   * Classifies an incoming request into one of the 4 Traffic Priority Bands:
   * - CRITICAL: Active Battle WebSockets, keystrokes, and code submissions (Never shed)
   * - HIGH: Authentication, Password Reset, Matchmaking Entry (High)
   * - NORMAL: Dashboard navigation, Profile views, Leaderboards, Repositories (Normal)
   * - LOW: Avatar uploads, analytics queries, GitHub background sync, reports (Low)
   */
  classifyRequestPriority(req: Request): TrafficPriorityTier {
    const url = req.originalUrl || req.url || '';
    const path = url.toLowerCase();
    const upgradeHeader = req.headers['upgrade'];

    // 1. CRITICAL: WebSocket Upgrade or Critical live battle pathways (keystrokes, submissions)
    if (
      upgradeHeader === 'websocket' ||
      path.includes('/battles/live') ||
      path.includes('/battles/action') ||
      path.includes('/battles/submit') ||
      path.includes('/battles/keystroke') ||
      path.includes('/execution')
    ) {
      return TrafficPriorityTier.CRITICAL;
    }

    // 2. HIGH: Authentication, Tokens, Matchmaking queue, Join battle
    if (
      path.includes('/auth') ||
      path.includes('/login') ||
      path.includes('/signup') ||
      path.includes('/battles/matchmaking') ||
      path.includes('/battles/join')
    ) {
      return TrafficPriorityTier.HIGH;
    }

    // 3. LOW: Avatar uploads, heavy analytics queries, background sync, data exports, inspector, reports
    if (
      path.includes('/sync') ||
      path.includes('/analytics') ||
      path.includes('/reports') ||
      path.includes('/export') ||
      path.includes('/upload') ||
      path.includes('/avatar') ||
      path.includes('/repository-inspector')
    ) {
      return TrafficPriorityTier.LOW;
    }

    // 4. NORMAL: Default User-facing dashboard navigation (Profiles, Leaderboards, Challenges, Repositories)
    return TrafficPriorityTier.NORMAL;
  }

  use(req: Request, res: Response, next: NextFunction): void {
    this.totalRequests++;

    const lagMs = this.systemMetrics.getEventLoopLagMs();
    const cpuPercent = this.systemMetrics.getCpuUsagePercent();
    const heapPercent = this.systemMetrics.getHeapUsagePercent();
    const priority = this.classifyRequestPriority(req);

    // Rule 1: CRITICAL (battle keystrokes/submissions/websockets) is NEVER shed under any circumstances
    if (priority === TrafficPriorityTier.CRITICAL) {
      this.admit(req, res, next);
      return;
    }

    // Rule 2: If Event Loop Delay > 100ms or CPU > 90% or Heap > 90%, shed NORMAL & LOW
    if (
      lagMs >= this.NORMAL_SHED_LAG_THRESHOLD_MS ||
      cpuPercent >= 90 ||
      heapPercent >= 90
    ) {
      if (
        priority === TrafficPriorityTier.NORMAL ||
        priority === TrafficPriorityTier.LOW
      ) {
        return this.shedTraffic(res, priority, lagMs, 'Critical server saturation (lag >= 100ms or resource exhaustion)');
      }
    }

    // Rule 3: If Event Loop Delay > 50ms or CPU > 75% or Heap > 80%, shed LOW priority requests
    if (
      lagMs >= this.LOW_SHED_LAG_THRESHOLD_MS ||
      cpuPercent >= 75 ||
      heapPercent >= 80
    ) {
      if (priority === TrafficPriorityTier.LOW) {
        return this.shedTraffic(res, priority, lagMs, 'Elevated event loop lag (lag >= 50ms)');
      }
    }

    // Rule 4: Little's Law & Concurrency Limit check
    // If in-flight requests exceed dynamically calculated concurrency limit, shed non-critical requests
    if (this.inFlightRequests >= this.concurrencyLimit) {
      if (priority === TrafficPriorityTier.LOW || priority === TrafficPriorityTier.NORMAL) {
        return this.shedTraffic(
          res,
          priority,
          lagMs,
          `Concurrency limit reached (${this.inFlightRequests}/${this.concurrencyLimit})`,
        );
      }
    }

    // Admitted request (healthy state or high-priority request)
    this.admit(req, res, next);
  }

  private admit(req: Request, res: Response, next: NextFunction): void {
    this.admittedRequests++;
    this.inFlightRequests++;
    const startTime = Date.now();

    const onFinish = () => {
      res.removeListener('finish', onFinish);
      res.removeListener('close', onFinish);

      this.inFlightRequests = Math.max(0, this.inFlightRequests - 1);
      const latency = Date.now() - startTime;

      // Update moving average latency
      this.averageLatencyMs = this.averageLatencyMs * 0.9 + latency * 0.1;

      // Little's Law / CoDel adjustment:
      // If average latency < 50ms, cautiously increase concurrency capacity
      // If average latency > 50ms, back off concurrency capacity
      if (this.averageLatencyMs < 50 && this.concurrencyLimit < this.maxConcurrency) {
        this.concurrencyLimit += 1;
      } else if (this.averageLatencyMs > 50 && this.concurrencyLimit > this.minConcurrency) {
        this.concurrencyLimit = Math.max(this.minConcurrency, Math.floor(this.concurrencyLimit * 0.95));
      }
    };

    res.on('finish', onFinish);
    res.on('close', onFinish);

    next();
  }

  private shedTraffic(
    res: Response,
    tier: TrafficPriorityTier,
    lagMs: number,
    reason: string,
  ): void {
    this.shedRequests++;
    this.shedByTier[tier]++;

    this.logger.warn(
      `[Load Shedder] Shedding Priority Tier ${tier} request! Reason: ${reason}. Event loop lag: ${lagMs}ms (Thresholds: Low >= ${this.LOW_SHED_LAG_THRESHOLD_MS}ms, Normal >= ${this.NORMAL_SHED_LAG_THRESHOLD_MS}ms)`,
    );

    res.setHeader('Retry-After', this.RETRY_AFTER_SECONDS);
    res.setHeader('X-Load-Shed-Tier', tier);
    res.setHeader('X-Event-Loop-Lag-Ms', lagMs);

    res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      error: 'Service Unavailable',
      message:
        'Server is experiencing a high-traffic surge. Non-critical traffic temporarily shed to protect active live battles.',
      priorityTier: tier,
      eventLoopLagMs: lagMs,
      retryAfterSeconds: this.RETRY_AFTER_SECONDS,
      reason,
    });
  }

  /**
   * Returns stats regarding total admitted vs shed requests.
   */
  getStats(): LoadShedderStats {
    const lagMs = this.systemMetrics.getEventLoopLagMs();
    const cpuUsagePercent = this.systemMetrics.getCpuUsagePercent();
    const heapUsagePercent = this.systemMetrics.getHeapUsagePercent();

    let currentSystemHealth: LoadShedderStats['currentSystemHealth'] = 'GREEN';

    if (
      lagMs >= this.NORMAL_SHED_LAG_THRESHOLD_MS ||
      cpuUsagePercent >= 90 ||
      heapUsagePercent >= 90
    ) {
      currentSystemHealth = 'RED';
    } else if (
      lagMs >= this.LOW_SHED_LAG_THRESHOLD_MS ||
      cpuUsagePercent >= 75 ||
      heapUsagePercent >= 80
    ) {
      currentSystemHealth = 'YELLOW';
    }

    return {
      totalRequests: this.totalRequests,
      admittedRequests: this.admittedRequests,
      shedRequests: this.shedRequests,
      shedByTier: { ...this.shedByTier },
      currentSystemHealth,
      eventLoopLagMs: lagMs,
      cpuUsagePercent,
      heapUsagePercent,
      inFlightRequests: this.inFlightRequests,
      concurrencyLimit: this.concurrencyLimit,
    };
  }

  /**
   * Test helper to set concurrency limit and in-flight count
   */
  public setConcurrencyForTest(limit: number, inFlight = 0): void {
    this.concurrencyLimit = limit;
    this.inFlightRequests = inFlight;
  }
}
