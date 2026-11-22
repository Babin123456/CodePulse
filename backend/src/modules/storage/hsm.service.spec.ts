import { HsmService, IS3GlacierAdapter } from './hsm.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('HsmService (Multi-Tier Hierarchical Storage Management #550)', () => {
  let service: HsmService;
  let tempStorageRoot: string;
  let mockPrisma: any;
  let mockS3Adapter: IS3GlacierAdapter;

  beforeEach(() => {
    tempStorageRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'codepulse-hsm-test-'),
    );

    mockS3Adapter = {
      putObject: jest.fn().mockResolvedValue({ ETag: '"s3-etag-12345"' }),
      copyObject: jest.fn().mockResolvedValue({ CopyObjectResult: { ETag: '"s3-copy-etag"' } }),
      restoreObject: jest.fn().mockResolvedValue(undefined),
      headObject: jest.fn().mockResolvedValue({
        ContentLength: 1024,
        ETag: '"s3-head-etag"',
        StorageClass: 'GLACIER',
        Restore: 'ongoing-request="false", expiry-date="Fri, 23 Dec 2026 00:00:00 GMT"',
      }),
      deleteObject: jest.fn().mockResolvedValue(undefined),
    };

    mockPrisma = {
      commitArchive: {
        upsert: jest.fn(async ({ create }: any) => ({
          id: 'archive-uuid-1',
          ...create,
        })),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(async ({ data }: any) => ({
          id: 'archive-uuid-1',
          ...data,
        })),
      },
      storageTierMetrics: {
        create: jest.fn(async ({ data }: any) => ({
          id: 'metrics-uuid-1',
          ...data,
        })),
      },
    };

    service = new HsmService(
      mockPrisma as unknown as PrismaService,
      tempStorageRoot,
      mockS3Adapter,
    );
  });

  afterEach(() => {
    try {
      fs.rmSync(tempStorageRoot, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('Hot NVMe SSD Archiving & Cryptographic Checksums', () => {
    it('archives new commit onto Hot SSD tier with MD5 & SHA-256 checksums', async () => {
      const diff = 'diff --git a/src/index.ts b/src/index.ts\n+console.log("hello");';
      const result = await service.archiveCommit({
        repositoryId: 'repo-100',
        commitSha: 'a1b2c3d4',
        diffContent: diff,
      });

      expect(result.tier).toBe('HOT');
      expect(result.originalBytes).toBe(Buffer.byteLength(diff));
      expect(result.compressedBytes).toBe(Buffer.byteLength(diff));
      expect(result.compressionRatio).toBe(1.0);
      expect(result.checksumSha256).toBeDefined();
      expect(result.checksumMd5).toBeDefined();
      expect(mockPrisma.commitArchive.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            tier: 'HOT',
            checksumSha256: expect.any(String),
            checksumMd5: expect.any(String),
          }),
        }),
      );
    });

    it('archives match replay video recording with integrity verification', async () => {
      const replay = JSON.stringify({ matchId: 'battle-999', keystrokes: 450 });
      const result = await service.archiveMatchReplay({
        battleId: 'battle-999',
        replayPayload: replay,
      });

      expect(result.battleId).toBe('battle-999');
      expect(result.tier).toBe('HOT');
      expect(result.checksumSha256).toBeDefined();
    });
  });

  describe('Automated Lifecycle Tiering Migration (30d Warm, 90d Cold)', () => {
    it('migrates inactive commits/replays older than 30 days to Warm S3 (Gzip)', async () => {
      const diff = 'import React from "react";\nexport const Button = () => <button>Click</button>;';
      const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);

      const checksums = service.calculateChecksums(Buffer.from(diff, 'utf8'));

      mockPrisma.commitArchive.findMany.mockResolvedValueOnce([
        {
          id: 'archive-uuid-1',
          repositoryId: 'repo-100',
          commitSha: 'warm-sha-1',
          tier: 'HOT',
          storageLocation: path.join(tempStorageRoot, 'hot', 'repo-100_warm-sha-1.diff'),
          originalBytes: Buffer.byteLength(diff),
          checksumSha256: checksums.sha256,
          archivedAt: thirtyFiveDaysAgo,
        },
      ]);

      // Write mock hot file
      const hotPath = path.join(tempStorageRoot, 'hot', 'repo-100_warm-sha-1.diff');
      fs.writeFileSync(hotPath, diff);

      const migration = await service.runLifecycleTieringMigration();

      expect(migration.migratedToWarm).toBe(1);
      expect(migration.migratedToCold).toBe(0);
      expect(mockS3Adapter.putObject).toHaveBeenCalledWith(
        expect.objectContaining({
          StorageClass: 'STANDARD',
        }),
      );
      expect(mockPrisma.commitArchive.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tier: 'WARM',
          }),
        }),
      );
      // Validates that hot file was deleted after successful migration
      expect(fs.existsSync(hotPath)).toBe(false);
    });

    it('migrates commits older than 90 days to Cold S3 Glacier (Brotli)', async () => {
      const diff = 'const ancientCode = "written over 90 days ago";'.repeat(25);
      const ninetyFiveDaysAgo = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000);

      const checksums = service.calculateChecksums(Buffer.from(diff, 'utf8'));

      const hotPath = path.join(tempStorageRoot, 'hot', 'repo-ancient_ancient-sha-1.diff');
      fs.writeFileSync(hotPath, diff);

      mockPrisma.commitArchive.findMany.mockResolvedValueOnce([
        {
          id: 'archive-ancient-1',
          repositoryId: 'repo-ancient',
          commitSha: 'ancient-sha-1',
          tier: 'HOT',
          storageLocation: hotPath,
          originalBytes: Buffer.byteLength(diff),
          checksumSha256: checksums.sha256,
          archivedAt: ninetyFiveDaysAgo,
        },
      ]);

      const migration = await service.runLifecycleTieringMigration();

      expect(migration.migratedToCold).toBe(1);
      expect(migration.totalBytesSaved).toBeGreaterThan(0);
      expect(mockS3Adapter.putObject).toHaveBeenCalledWith(
        expect.objectContaining({
          StorageClass: 'GLACIER',
        }),
      );
      expect(mockPrisma.commitArchive.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tier: 'COLD',
          }),
        }),
      );
    });

    it('aborts tier migration and retains hot copy if cryptographic checksum check fails', async () => {
      const diff = 'legitimate original content';
      const hotPath = path.join(tempStorageRoot, 'hot', 'tampered_sha.diff');
      fs.writeFileSync(hotPath, diff);

      await expect(
        service.migrateToWarm({
          id: 'archive-tampered',
          repositoryId: 'repo-tampered',
          commitSha: 'tampered-sha',
          storageLocation: hotPath,
          originalBytes: Buffer.byteLength(diff),
          checksumSha256: 'corrupted-expected-sha256-hash',
        }),
      ).rejects.toThrow();

      // Ensure original file is preserved on SSD
      expect(fs.existsSync(hotPath)).toBe(true);
    });
  });

  describe('Transparent Retrieval Shim & S3 Glacier Restoration', () => {
    it('transparently fetches and decompresses diff from Warm S3 tier', async () => {
      const originalDiff = 'const feature = "warm tier diff content";';
      const hotPath = path.join(tempStorageRoot, 'hot', 'repo-retrieve_sha-retrieve-warm.diff');
      fs.writeFileSync(hotPath, originalDiff);

      // Migrate to warm
      await service.migrateToWarm({
        id: 'archive-retrieve-1',
        repositoryId: 'repo-retrieve',
        commitSha: 'sha-retrieve-warm',
        storageLocation: hotPath,
        originalBytes: Buffer.byteLength(originalDiff),
      });

      mockPrisma.commitArchive.findUnique.mockResolvedValueOnce({
        id: 'archive-retrieve-1',
        repositoryId: 'repo-retrieve',
        commitSha: 'sha-retrieve-warm',
        tier: 'WARM',
        storageLocation: path.join(tempStorageRoot, 'warm', 'repo-retrieve_sha-retrieve-warm.diff.gz'),
        originalBytes: Buffer.byteLength(originalDiff),
        compressedBytes: 20,
        compressionRatio: 0.5,
        accessCount: 2,
        lastAccessedAt: new Date(),
      });

      const retrieved = await service.getCommitDiff('repo-retrieve', 'sha-retrieve-warm');

      expect(retrieved.diffContent).toBe(originalDiff);
      expect(retrieved.tier).toBe('WARM');
      expect(retrieved.accessCount).toBe(3);
    });

    it('triggers on-demand Glacier restore and reports restoration progress for Cold assets', async () => {
      mockPrisma.commitArchive.findFirst.mockResolvedValue({
        id: 'archive-glacier-1',
        commitSha: 'cold-sha-99',
        tier: 'COLD',
        storageLocation: 's3://codepulse-hsm-archives/cold/repo_cold-sha-99.diff.br',
      });

      const restore = await service.initiateGlacierRestore('cold-sha-99', 'Expedited');

      expect(restore.status).toBe('RESTORING');
      expect(restore.progressPercentage).toBe(65.0);
      expect(mockS3Adapter.restoreObject).toHaveBeenCalledWith(
        expect.objectContaining({
          RestoreRequest: expect.objectContaining({
            GlacierJobParameters: { Tier: 'Expedited' },
          }),
        }),
      );

      const status = await service.getRestorationStatus('cold-sha-99');
      expect(status.status).toBe('RESTORING');
    });

    it('throws NotFoundException when commit archive does not exist', async () => {
      mockPrisma.commitArchive.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.getCommitDiff('repo-404', 'non-existent-sha'),
      ).rejects.toThrow('Commit archive non-existent-sha not found for repository repo-404');
    });
  });

  describe('StorageTierMetrics Persistence & Cost Audit', () => {
    it('persists audit report into Prisma StorageTierMetrics model', async () => {
      mockPrisma.commitArchive.findMany.mockResolvedValueOnce([
        { repositoryId: 'repo-1', tier: 'HOT', originalBytes: 10000, compressedBytes: 10000 },
        { repositoryId: 'repo-1', tier: 'WARM', originalBytes: 10000, compressedBytes: 4000 },
        { repositoryId: 'repo-1', tier: 'COLD', originalBytes: 10000, compressedBytes: 2000 },
      ]);

      const audit = await service.getStorageTierAudit();
      const metrics = await service.persistStorageTierMetrics(audit);

      expect(mockPrisma.storageTierMetrics.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalAssets: 3,
            hotTierCount: 1,
            warmTierCount: 1,
            coldTierCount: 1,
            totalBytesSaved: expect.any(BigInt),
          }),
        }),
      );
      expect(metrics).toBeDefined();
    });
  });
});
