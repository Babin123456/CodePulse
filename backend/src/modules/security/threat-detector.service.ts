import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { createHash } from 'crypto';
import { performance } from 'node:perf_hooks';
import Redis from 'ioredis';
import { PowService } from './pow.service';

export type ThreatAction = 'ALLOW' | 'CHALLENGE' | 'QUARANTINE';

// Automated step-up challenge threshold configuration
export const STEP_UP_RISK_THRESHOLD = 75;

export type ThreatVectorCategory =
  | 'NORMAL'
  | 'PATH_TRAVERSAL'
  | 'PARAMETER_INJECTION'
  | 'API_FUZZING'
  | 'CREDENTIAL_SCRAPING'
  | 'PAYLOAD_ANOMALY'
  | 'VELOCITY_BURST';

export interface BehavioralFeatureVector {
  payloadSizeBytes: number;
  parameterCount: number;
  maxNestingDepth: number;
  pathTraversalDepth: number;
  userAgentEntropy: number;
  requestBurstFrequency: number;
  uniqueEndpointRatio: number;
  injectionTokenDensity: number;
  headerCount: number;
  headerAnomalyScore: number;
  urlLength: number;
  nonAlphanumericPathRatio: number;
}

export interface RequestTelemetryInput {
  ip: string;
  userId?: string;
  method: string;
  path: string;
  query?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  timestampMs?: number;
}

export interface ThreatAssessmentResult {
  anomalyScore: number;
  isolationForestScore: number;
  zScoreComposite: number;
  heuristicRiskScore: number;
  action: ThreatAction;
  primaryVector: ThreatVectorCategory;
  detectedVectors: ThreatVectorCategory[];
  features: BehavioralFeatureVector;
  powChallenge?: {
    challenge: string;
    challengeId: string;
    difficulty: number;
    targetPrefix: string;
    expiresAt: number;
  };
  quarantineExpiresAt?: number;
  evaluationTimeMs: number;
}

export interface QuarantinedIpRecord {
  ip: string;
  reason: string;
  anomalyScore: number;
  vector: ThreatVectorCategory;
  quarantinedAt: string;
  expiresAt: string;
  expiresAtMs: number;
}

export interface ThreatEventRecord {
  id: string;
  timestamp: string;
  ip: string;
  userId?: string;
  method: string;
  path: string;
  anomalyScore: number;
  action: ThreatAction;
  primaryVector: ThreatVectorCategory;
  detectedVectors: ThreatVectorCategory[];
  features: BehavioralFeatureVector;
}

export interface ThreatTelemetryDashboard {
  summary: {
    totalEvaluated: number;
    allowedCount: number;
    challengedCount: number;
    quarantinedCount: number;
    activeQuarantinedIps: number;
    averageEvaluationMs: number;
    discordAlertsSent: number;
  };
  vectorBreakdown: Record<ThreatVectorCategory, number>;
  activeQuarantines: QuarantinedIpRecord[];
  recentHighRiskEvents: ThreatEventRecord[];
  topOffendingIps: Array<{
    ip: string;
    requestCount: number;
    maxScore: number;
    lastVector: ThreatVectorCategory;
  }>;
}

export interface ThreatRedisLike {
  status?: string;
  zadd(key: string, score: number, member: string): Promise<number>;
  zremrangebyscore(
    key: string,
    min: number | string,
    max: number | string,
  ): Promise<number>;
  zcard(key: string): Promise<number>;
  zrange(key: string, start: number, stop: number): Promise<string[]>;
  expire(key: string, seconds: number): Promise<number>;
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    expiryMode: 'EX',
    ttlSeconds: number,
  ): Promise<'OK' | null>;
  del(key: string): Promise<number>;
  disconnect(): void;
}

interface IsolationTreeNode {
  splitFeatureIdx?: number;
  splitValue?: number;
  left?: IsolationTreeNode;
  right?: IsolationTreeNode;
  size: number;
}

interface WelfordMetricState {
  count: number;
  mean: number;
  m2: number;
}

const FEATURE_KEYS: Array<keyof BehavioralFeatureVector> = [
  'payloadSizeBytes',
  'parameterCount',
  'maxNestingDepth',
  'pathTraversalDepth',
  'userAgentEntropy',
  'requestBurstFrequency',
  'uniqueEndpointRatio',
  'injectionTokenDensity',
  'headerCount',
  'headerAnomalyScore',
  'urlLength',
  'nonAlphanumericPathRatio',
];

// Baseline normal traffic centroid & scale for 12 behavioral features
const BASELINE_FEATURE_STATS: Array<{ mean: number; std: number }> = [
  { mean: 512, std: 1024 }, // payloadSizeBytes
  { mean: 3, std: 4 }, // parameterCount
  { mean: 2, std: 1.5 }, // maxNestingDepth
  { mean: 0, std: 0.25 }, // pathTraversalDepth
  { mean: 4.15, std: 0.45 }, // userAgentEntropy (typical browser UA Shannon entropy ~3.8-4.6)
  { mean: 4, std: 5 }, // requestBurstFrequency (req / 60s window)
  { mean: 0.35, std: 0.25 }, // uniqueEndpointRatio
  { mean: 0, std: 0.02 }, // injectionTokenDensity
  { mean: 10, std: 4 }, // headerCount
  { mean: 0.05, std: 0.1 }, // headerAnomalyScore
  { mean: 36, std: 24 }, // urlLength
  { mean: 0.08, std: 0.06 }, // nonAlphanumericPathRatio
];

const PATH_TRAVERSAL_REGEX =
  /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\.\.%2f|%252e%252e|\/etc\/passwd|\/proc\/self|win\.ini|boot\.ini)/gi;

const INJECTION_TOKEN_REGEX =
  /(\bunion\s+select\b|\bselect\b.+\bfrom\b|\bdrop\s+table\b|\bor\s+1\s*=\s*1\b|'\s*or\s*'|<script\b|javascript:|onerror\s*=|onload\s*=|\$\{jndi:|\$ne\b|\$gt\b|\$where\b|;\s*(?:cat|ls|id|whoami|curl|wget|bash|sh)\b|`[^`]+`|\$\([^)]+\))/gi;

const FUZZER_UA_REGEX =
  /(sqlmap|nikto|nmap|masscan|gobuster|dirbuster|wfuzz|ffuf|hydra|burpsuite|zaproxy|nuclei|acunetix|python-requests|go-http-client|curl\/|libwww-perl)/i;

@Injectable()
export class ThreatDetectorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ThreatDetectorService.name);
  private readonly slidingWindowMs = 60_000;
  private readonly quarantineTtlSeconds = 900; // 15 minutes
  private readonly challengeThreshold = 75;
  private readonly quarantineThreshold = 90;
  private readonly maxStoredEvents = 200;
  private readonly disableRedis: boolean;

  private discordWebhookUrl?: string;
  private redisClient: ThreatRedisLike | null = null;
  private readonly forest: IsolationTreeNode[] = [];
  private readonly forestSubsampleSize = 64;
  private readonly welfordStats: WelfordMetricState[] =
    BASELINE_FEATURE_STATS.map((b) => ({
      count: 100,
      mean: b.mean,
      m2: b.std * b.std * 99,
    }));

  // In-memory sliding window fallback & telemetry buffers
  private readonly ipWindowFallback = new Map<
    string,
    Array<{ ts: number; path: string }>
  >();
  private readonly userWindowFallback = new Map<
    string,
    Array<{ ts: number; path: string }>
  >();
  private readonly quarantineFallback = new Map<string, QuarantinedIpRecord>();
  private readonly recentEvents: ThreatEventRecord[] = [];
  private readonly ipStats = new Map<
    string,
    { requestCount: number; maxScore: number; lastVector: ThreatVectorCategory }
  >();
  private readonly discordClusterCooldown = new Map<string, number>();

  private totalEvaluated = 0;
  private allowedCount = 0;
  private challengedCount = 0;
  private quarantinedCount = 0;
  private totalEvalLatencyMs = 0;
  private discordAlertsSent = 0;

  private readonly vectorCounts: Record<ThreatVectorCategory, number> = {
    NORMAL: 0,
    PATH_TRAVERSAL: 0,
    PARAMETER_INJECTION: 0,
    API_FUZZING: 0,
    CREDENTIAL_SCRAPING: 0,
    PAYLOAD_ANOMALY: 0,
    VELOCITY_BURST: 0,
  };

  constructor(
    @Optional() private readonly powService?: PowService,
    @Optional() private readonly configService?: ConfigService,
    @Optional()
    options?: {
      discordWebhookUrl?: string;
      disableRedis?: boolean;
    },
  ) {
    this.discordWebhookUrl =
      options?.discordWebhookUrl ??
      this.configService?.get<string>('DISCORD_SECURITY_WEBHOOK_URL') ??
      process.env.DISCORD_SECURITY_WEBHOOK_URL ??
      process.env.DISCORD_BATTLE_WEBHOOK_URL;

    this.disableRedis =
      options?.disableRedis ?? process.env.NODE_ENV === 'test';

    this.trainBaselineIsolationForest();
  }

  onModuleInit(): void {
    if (this.disableRedis) {
      return;
    }

    const host =
      this.configService?.get<string>('REDIS_HOST') ||
      process.env.REDIS_HOST ||
      'localhost';
    const port = parseInt(
      this.configService?.get<string>('REDIS_PORT') ||
        process.env.REDIS_PORT ||
        '6379',
      10,
    );
    const password =
      this.configService?.get<string>('REDIS_PASSWORD') ||
      process.env.REDIS_PASSWORD ||
      undefined;

    try {
      const client = new Redis({
        host,
        port,
        password,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 1000,
        enableOfflineQueue: false,
        retryStrategy: () => null,
      });

      client.on('error', () => {
        this.redisClient = null;
      });

      client
        .connect()
        .then(() => {
          this.redisClient = client as unknown as ThreatRedisLike;
        })
        .catch(() => {
          this.logger.warn(
            'Redis unavailable for ThreatDetectorService; using in-memory sliding windows.',
          );
          this.redisClient = null;
        });
    } catch {
      this.redisClient = null;
    }
  }

  onModuleDestroy(): void {
    if (this.redisClient) {
      try {
        this.redisClient.disconnect();
      } catch {
        // Ignore disconnect errors on shutdown
      }
      this.redisClient = null;
    }
  }

  setRedisClient(client: ThreatRedisLike | null): void {
    this.redisClient = client;
  }

  setDiscordWebhookUrl(url: string | undefined): void {
    this.discordWebhookUrl = url;
  }

  /**
   * Trains a deterministic 24-tree Isolation Forest over synthetic normal API telemetry
   * so out-of-distribution behavioral vectors isolate at shallow tree depths in <0.1ms.
   */
  private trainBaselineIsolationForest(): void {
    this.forest.length = 0;
    let seed = 0x5f3759df;
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    const nextGaussian = () => {
      const u1 = Math.max(1e-7, nextRand());
      const u2 = nextRand();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };

    const numTrees = 24;
    const maxDepth = Math.ceil(Math.log2(this.forestSubsampleSize));

    for (let t = 0; t < numTrees; t++) {
      const sample: number[][] = [];
      for (let i = 0; i < this.forestSubsampleSize; i++) {
        sample.push(
          BASELINE_FEATURE_STATS.map((stat) =>
            Math.max(0, stat.mean + nextGaussian() * stat.std),
          ),
        );
      }
      this.forest.push(this.buildIsolationTree(sample, 0, maxDepth, nextRand));
    }
  }

  private buildIsolationTree(
    data: number[][],
    depth: number,
    maxDepth: number,
    rand: () => number,
  ): IsolationTreeNode {
    if (depth >= maxDepth || data.length <= 1) {
      return { size: data.length };
    }

    const numFeatures = FEATURE_KEYS.length;
    const featureIdx = Math.floor(rand() * numFeatures);
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const row of data) {
      const v = row[featureIdx];
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }

    if (maxVal - minVal <= 1e-9) {
      return { size: data.length };
    }

    const splitValue = minVal + rand() * (maxVal - minVal);
    const leftData: number[][] = [];
    const rightData: number[][] = [];
    for (const row of data) {
      if (row[featureIdx] < splitValue) {
        leftData.push(row);
      } else {
        rightData.push(row);
      }
    }

    if (leftData.length === 0 || rightData.length === 0) {
      return { size: data.length };
    }

    return {
      splitFeatureIdx: featureIdx,
      splitValue,
      left: this.buildIsolationTree(leftData, depth + 1, maxDepth, rand),
      right: this.buildIsolationTree(rightData, depth + 1, maxDepth, rand),
      size: data.length,
    };
  }

  private scoreIsolationForest(vector: number[]): number {
    if (this.forest.length === 0) return 0;

    let totalPathLen = 0;
    for (const tree of this.forest) {
      totalPathLen += this.computePathLength(vector, tree, 0);
    }
    const avgPathLen = totalPathLen / this.forest.length;
    const cFactor = averageUnSuccessfulBstPath(this.forestSubsampleSize);
    const anomalyRaw = Math.pow(2, -avgPathLen / cFactor);

    // Map Isolation Forest score [0.42 .. 0.85] -> [0 .. 100]
    const normalized = ((anomalyRaw - 0.44) / 0.36) * 100;
    return clamp(normalized, 0, 100);
  }

  private computePathLength(
    vector: number[],
    node: IsolationTreeNode,
    depth: number,
  ): number {
    if (
      node.splitFeatureIdx === undefined ||
      node.splitValue === undefined ||
      !node.left ||
      !node.right
    ) {
      return depth + averageUnSuccessfulBstPath(node.size);
    }

    if (vector[node.splitFeatureIdx] < node.splitValue) {
      return this.computePathLength(vector, node.left, depth + 1);
    }
    return this.computePathLength(vector, node.right, depth + 1);
  }

  private computeCompositeZScore(vector: number[]): number {
    let sumSquaredPositiveZ = 0;
    let maxZ = 0;

    for (let i = 0; i < vector.length; i++) {
      const stat = this.welfordStats[i];
      const variance = stat.count > 1 ? stat.m2 / (stat.count - 1) : 1;
      const std = Math.max(Math.sqrt(variance), 1e-3);
      // One-sided or symmetric Z-score (for UA entropy, both very low and very high are anomalous)
      const rawZ =
        i === 4
          ? Math.abs(vector[i] - stat.mean) / std
          : Math.max(0, (vector[i] - stat.mean) / std);

      const cappedZ = Math.min(rawZ, 12);
      if (cappedZ > maxZ) maxZ = cappedZ;
      if (cappedZ > 2.0) {
        sumSquaredPositiveZ += (cappedZ - 2.0) * (cappedZ - 2.0);
      }
    }

    const rmsExceedance = Math.sqrt(sumSquaredPositiveZ / vector.length);
    const score = rmsExceedance * 22 + Math.max(0, maxZ - 2.5) * 6.5;
    return clamp(score, 0, 100);
  }

  private updateOnlineBaseline(vector: number[]): void {
    for (let i = 0; i < vector.length; i++) {
      const stat = this.welfordStats[i];
      stat.count += 1;
      const delta = vector[i] - stat.mean;
      stat.mean += delta / stat.count;
      const delta2 = vector[i] - stat.mean;
      stat.m2 += delta * delta2;
    }
  }

  /**
   * Extracts 12 behavioral features from an HTTP request and sliding window history.
   */
  extractFeatures(
    input: RequestTelemetryInput,
    windowContext: { requestCount: number; uniqueEndpointCount: number },
  ): BehavioralFeatureVector {
    const rawPath = input.path || '/';
    let decodedPath = rawPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      decodedPath = rawPath;
    }

    const queryObj = input.query ?? {};
    const bodyObj = input.body;
    const serializedBody =
      bodyObj === undefined || bodyObj === null
        ? ''
        : typeof bodyObj === 'string'
          ? bodyObj
          : safeJsonStringify(bodyObj);
    const serializedQuery = safeJsonStringify(queryObj);

    const payloadSizeBytes =
      Buffer.byteLength(serializedBody, 'utf8') +
      Buffer.byteLength(serializedQuery, 'utf8');

    const queryParamCount = Object.keys(queryObj).length;
    const bodyParamCount = countParameters(bodyObj);
    const parameterCount = queryParamCount + bodyParamCount;
    const maxNestingDepth = Math.max(
      measureNestingDepth(queryObj),
      measureNestingDepth(bodyObj),
    );

    // Count directory traversal segments (`../`, `..\\`, URL-encoded variants, sensitive system paths)
    const traversalMatches = `${rawPath} ${decodedPath}`.match(
      PATH_TRAVERSAL_REGEX,
    );
    const dotDotSegments = (decodedPath.match(/\.\./g) || []).length;
    const pathTraversalDepth = Math.max(
      traversalMatches ? traversalMatches.length : 0,
      dotDotSegments,
    );

    const headers = normalizeHeaders(input.headers);
    const userAgent = headers['user-agent'] || '';
    const userAgentEntropy = calculateShannonEntropy(userAgent);

    const requestBurstFrequency = Math.max(1, windowContext.requestCount);
    const uniqueEndpointRatio =
      requestBurstFrequency > 1
        ? windowContext.uniqueEndpointCount / requestBurstFrequency
        : 0.35;

    const combinedInspectText = `${decodedPath} ${serializedQuery} ${serializedBody}`;
    const injectionMatches = combinedInspectText.match(INJECTION_TOKEN_REGEX);
    const injectionMatchCount = injectionMatches ? injectionMatches.length : 0;
    const tokenDenominator = Math.max(1, parameterCount + 1);
    const injectionTokenDensity = injectionMatchCount / tokenDenominator;

    const headerKeys = Object.keys(headers);
    const headerCount = headerKeys.length;
    let headerAnomalyScore = 0;
    if (!userAgent) headerAnomalyScore += 0.45;
    if (FUZZER_UA_REGEX.test(userAgent)) headerAnomalyScore += 0.65;
    if (!headers['accept'] && !headers['accept-language']) {
      headerAnomalyScore += 0.2;
    }
    if (headers['x-forwarded-for'] && headers['x-forwarded-for'].split(',').length > 4) {
      headerAnomalyScore += 0.25;
    }
    headerAnomalyScore = clamp(headerAnomalyScore, 0, 1.5);

    const urlLength = rawPath.length;
    const nonAlnumChars = (rawPath.match(/[^a-zA-Z0-9/_-]/g) || []).length;
    const nonAlphanumericPathRatio =
      urlLength > 0 ? nonAlnumChars / urlLength : 0;

    return {
      payloadSizeBytes,
      parameterCount,
      maxNestingDepth,
      pathTraversalDepth,
      userAgentEntropy,
      requestBurstFrequency,
      uniqueEndpointRatio,
      injectionTokenDensity,
      headerCount,
      headerAnomalyScore,
      urlLength,
      nonAlphanumericPathRatio,
    };
  }

  async evaluateRequest(
    input: RequestTelemetryInput,
  ): Promise<ThreatAssessmentResult> {
    const started = performance.now();
    const nowMs = input.timestampMs ?? Date.now();
    const ip = input.ip || '0.0.0.0';

    const existingQuarantine = await this.getActiveQuarantine(ip, nowMs);
    const windowContext = await this.recordAndGetWindowStats(
      ip,
      input.userId,
      input.path,
      nowMs,
    );

    const features = this.extractFeatures(input, windowContext);
    const featureArray = FEATURE_KEYS.map((k) => features[k]);

    const isolationForestScore = this.scoreIsolationForest(featureArray);
    const zScoreComposite = this.computeCompositeZScore(featureArray);
    const { heuristicScore, vectors } = this.evaluateThreatVectors(
      input,
      features,
    );

    // Hybrid ML + statistical + behavioral signature ensemble (0..100)
    const ensembleScore =
      isolationForestScore * 0.28 +
      zScoreComposite * 0.32 +
      heuristicScore * 0.4;
    const anomalyScore = Math.round(
      clamp(Math.max(ensembleScore, heuristicScore * 0.92), 0, 100),
    );

    const primaryVector: ThreatVectorCategory =
      vectors.length > 0 ? vectors[0] : 'NORMAL';
    const detectedVectors: ThreatVectorCategory[] =
      vectors.length > 0 ? vectors : ['NORMAL'];

    let action: ThreatAction = 'ALLOW';
    let quarantineExpiresAt: number | undefined;
    let powChallenge: ThreatAssessmentResult['powChallenge'];

    if (existingQuarantine || anomalyScore > this.quarantineThreshold) {
      action = 'QUARANTINE';
      const record =
        existingQuarantine ??
        (await this.quarantineIp(
          ip,
          anomalyScore,
          primaryVector,
          nowMs,
        ));
      quarantineExpiresAt = record.expiresAtMs;
    } else if (anomalyScore > this.challengeThreshold) {
      action = 'CHALLENGE';
      if (this.powService) {
        const issued = await this.powService.generateChallenge();
        powChallenge = {
          challenge: issued.challenge,
          challengeId: issued.challengeId,
          difficulty: issued.difficulty,
          targetPrefix: issued.targetPrefix,
          expiresAt: issued.expiresAt,
        };
      }
    } else if (anomalyScore < 35) {
      this.updateOnlineBaseline(featureArray);
    }

    const evaluationTimeMs = Number((performance.now() - started).toFixed(3));
    this.recordTelemetryMetrics(
      input,
      anomalyScore,
      action,
      primaryVector,
      detectedVectors,
      features,
      evaluationTimeMs,
    );

    if (action === 'QUARANTINE' || anomalyScore >= 85) {
      void this.maybeDispatchDiscordClusterAlert(
        ip,
        input.userId,
        anomalyScore,
        primaryVector,
        detectedVectors,
        input.path,
        nowMs,
      );
    }

    return {
      anomalyScore,
      isolationForestScore: Math.round(isolationForestScore),
      zScoreComposite: Math.round(zScoreComposite),
      heuristicRiskScore: Math.round(heuristicScore),
      action,
      primaryVector,
      detectedVectors,
      features,
      powChallenge,
      quarantineExpiresAt,
      evaluationTimeMs,
    };
  }

  private evaluateThreatVectors(
    input: RequestTelemetryInput,
    f: BehavioralFeatureVector,
  ): { heuristicScore: number; vectors: ThreatVectorCategory[] } {
    const scoredVectors: Array<{
      category: ThreatVectorCategory;
      score: number;
    }> = [];

    if (f.pathTraversalDepth >= 1) {
      const score = clamp(68 + f.pathTraversalDepth * 16, 0, 100);
      scoredVectors.push({ category: 'PATH_TRAVERSAL', score });
    }

    if (f.injectionTokenDensity > 0) {
      const score = clamp(65 + f.injectionTokenDensity * 45, 0, 100);
      scoredVectors.push({ category: 'PARAMETER_INJECTION', score });
    }

    if (
      (f.requestBurstFrequency >= 15 && f.uniqueEndpointRatio >= 0.7) ||
      f.headerAnomalyScore >= 0.85 ||
      (f.nonAlphanumericPathRatio > 0.35 && f.urlLength > 80)
    ) {
      const score = clamp(
        45 +
          f.requestBurstFrequency * 1.4 +
          f.uniqueEndpointRatio * 30 +
          f.headerAnomalyScore * 20,
        0,
        100,
      );
      scoredVectors.push({ category: 'API_FUZZING', score });
    }

    const isAuthPath = /\/(auth|login|signin|password|token)/i.test(
      input.path || '',
    );
    if (isAuthPath && f.requestBurstFrequency >= 12) {
      const score = clamp(55 + f.requestBurstFrequency * 2.1, 0, 100);
      scoredVectors.push({ category: 'CREDENTIAL_SCRAPING', score });
    }

    if (
      f.payloadSizeBytes > 65_536 ||
      f.parameterCount > 40 ||
      f.maxNestingDepth > 10
    ) {
      const score = clamp(
        50 +
          Math.min(30, f.payloadSizeBytes / 10_000) +
          Math.max(0, f.parameterCount - 20) * 0.8 +
          Math.max(0, f.maxNestingDepth - 6) * 4,
        0,
        100,
      );
      scoredVectors.push({ category: 'PAYLOAD_ANOMALY', score });
    }

    if (f.requestBurstFrequency >= 35) {
      const score = clamp(50 + (f.requestBurstFrequency - 25) * 1.5, 0, 100);
      scoredVectors.push({ category: 'VELOCITY_BURST', score });
    }

    scoredVectors.sort((a, b) => b.score - a.score);
    const heuristicScore =
      scoredVectors.length > 0 ? scoredVectors[0].score : 0;

    return {
      heuristicScore,
      vectors: scoredVectors.map((v) => v.category),
    };
  }

  private async recordAndGetWindowStats(
    ip: string,
    userId: string | undefined,
    path: string,
    nowMs: number,
  ): Promise<{ requestCount: number; uniqueEndpointCount: number }> {
    const minScore = nowMs - this.slidingWindowMs;
    const member = `${nowMs}:${createHash('sha1').update(`${path}:${Math.random()}`).digest('hex').slice(0, 8)}:${path}`;

    if (this.redisClient) {
      try {
        const ipKey = `threat:win:ip:${ip}`;
        await this.redisClient.zadd(ipKey, nowMs, member);
        await this.redisClient.zremrangebyscore(ipKey, 0, minScore);
        await this.redisClient.expire(ipKey, 120);
        const members = await this.redisClient.zrange(ipKey, 0, -1);

        if (userId) {
          const userKey = `threat:win:user:${userId}`;
          await this.redisClient.zadd(userKey, nowMs, member);
          await this.redisClient.zremrangebyscore(userKey, 0, minScore);
          await this.redisClient.expire(userKey, 120);
        }

        const uniquePaths = new Set<string>();
        for (const item of members) {
          const idx = item.indexOf(':', item.indexOf(':') + 1);
          uniquePaths.add(idx !== -1 ? item.slice(idx + 1) : item);
        }

        return {
          requestCount: members.length,
          uniqueEndpointCount: uniquePaths.size,
        };
      } catch {
        // Fall through to in-memory sliding window
      }
    }

    const ipEntries = (this.ipWindowFallback.get(ip) ?? []).filter(
      (e) => e.ts > minScore,
    );
    ipEntries.push({ ts: nowMs, path });
    this.ipWindowFallback.set(ip, ipEntries);

    if (userId) {
      const userEntries = (this.userWindowFallback.get(userId) ?? []).filter(
        (e) => e.ts > minScore,
      );
      userEntries.push({ ts: nowMs, path });
      this.userWindowFallback.set(userId, userEntries);
    }

    const uniquePaths = new Set(ipEntries.map((e) => e.path));
    return {
      requestCount: ipEntries.length,
      uniqueEndpointCount: uniquePaths.size,
    };
  }

  async isIpQuarantined(ip: string, nowMs = Date.now()): Promise<boolean> {
    const rec = await this.getActiveQuarantine(ip, nowMs);
    return rec !== null;
  }

  async getActiveQuarantine(
    ip: string,
    nowMs = Date.now(),
  ): Promise<QuarantinedIpRecord | null> {
    const key = `threat:quarantine:ip:${ip}`;
    if (this.redisClient) {
      try {
        const raw = await this.redisClient.get(key);
        if (raw) {
          const parsed = JSON.parse(raw) as QuarantinedIpRecord;
          if (parsed.expiresAtMs > nowMs) {
            return parsed;
          }
          await this.redisClient.del(key);
        }
      } catch {
        // Fall through to local map
      }
    }

    const local = this.quarantineFallback.get(ip);
    if (!local) return null;
    if (local.expiresAtMs <= nowMs) {
      this.quarantineFallback.delete(ip);
      return null;
    }
    return local;
  }

  async quarantineIp(
    ip: string,
    anomalyScore: number,
    vector: ThreatVectorCategory,
    nowMs = Date.now(),
    ttlSeconds = this.quarantineTtlSeconds,
  ): Promise<QuarantinedIpRecord> {
    const expiresAtMs = nowMs + ttlSeconds * 1000;
    const record: QuarantinedIpRecord = {
      ip,
      reason: `ML Anomaly Score ${anomalyScore}/100 (${vector})`,
      anomalyScore,
      vector,
      quarantinedAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
      expiresAtMs,
    };

    this.quarantineFallback.set(ip, record);
    if (this.redisClient) {
      try {
        await this.redisClient.set(
          `threat:quarantine:ip:${ip}`,
          JSON.stringify(record),
          'EX',
          ttlSeconds,
        );
      } catch {
        // Ignore Redis write failure
      }
    }

    return record;
  }

  async releaseQuarantine(ip: string): Promise<boolean> {
    const existed = this.quarantineFallback.delete(ip);
    if (this.redisClient) {
      try {
        await this.redisClient.del(`threat:quarantine:ip:${ip}`);
      } catch {
        // Ignore Redis delete failure
      }
    }
    return existed;
  }

  private recordTelemetryMetrics(
    input: RequestTelemetryInput,
    anomalyScore: number,
    action: ThreatAction,
    primaryVector: ThreatVectorCategory,
    detectedVectors: ThreatVectorCategory[],
    features: BehavioralFeatureVector,
    evaluationTimeMs: number,
  ): void {
    this.totalEvaluated += 1;
    this.totalEvalLatencyMs += evaluationTimeMs;
    this.vectorCounts[primaryVector] += 1;

    if (action === 'ALLOW') this.allowedCount += 1;
    else if (action === 'CHALLENGE') this.challengedCount += 1;
    else this.quarantinedCount += 1;

    const ip = input.ip || '0.0.0.0';
    const existingIp = this.ipStats.get(ip);
    if (existingIp) {
      existingIp.requestCount += 1;
      if (anomalyScore >= existingIp.maxScore) {
        existingIp.maxScore = anomalyScore;
        existingIp.lastVector = primaryVector;
      }
    } else {
      this.ipStats.set(ip, {
        requestCount: 1,
        maxScore: anomalyScore,
        lastVector: primaryVector,
      });
    }

    if (anomalyScore >= 50 || action !== 'ALLOW') {
      this.recentEvents.unshift({
        id: createHash('sha1')
          .update(`${ip}:${Date.now()}:${Math.random()}`)
          .digest('hex')
          .slice(0, 12),
        timestamp: new Date(input.timestampMs ?? Date.now()).toISOString(),
        ip,
        userId: input.userId,
        method: input.method,
        path: input.path,
        anomalyScore,
        action,
        primaryVector,
        detectedVectors,
        features,
      });
      if (this.recentEvents.length > this.maxStoredEvents) {
        this.recentEvents.length = this.maxStoredEvents;
      }
    }
  }

  async maybeDispatchDiscordClusterAlert(
    ip: string,
    userId: string | undefined,
    anomalyScore: number,
    primaryVector: ThreatVectorCategory,
    detectedVectors: ThreatVectorCategory[],
    path: string,
    nowMs = Date.now(),
  ): Promise<boolean> {
    if (!this.discordWebhookUrl) {
      return false;
    }

    const clusterKey = `${ip}:${primaryVector}`;
    const lastAlert = this.discordClusterCooldown.get(clusterKey) ?? 0;
    if (nowMs - lastAlert < 60_000) {
      return false;
    }
    this.discordClusterCooldown.set(clusterKey, nowMs);

    try {
      await axios.post(
        this.discordWebhookUrl,
        {
          username: 'CodePulse ML Threat Sentinel',
          embeds: [
            {
              title: `🚨 High-Severity API Threat Cluster Detected (${primaryVector})`,
              color: anomalyScore > 90 ? 0xdc2626 : 0xf59e0b,
              fields: [
                {
                  name: 'Anomaly Score',
                  value: `**${anomalyScore} / 100**`,
                  inline: true,
                },
                { name: 'Source IP', value: `\`${ip}\``, inline: true },
                {
                  name: 'Account ID',
                  value: userId ? `\`${userId}\`` : 'Anonymous',
                  inline: true,
                },
                { name: 'Target Endpoint', value: `\`${path}\``, inline: false },
                {
                  name: 'Detected Vectors',
                  value: detectedVectors.join(', '),
                  inline: false,
                },
              ],
              timestamp: new Date(nowMs).toISOString(),
            },
          ],
        },
        { timeout: 3000 },
      );
      this.discordAlertsSent += 1;
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to dispatch Discord threat alert: ${msg}`);
      return false;
    }
  }

  getThreatTelemetry(): ThreatTelemetryDashboard {
    const nowMs = Date.now();
    const activeQuarantines: QuarantinedIpRecord[] = [];
    for (const [ip, rec] of this.quarantineFallback.entries()) {
      if (rec.expiresAtMs > nowMs) {
        activeQuarantines.push(rec);
      } else {
        this.quarantineFallback.delete(ip);
      }
    }

    const topOffendingIps = Array.from(this.ipStats.entries())
      .map(([ip, stat]) => ({
        ip,
        requestCount: stat.requestCount,
        maxScore: stat.maxScore,
        lastVector: stat.lastVector,
      }))
      .sort((a, b) => b.maxScore - a.maxScore || b.requestCount - a.requestCount)
      .slice(0, 15);

    return {
      summary: {
        totalEvaluated: this.totalEvaluated,
        allowedCount: this.allowedCount,
        challengedCount: this.challengedCount,
        quarantinedCount: this.quarantinedCount,
        activeQuarantinedIps: activeQuarantines.length,
        averageEvaluationMs:
          this.totalEvaluated > 0
            ? Number(
                (this.totalEvalLatencyMs / this.totalEvaluated).toFixed(3),
              )
            : 0,
        discordAlertsSent: this.discordAlertsSent,
      },
      vectorBreakdown: { ...this.vectorCounts },
      activeQuarantines,
      recentHighRiskEvents: this.recentEvents.slice(0, 50),
      topOffendingIps,
    };
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function averageUnSuccessfulBstPath(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  const harmonic = Math.log(n - 1) + 0.5772156649;
  return 2 * harmonic - (2 * (n - 1)) / n;
}

export function calculateShannonEntropy(input: string): number {
  if (!input || input.length === 0) return 0;
  const freq = new Map<string, number>();
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  let entropy = 0;
  const len = input.length;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return Number(entropy.toFixed(4));
}

function safeJsonStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj) ?? '';
  } catch {
    return '';
  }
}

function countParameters(obj: unknown, depth = 0): number {
  if (depth > 8 || obj === null || obj === undefined) return 0;
  if (Array.isArray(obj)) {
    let total = obj.length;
    for (const item of obj.slice(0, 50)) {
      total += countParameters(item, depth + 1);
    }
    return total;
  }
  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>);
    let total = entries.length;
    for (const [, val] of entries.slice(0, 50)) {
      total += countParameters(val, depth + 1);
    }
    return total;
  }
  return 0;
}

function measureNestingDepth(obj: unknown, current = 0): number {
  if (current > 25 || obj === null || typeof obj !== 'object') {
    return current;
  }
  if (Array.isArray(obj)) {
    let maxD = current + 1;
    for (const item of obj.slice(0, 25)) {
      maxD = Math.max(maxD, measureNestingDepth(item, current + 1));
    }
    return maxD;
  }
  let maxD = current + 1;
  for (const val of Object.values(obj as Record<string, unknown>).slice(0, 25)) {
    maxD = Math.max(maxD, measureNestingDepth(val, current + 1));
  }
  return maxD;
}

function normalizeHeaders(
  headers?: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
  for (const [k, v] of Object.entries(headers)) {
    if (Array.isArray(v)) out[k.toLowerCase()] = v.join(', ');
    else if (typeof v === 'string') out[k.toLowerCase()] = v;
  }
  return out;
}
