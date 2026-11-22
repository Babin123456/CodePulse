import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientHsmStorageManager } from './hsm-storage';

describe('ClientHsmStorageManager (HSM Storage Client #550)', () => {
  let client: ClientHsmStorageManager;

  beforeEach(() => {
    client = new ClientHsmStorageManager('/api/storage');
    vi.restoreAllMocks();
  });

  describe('Transparent Retrieval Shim', () => {
    it('transparently retrieves commit diff payload across tiers', async () => {
      const mockPayload = {
        repositoryId: 'repo-abc',
        commitSha: 'sha-12345',
        diffContent: 'diff --git a/file.ts b/file.ts\n+const x = 1;',
        tier: 'WARM',
        compressionAlgorithm: 'GZIP',
        checksumSha256: 'mock-sha-256',
        accessCount: 5,
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockPayload,
      } as any);

      const result = await client.getCommitDiff('repo-abc', 'sha-12345');

      expect(result.commitSha).toBe('sha-12345');
      expect(result.tier).toBe('WARM');
      expect(result.diffContent).toContain('+const x = 1;');
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/storage/commit/repo-abc/sha-12345');
    });

    it('retrieves match replay recordings transparently', async () => {
      const mockReplay = {
        battleId: 'battle-xyz',
        payload: '{"events":[{"type":"keystroke","timestamp":100}]}',
        tier: 'HOT',
        compressionAlgorithm: 'NONE',
        checksumSha256: 'mock-replay-hash',
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockReplay,
      } as any);

      const replay = await client.getMatchReplay('battle-xyz');

      expect(replay.battleId).toBe('battle-xyz');
      expect(replay.tier).toBe('HOT');
      expect(replay.payload).toContain('keystroke');
    });

    it('throws descriptive error when commit diff retrieval fails', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as any);

      await expect(client.getCommitDiff('repo-missing', 'sha-none')).rejects.toThrow(
        'Failed to retrieve commit archive sha-none (status: 404)',
      );
    });
  });

  describe('Glacier On-Demand Restoration & Status Polling', () => {
    it('initiates expedited Glacier restore request with progress tracking', async () => {
      const mockRestoreProgress = {
        archiveId: 'archive-cold-1',
        status: 'RESTORING',
        progressPercentage: 65,
        tier: 'EXPEDITED',
        estimatedCompletionAt: new Date(Date.now() + 300000).toISOString(),
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockRestoreProgress,
      } as any);

      const progress = await client.initiateGlacierRestore('archive-cold-1', 'Expedited');

      expect(progress.status).toBe('RESTORING');
      expect(progress.progressPercentage).toBe(65);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/storage/hsm/restore/archive-cold-1?tier=Expedited',
        { method: 'POST' },
      );
    });

    it('polls restoration status for active restores', async () => {
      const mockStatus = {
        archiveId: 'archive-cold-1',
        status: 'RESTORED',
        progressPercentage: 100,
        tier: 'STANDARD',
        restoredAt: new Date().toISOString(),
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockStatus,
      } as any);

      const status = await client.getRestoreStatus('archive-cold-1');

      expect(status.status).toBe('RESTORED');
      expect(status.progressPercentage).toBe(100);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/storage/hsm/restore/status/archive-cold-1',
      );
    });
  });

  describe('Lifecycle Migration & Storage Audit', () => {
    it('triggers manual lifecycle migration', async () => {
      const mockMigrationResult = {
        migratedToWarm: 15,
        migratedToCold: 8,
        totalBytesSaved: 104857600,
        audit: {
          totalArchives: 100,
          hotTierCount: 77,
          warmTierCount: 15,
          coldTierCount: 8,
        },
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockMigrationResult,
      } as any);

      const result = await client.triggerLifecycleMigration();

      expect(result.migratedToWarm).toBe(15);
      expect(result.migratedToCold).toBe(8);
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/storage/hsm/lifecycle', {
        method: 'POST',
      });
    });

    it('fetches storage tier audit report', async () => {
      const mockAudit = {
        totalArchives: 50,
        hotTierCount: 30,
        warmTierCount: 15,
        coldTierCount: 5,
        totalOriginalBytes: 500000000,
        totalCompressedBytes: 150000000,
        totalBytesSaved: 350000000,
        overallCompressionPercentage: 70.0,
        estimatedMonthlyCostUsd: 12.5,
        estimatedSavingsPercentage: 68.5,
        repositoryBreakdown: {},
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockAudit,
      } as any);

      const audit = await client.getStorageTierAudit();

      expect(audit.totalArchives).toBe(50);
      expect(audit.estimatedSavingsPercentage).toBe(68.5);
    });
  });

  describe('Storage Unit Economics & Cost Savings Calculation', () => {
    it('calculates multi-tier cost savings vs monolithic NVMe SSD storage', () => {
      // 10 GB Hot, 50 GB Warm, 200 GB Cold
      // Hot: 10 * 0.25 = $2.50
      // Warm: 50 * 0.023 = $1.15
      // Cold: 200 * 0.0036 = $0.72
      // Tiered Total: 2.50 + 1.15 + 0.72 = $4.37
      // Unoptimized (all 260 GB on Hot NVMe): 260 * 0.25 = $65.00
      // Savings: $60.63 (~93.28%)
      const comparison = client.calculateCostComparison(10, 50, 200);

      expect(comparison.unoptimizedCostUsd).toBe(65.0);
      expect(comparison.tieredCostUsd).toBe(4.37);
      expect(comparison.monthlySavingsUsd).toBe(60.63);
      expect(comparison.savingsPercentage).toBeGreaterThan(90);
    });

    it('determines if asset requires cold restoration', () => {
      expect(client.isRestorationRequired('COLD')).toBe(true);
      expect(client.isRestorationRequired('WARM')).toBe(false);
      expect(client.isRestorationRequired('HOT')).toBe(false);
    });
  });
});

