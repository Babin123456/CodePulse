import { Injectable, Logger } from '@nestjs/common';
import { SpotRunnerNode, SpotReaperService } from './spot-reaper.service';

export interface AutoscalerMetrics {
  currentQueueDepth: number;
  activeRunnersCount: number;
  jobsPerMinuteVelocity: number;
}

@Injectable()
export class RunnerAutoscalerService {
  private readonly logger = new Logger(RunnerAutoscalerService.name);
  private runnerFleet: SpotRunnerNode[] = [];
  private readonly MIN_RUNNERS = 2;
  private readonly MAX_RUNNERS = 20;

  constructor(private readonly reaperService: SpotReaperService) {}

  /**
   * Evaluates BullMQ queue depth metrics and dynamically scales spot execution runner fleet
   */
  public evaluateAndScale(metrics: AutoscalerMetrics): {
    action: 'SCALE_UP' | 'SCALE_DOWN' | 'MAINTAIN';
    targetCount: number;
  } {
    const { currentQueueDepth, activeRunnersCount, jobsPerMinuteVelocity } = metrics;

    // Burst threshold: queue depth > 10 or high velocity > 200 jobs/min
    if (currentQueueDepth > 10 || jobsPerMinuteVelocity > 200) {
      const neededNodes = Math.min(
        this.MAX_RUNNERS,
        Math.max(activeRunnersCount + 2, Math.ceil(currentQueueDepth / 5)),
      );

      this.logger.log(
        `[AUTOSCALER BURST] Queue depth: ${currentQueueDepth}, Velocity: ${jobsPerMinuteVelocity}/min. Scaling up to ${neededNodes} nodes`,
      );
      return { action: 'SCALE_UP', targetCount: neededNodes };
    }

    if (currentQueueDepth === 0 && activeRunnersCount > this.MIN_RUNNERS) {
      // Trigger reaper check
      const { reapedNodeIds } = this.reaperService.reapIdleNodes(this.runnerFleet);
      if (reapedNodeIds.length > 0) {
        return { action: 'SCALE_DOWN', targetCount: Math.max(this.MIN_RUNNERS, activeRunnersCount - reapedNodeIds.length) };
      }
    }

    return { action: 'MAINTAIN', targetCount: activeRunnersCount };
  }
}
