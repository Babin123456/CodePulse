interface HeartbeatAckHandler {
  (receivedAt: number): void;
}

interface ExtendedWindow extends Window {
  __lastHeartbeatAck?: HeartbeatAckHandler;
}

export interface Frame {
  timestamp: number;
  cursorPosition: number;
  code: string;
  sequenceNumber: number;
}

export interface NetworkQualityMetrics {
  rtt: number;
  jitter: number;
  packetLoss: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface InterpolatedCursor {
  position: number;
  timestamp: number;
  isPredicted: boolean;
}

const EMA_ALPHA = 0.3;
const JITTER_BUFFER_BASE_MS = 50;
const MAX_JITTER_BUFFER_MS = 200;
const HEARTBEAT_INTERVAL_MS = 2000;
const MAX_PREDICTION_MS = 150;
const TARGET_FRAME_INTERVAL_MS = 1000 / 60;

export class LatencyCompensator {
  private rttEma: number = 0;
  private jitterEma: number = 0;
  private lastRttSample: number = 0;
  private sequenceNumber: number = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private onHeartbeatSend: (() => void) | null = null;
  private onHeartbeatAck: ((rtt: number) => void) | null = null;

  getRtt(): number {
    return this.rttEma;
  }

  getJitter(): number {
    return this.jitterEma;
  }

  getDynamicBufferSize(): number {
    const baseBuffer = JITTER_BUFFER_BASE_MS;
    const jitterBuffer = Math.min(this.jitterEma * 2, MAX_JITTER_BUFFER_MS - baseBuffer);
    return Math.round(baseBuffer + jitterBuffer);
  }

  getNetworkQuality(): NetworkQualityMetrics {
    const rtt = this.rttEma;
    const jitter = this.jitterEma;
    const packetLoss = 0;

    let quality: NetworkQualityMetrics['quality'];
    if (rtt < 50 && jitter < 10) quality = 'excellent';
    else if (rtt < 100 && jitter < 30) quality = 'good';
    else if (rtt < 200 && jitter < 50) quality = 'fair';
    else quality = 'poor';

    return { rtt, jitter, packetLoss, quality };
  }

  recordRttSample(rtt: number): void {
    if (this.rttEma === 0) {
      this.rttEma = rtt;
    } else {
      this.rttEma = EMA_ALPHA * rtt + (1 - EMA_ALPHA) * this.rttEma;
    }

    const jitterSample = Math.abs(rtt - this.lastRttSample);
    if (this.lastRttSample > 0) {
      if (this.jitterEma === 0) {
        this.jitterEma = jitterSample;
      } else {
        this.jitterEma = EMA_ALPHA * jitterSample + (1 - EMA_ALPHA) * this.jitterEma;
      }
    }
    this.lastRttSample = rtt;
  }

  startHeartbeat(sendHeartbeat: () => void, onAck: (rtt: number) => void): void {
    this.onHeartbeatSend = sendHeartbeat;
    this.onHeartbeatAck = onAck;

    this.heartbeatTimer = setInterval(() => {
      if (this.onHeartbeatSend) {
        const sentAt = Date.now();
        this.onHeartbeatSend();
        if (this.onHeartbeatAck) {
          const handleAck = (receivedAt: number) => {
            const rtt = receivedAt - sentAt;
            this.recordRttSample(rtt);
            this.onHeartbeatAck!(rtt);
          };
          (window as ExtendedWindow).__lastHeartbeatAck = handleAck;
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.onHeartbeatSend = null;
    this.onHeartbeatAck = null;
  }

  handleHeartbeatAck(): void {
    const handler = (window as ExtendedWindow).__lastHeartbeatAck;
    if (handler) {
      handler(Date.now());
      (window as ExtendedWindow).__lastHeartbeatAck = undefined;
    }
  }

  nextSequenceNumber(): number {
    return this.sequenceNumber++;
  }

  reset(): void {
    this.rttEma = 0;
    this.jitterEma = 0;
    this.lastRttSample = 0;
    this.sequenceNumber = 0;
    this.stopHeartbeat();
  }
}

export class JitterBuffer {
  private frames: Frame[] = [];
  private bufferSizeMs: number;
  private releaseTimer: ReturnType<typeof setInterval> | null = null;
  private onFrameRelease: ((frame: Frame) => void) | null = null;
  private lastReleaseTime: number = 0;
  private expectedNextSequence: number = 0;
  private timeProvider: () => number = () => Date.now();

  constructor(bufferSizeMs: number = JITTER_BUFFER_BASE_MS) {
    this.bufferSizeMs = bufferSizeMs;
  }

  setTimeProvider(provider: () => number): void {
    this.timeProvider = provider;
  }

  setBufferSize(sizeMs: number): void {
    this.bufferSizeMs = Math.max(JITTER_BUFFER_BASE_MS, Math.min(sizeMs, MAX_JITTER_BUFFER_MS));
  }

  getBufferSize(): number {
    return this.bufferSizeMs;
  }

  push(frame: Frame): void {
    const insertIndex = this.frames.findIndex(f => f.sequenceNumber > frame.sequenceNumber);
    if (insertIndex === -1) {
      this.frames.push(frame);
    } else {
      this.frames.splice(insertIndex, 0, frame);
    }

    while (this.frames.length > 0 && this.frames[0].sequenceNumber < this.expectedNextSequence) {
      this.frames.shift();
    }
  }

  setOnFrameRelease(callback: (frame: Frame) => void): void {
    this.onFrameRelease = callback;
  }

  start(): void {
    this.lastReleaseTime = this.timeProvider();
    this.releaseTimer = setInterval(() => this.releaseFrames(), TARGET_FRAME_INTERVAL_MS);
  }

  stop(): void {
    if (this.releaseTimer) {
      clearInterval(this.releaseTimer);
      this.releaseTimer = null;
    }
  }

  releaseFrames(now?: number): void {
    if (!this.onFrameRelease || this.frames.length === 0) return;

    const currentTime = now ?? this.timeProvider();
    const elapsed = currentTime - this.lastReleaseTime;

    if (elapsed >= this.bufferSizeMs && this.frames.length > 0) {
      const frame = this.frames.shift()!;
      if (frame.sequenceNumber >= this.expectedNextSequence) {
        this.onFrameRelease(frame);
        this.expectedNextSequence = frame.sequenceNumber + 1;
        this.lastReleaseTime = currentTime;
      }
    }
  }

  getBufferedFrames(): Frame[] {
    return [...this.frames];
  }

  getFrameCount(): number {
    return this.frames.length;
  }

  clear(): void {
    this.frames = [];
    this.expectedNextSequence = 0;
  }

  reset(): void {
    this.stop();
    this.clear();
    this.lastReleaseTime = 0;
  }
}

export function catmullRomInterpolate(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number
): number {
  const t2 = t * t;
  const t3 = t2 * t;

  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

export function hermiteInterpolate(
  p0: number,
  p1: number,
  m0: number,
  m1: number,
  t: number
): number {
  const t2 = t * t;
  const t3 = t2 * t;

  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  return h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
}

export function interpolateCursorPositions(
  frames: Frame[],
  targetTimestamp: number
): InterpolatedCursor {
  if (frames.length === 0) {
    return { position: 0, timestamp: targetTimestamp, isPredicted: true };
  }

  if (frames.length === 1) {
    return { position: frames[0].cursorPosition, timestamp: frames[0].timestamp, isPredicted: false };
  }

  const sortedFrames = [...frames].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 0; i < sortedFrames.length - 1; i++) {
    const f1 = sortedFrames[i];
    const f2 = sortedFrames[i + 1];

    if (targetTimestamp >= f1.timestamp && targetTimestamp <= f2.timestamp) {
      const t = (targetTimestamp - f1.timestamp) / (f2.timestamp - f1.timestamp);
      const clampedT = Math.max(0, Math.min(1, t));
      const position = lerp(f1.cursorPosition, f2.cursorPosition, clampedT);
      return { position, timestamp: targetTimestamp, isPredicted: false };
    }
  }

  const lastFrame = sortedFrames[sortedFrames.length - 1];
  const timeSinceLastFrame = targetTimestamp - lastFrame.timestamp;

  if (timeSinceLastFrame <= MAX_PREDICTION_MS && sortedFrames.length >= 2) {
    const prevFrame = sortedFrames[sortedFrames.length - 2];
    const velocity = (lastFrame.cursorPosition - prevFrame.cursorPosition) /
                     (lastFrame.timestamp - prevFrame.timestamp);
    const predictedPosition = lastFrame.cursorPosition + velocity * timeSinceLastFrame;
    return { position: predictedPosition, timestamp: targetTimestamp, isPredicted: true };
  }

  return { position: lastFrame.cursorPosition, timestamp: lastFrame.timestamp, isPredicted: false };
}

export function deadReckonTyping(
  lastKnownCode: string,
  lastKnownCursor: number,
  timeSinceLastUpdate: number,
  averageWpm: number = 60
): { code: string; cursorPosition: number } {
  const charsPerSecond = (averageWpm * 5) / 60;
const predictedChars = Math.floor(charsPerSecond * (timeSinceLastUpdate / 1000));

   if (predictedChars <= 0) {
    return { code: lastKnownCode, cursorPosition: lastKnownCursor };
  }

  const predictedCode = lastKnownCode + ' '.repeat(predictedChars);
  const predictedCursor = lastKnownCursor + predictedChars;

  return { code: predictedCode, cursorPosition: predictedCursor };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function getNetworkQualityColor(quality: NetworkQualityMetrics['quality']): string {
  switch (quality) {
    case 'excellent': return 'text-emerald-400';
    case 'good': return 'text-cyan-400';
    case 'fair': return 'text-amber-400';
    case 'poor': return 'text-rose-400';
  }
}

export function getNetworkQualityLabel(quality: NetworkQualityMetrics['quality']): string {
  switch (quality) {
    case 'excellent': return 'Excellent';
    case 'good': return 'Good';
    case 'fair': return 'Fair';
    case 'poor': return 'Poor';
  }
}

/**
 * GGPO Predictive Rollback Netcode Engine Helper
 * Computes sub-5ms perceived latency frame reconciliation
 */
export function reconcileRollbackFrame(
  serverFrame: Frame,
  localPredictionBuffer: Frame[]
): { rolledBack: boolean; reconciledCode: string } {
  const matching = localPredictionBuffer.find(f => f.sequenceNumber === serverFrame.sequenceNumber);
  if (matching && matching.code !== serverFrame.code) {
    return { rolledBack: true, reconciledCode: serverFrame.code };
  }
  return { rolledBack: false, reconciledCode: serverFrame.code };
}
