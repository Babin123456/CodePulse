import { Injectable, Logger } from '@nestjs/common';

export interface SpotRunnerNode {
  nodeId: string;
  provider: 'AWS_SPOT' | 'GCP_PREEMPTIBLE' | 'RENDER_EPHEMERAL';
  status: 'PROVISIONING' | 'READY' | 'DRAINING' | 'TERMINATED';
  lastJobCompletedAt: number;
  activeJobsCount: number;
}

@Injectable()
export class SpotReaperService {
  private readonly logger = new Logger(SpotReaperService.name);
  private readonly IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes of inactivity

  /**
   * Reaps and terminates idle runner nodes to optimize cloud infrastructure spend
   */
  public reapIdleNodes(nodes: SpotRunnerNode[]): { reapedNodeIds: string[]; remainingNodes: SpotRunnerNode[] } {
    const now = Date.now();
    const reapedNodeIds: string[] = [];
    const remainingNodes: SpotRunnerNode[] = [];

    for (const node of nodes) {
      const isIdle = node.activeJobsCount === 0 && (now - node.lastJobCompletedAt >= this.IDLE_TIMEOUT_MS);
      if (isIdle && node.status !== 'TERMINATED') {
        node.status = 'TERMINATED';
        reapedNodeIds.push(node.nodeId);
        this.logger.log(`[SPOT REAPER] Terminating idle runner node: ${node.nodeId} (Provider: ${node.provider})`);
      } else {
        remainingNodes.push(node);
      }
    }

    return { reapedNodeIds, remainingNodes };
  }
}
