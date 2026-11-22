import { Injectable, Logger } from '@nestjs/common';

export interface KeystrokeSample {
  key: string;
  dwellTime: number;
  flightTime: number;
  timestamp: number;
}

export interface BiometricsAnalysisResult {
  userId: string;
  battleId: string;
  cheatProbability: number; // 0.0 to 1.0
  isFlagged: boolean;
  shannonEntropy: number;
  dwellMean: number;
  dwellStdDev: number;
  flightMean: number;
  flightStdDev: number;
  flaggedReasons: string[];
}

@Injectable()
export class AntiCheatBiometricsService {
  private readonly logger = new Logger(AntiCheatBiometricsService.name);

  /**
   * Calculates Shannon Entropy of an array of numbers (e.g. interval distributions)
   */
  public calculateShannonEntropy(values: number[], binSize: number = 10): number {
    if (values.length === 0) return 0;

    // Discretize values into bins
    const bins = new Map<number, number>();
    for (const v of values) {
      const bin = Math.floor(v / binSize);
      bins.set(bin, (bins.get(bin) || 0) + 1);
    }

    let entropy = 0;
    const total = values.length;
    for (const count of bins.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }

    return Number(entropy.toFixed(4));
  }

  /**
   * Computes mean and standard deviation
   */
  public computeStats(values: number[]): { mean: number; stdDev: number } {
    if (values.length === 0) return { mean: 0, stdDev: 0 };
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return {
      mean: Number(mean.toFixed(2)),
      stdDev: Number(Math.sqrt(variance).toFixed(2)),
    };
  }

  /**
   * Evaluates keystroke cadence and paste behavior to detect robotic input / macros / large dumps
   */
  public analyzeKeystrokeBiometrics(
    userId: string,
    battleId: string,
    samples: KeystrokeSample[],
    pasteEvents: Array<{ linesCount: number; charCount: number; timestamp: number }>,
  ): BiometricsAnalysisResult {
    const flaggedReasons: string[] = [];
    let anomalyScore = 0;

    // 1. Detect anomalous paste bursts (> 20 lines)
    const massivePastes = pasteEvents.filter((p) => p.linesCount >= 20);
    if (massivePastes.length > 0) {
      flaggedReasons.push(
        `Suspicious clipboard paste detected: ${massivePastes.length} event(s) exceeding 20 lines inserted without typing cadence`,
      );
      anomalyScore += 0.45 * Math.min(massivePastes.length, 2);
    }

    if (samples.length >= 10) {
      const dwellTimes = samples.map((s) => s.dwellTime);
      const flightTimes = samples.map((s) => s.flightTime);

      const dwellStats = this.computeStats(dwellTimes);
      const flightStats = this.computeStats(flightTimes);

      // Shannon entropy of flight times
      const flightEntropy = this.calculateShannonEntropy(flightTimes, 15);

      // Programmatic input / macro scripts typically have unnaturally low standard deviation or low entropy
      if (dwellStats.stdDev < 3.0 && dwellTimes.length > 15) {
        flaggedReasons.push(
          `Unnaturally rigid dwell time detected (stdDev: ${dwellStats.stdDev}ms)`,
        );
        anomalyScore += 0.35;
      }

      if (flightEntropy < 1.0 && flightTimes.length > 20) {
        flaggedReasons.push(
          `Low typing entropy indicating automated macro playback (Shannon entropy: ${flightEntropy})`,
        );
        anomalyScore += 0.4;
      }

      // Fast typing check: sub-millisecond cadence or constant interval
      const microIntervals = flightTimes.filter((t) => t > 0 && t < 10).length;
      if (microIntervals / flightTimes.length > 0.4) {
        flaggedReasons.push(`Excessive sub-10ms keystroke flight intervals`);
        anomalyScore += 0.3;
      }

      const cheatProbability = Math.min(1.0, Number(anomalyScore.toFixed(3)));
      const isFlagged = cheatProbability >= 0.65;

      if (isFlagged) {
        this.logger.warn(
          `[ANTI-CHEAT ALERT] User ${userId} in Battle ${battleId} flagged with probability ${cheatProbability}: ${flaggedReasons.join('; ')}`,
        );
      }

      return {
        userId,
        battleId,
        cheatProbability,
        isFlagged,
        shannonEntropy: flightEntropy,
        dwellMean: dwellStats.mean,
        dwellStdDev: dwellStats.stdDev,
        flightMean: flightStats.mean,
        flightStdDev: flightStats.stdDev,
        flaggedReasons,
      };
    }

    const cheatProbability = Math.min(1.0, Number(anomalyScore.toFixed(3)));
    return {
      userId,
      battleId,
      cheatProbability,
      isFlagged: cheatProbability >= 0.65,
      shannonEntropy: 0,
      dwellMean: 0,
      dwellStdDev: 0,
      flightMean: 0,
      flightStdDev: 0,
      flaggedReasons,
    };
  }
}
