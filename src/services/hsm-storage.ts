/**
 * Hierarchical Storage Management (HSM) Client & Storage Tiering Manager
 * Facilitates transparent retrieval across Hot (Local NVMe SSD), Warm (S3 Standard),
 * and Cold (S3 Glacier Flexible Retrieval) storage tiers with on-demand restoration
 * and cost optimization analytics (#550).
 */

export type StorageTier = 'HOT' | 'WARM' | 'COLD';
export type RestoreGlacierTier = 'Expedited' | 'Standard' | 'Bulk';
export type RestorationStatus = 'IDLE' | 'RESTORING' | 'RESTORED' | 'FAILED';

export interface RetrievedCommitArchive {
  repositoryId: string;
  commitSha: string;
  diffContent: string;
  tier: StorageTier;
  compressionAlgorithm: string;
  checksumSha256?: string;
  checksumMd5?: string;
  accessCount: number;
}

export interface RetrievedReplayArchive {
  battleId: string;
  payload: string;
  tier: StorageTier;
  compressionAlgorithm: string;
  checksumSha256?: string;
}

export interface RestorationProgress {
  archiveId: string;
  status: RestorationStatus;
  progressPercentage: number;
  tier: string;
  estimatedCompletionAt?: Date;
  restoredAt?: Date;
}

export interface LifecycleMigrationResult {
  migratedToWarm: number;
  migratedToCold: number;
  totalBytesSaved: number;
  audit: StorageTierAuditReport;
}

export interface StorageTierAuditReport {
  totalArchives: number;
  hotTierCount: number;
  warmTierCount: number;
  coldTierCount: number;
  totalOriginalBytes: number;
  totalCompressedBytes: number;
  totalBytesSaved: number;
  overallCompressionPercentage: number;
  estimatedMonthlyCostUsd: number;
  estimatedSavingsPercentage: number;
  repositoryBreakdown: Record<
    string,
    {
      totalCommits: number;
      hotCount: number;
      warmCount: number;
      coldCount: number;
      bytesSaved: number;
      costSavingsPercentage: number;
    }
  >;
}

export interface HsmCostComparison {
  unoptimizedCostUsd: number;
  tieredCostUsd: number;
  monthlySavingsUsd: number;
  savingsPercentage: number;
}

export class ClientHsmStorageManager {
  private readonly baseUrl: string;
  private readonly activeRestorations = new Map<string, RestorationProgress>();

  // Cloud & NVMe Storage Unit Economics ($ per GB / month)
  public static readonly HOT_TIER_COST_PER_GB = 0.25; // NVMe Local Storage
  public static readonly WARM_TIER_COST_PER_GB = 0.023; // AWS S3 Standard
  public static readonly COLD_TIER_COST_PER_GB = 0.0036; // AWS S3 Glacier Flexible Retrieval

  constructor(baseUrl = '/api/storage') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Transparently retrieves commit diff content regardless of underlying storage tier
   */
  async getCommitDiff(repositoryId: string, commitSha: string): Promise<RetrievedCommitArchive> {
    const res = await fetch(
      `${this.baseUrl}/commit/${encodeURIComponent(repositoryId)}/${encodeURIComponent(commitSha)}`,
    );
    if (!res.ok) {
      throw new Error(`Failed to retrieve commit archive ${commitSha} (status: ${res.status})`);
    }
    return (await res.json()) as RetrievedCommitArchive;
  }

  /**
   * Transparently retrieves match replay recordings
   */
  async getMatchReplay(battleId: string): Promise<RetrievedReplayArchive> {
    const res = await fetch(`${this.baseUrl}/replay/${encodeURIComponent(battleId)}`);
    if (!res.ok) {
      throw new Error(`Failed to retrieve replay for battle ${battleId} (status: ${res.status})`);
    }
    return (await res.json()) as RetrievedReplayArchive;
  }

  /**
   * Initiates on-demand asynchronous restoration from AWS S3 Glacier Cold tier
   */
  async initiateGlacierRestore(
    assetId: string,
    tier: RestoreGlacierTier = 'Standard',
  ): Promise<RestorationProgress> {
    const res = await fetch(
      `${this.baseUrl}/hsm/restore/${encodeURIComponent(assetId)}?tier=${tier}`,
      { method: 'POST' },
    );
    if (!res.ok) {
      throw new Error(`Failed to initiate Glacier restore for ${assetId} (status: ${res.status})`);
    }
    const progress = (await res.json()) as RestorationProgress;
    this.activeRestorations.set(assetId, progress);
    return progress;
  }

  /**
   * Queries real-time restoration progress for Glacier cold assets
   */
  async getRestoreStatus(assetId: string): Promise<RestorationProgress> {
    const res = await fetch(
      `${this.baseUrl}/hsm/restore/status/${encodeURIComponent(assetId)}`,
    );
    if (!res.ok) {
      throw new Error(`Failed to get restore status for ${assetId} (status: ${res.status})`);
    }
    const progress = (await res.json()) as RestorationProgress;
    this.activeRestorations.set(assetId, progress);
    return progress;
  }

  /**
   * Manually triggers lifecycle tiering migration (30d -> Warm, 90d -> Cold)
   */
  async triggerLifecycleMigration(): Promise<LifecycleMigrationResult> {
    const res = await fetch(`${this.baseUrl}/hsm/lifecycle`, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Failed to trigger lifecycle migration (status: ${res.status})`);
    }
    return (await res.json()) as LifecycleMigrationResult;
  }

  /**
   * Fetches storage tier breakdown and cost audit report
   */
  async getStorageTierAudit(): Promise<StorageTierAuditReport> {
    const res = await fetch(`${this.baseUrl}/hsm/audit`);
    if (!res.ok) {
      throw new Error(`Failed to get storage audit report (status: ${res.status})`);
    }
    return (await res.json()) as StorageTierAuditReport;
  }

  /**
   * Calculates platform cost savings comparing pure NVMe SSD hosting vs HSM tiered hosting
   */
  public calculateCostComparison(
    hotGb: number,
    warmGb: number,
    coldGb: number,
  ): HsmCostComparison {
    const totalGb = hotGb + warmGb + coldGb;
    const unoptimizedCostUsd = totalGb * ClientHsmStorageManager.HOT_TIER_COST_PER_GB;

    const tieredCostUsd =
      hotGb * ClientHsmStorageManager.HOT_TIER_COST_PER_GB +
      warmGb * ClientHsmStorageManager.WARM_TIER_COST_PER_GB +
      coldGb * ClientHsmStorageManager.COLD_TIER_COST_PER_GB;

    const monthlySavingsUsd = Math.max(0, unoptimizedCostUsd - tieredCostUsd);
    const savingsPercentage =
      unoptimizedCostUsd > 0
        ? Math.round((monthlySavingsUsd / unoptimizedCostUsd) * 10000) / 100
        : 0;

    return {
      unoptimizedCostUsd: parseFloat(unoptimizedCostUsd.toFixed(2)),
      tieredCostUsd: parseFloat(tieredCostUsd.toFixed(2)),
      monthlySavingsUsd: parseFloat(monthlySavingsUsd.toFixed(2)),
      savingsPercentage,
    };
  }

  /**
   * Helper to verify if an asset is currently in Cold Glacier tier requiring hydration
   */
  public isRestorationRequired(tier: StorageTier): boolean {
    return tier === 'COLD';
  }
}

