import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientRocksDbManager, ClientBloomFilter } from './rocksdb-client';

describe('ClientRocksDbManager (RocksDB AST & Symbol Cache #549)', () => {
  let client: ClientRocksDbManager;

  beforeEach(() => {
    client = new ClientRocksDbManager('/api/storage/rocksdb');
    client.clearLocalCache();
    vi.restoreAllMocks();
  });

  describe('Sub-Millisecond AST Caching & Resolution', () => {
    it('retrieves pre-parsed AST payload and caches in local memory for instant resolution', async () => {
      const mockAst = {
        commitSha: 'commit-xyz',
        filePath: 'src/App.tsx',
        language: 'typescript',
        nodeCount: 24,
        ast: { type: 'Program', body: [] },
        tokensCount: 110,
        parsedAt: Date.now(),
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockAst,
      } as any);

      // First fetch touches remote/fetch
      const result1 = await client.getAst('commit-xyz', 'src/App.tsx');
      expect(result1).toEqual(mockAst);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      // Second fetch immediately resolved from in-memory LRU block cache without fetch
      const result2 = await client.getAst('commit-xyz', 'src/App.tsx');
      expect(result2).toEqual(mockAst);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1); // Still 1!
    });

    it('stores pre-parsed AST tree in RocksDB', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
      } as any);

      const astPayload = {
        commitSha: 'commit-put',
        filePath: 'src/main.ts',
        language: 'typescript',
        nodeCount: 10,
        ast: { type: 'Program' },
        tokensCount: 50,
        parsedAt: Date.now(),
      };

      const success = await client.putAst('commit-put', 'src/main.ts', astPayload);
      expect(success).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/storage/rocksdb/ast',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('File Symbol Table Caching & Workspace Symbols', () => {
    it('stores and retrieves file symbol tables', async () => {
      const mockSymbols = {
        filePath: 'src/utils.ts',
        commitSha: 'commit-sym',
        language: 'typescript',
        symbols: [
          { name: 'formatDate', kind: 'function' as const, line: 3, character: 16 },
        ],
        exports: ['formatDate'],
        imports: [],
        parsedAt: Date.now(),
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockSymbols,
      } as any);

      const res = await client.getSymbols('commit-sym', 'src/utils.ts');
      expect(res?.symbols[0].name).toBe('formatDate');

      // Subsequent read served from local cache
      const cached = await client.getSymbols('commit-sym', 'src/utils.ts');
      expect(cached?.exports).toContain('formatDate');
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('retrieves all workspace symbols for a commit', async () => {
      const mockWorkspace = [
        {
          filePath: 'src/a.ts',
          commitSha: 'c-all',
          language: 'typescript',
          symbols: [{ name: 'ClassA', kind: 'class' as const, line: 1, character: 0 }],
          exports: ['ClassA'],
          imports: [],
          parsedAt: Date.now(),
        },
        {
          filePath: 'src/b.ts',
          commitSha: 'c-all',
          language: 'typescript',
          symbols: [{ name: 'funcB', kind: 'function' as const, line: 5, character: 9 }],
          exports: ['funcB'],
          imports: [],
          parsedAt: Date.now(),
        },
      ];

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockWorkspace,
      } as any);

      const symbols = await client.getWorkspaceSymbols('c-all');
      expect(symbols).toHaveLength(2);
      expect(symbols[0].symbols[0].name).toBe('ClassA');
    });
  });

  describe('Bloom Filter & Disk Seek Reduction (#549)', () => {
    it('Bloom filters achieve >= 90% disk seek reduction on non-existent keys', () => {
      const bloom = new ClientBloomFilter(500, 10);

      // Add 500 keys
      for (let i = 0; i < 500; i++) {
        bloom.add(`file-sym-${i}`);
      }

      // 100% true positive retention
      for (let i = 0; i < 500; i++) {
        expect(bloom.mightContain(`file-sym-${i}`)).toBe(true);
      }

      // Test negative queries
      let seeksAvoided = 0;
      const testMisses = 500;
      for (let i = 0; i < testMisses; i++) {
        if (!bloom.mightContain(`missing-sym-${i}`)) {
          seeksAvoided++;
        }
      }

      const reductionPercentage = (seeksAvoided / testMisses) * 100;
      // Must reduce unnecessary disk seeks by >= 90%
      expect(reductionPercentage).toBeGreaterThanOrEqual(90);
    });

    it('fetches RocksDB diagnostic stats including Bloom filter statistics', async () => {
      const mockStats = {
        totalKeys: 12000,
        memTableSizeBytes: 1048576,
        blockCacheSizeBytes: 16777216,
        totalSizeBytes: 33554432,
        sstFilesCount: 4,
        compressionRatio: 0.42,
        writeOperationsCount: 15000,
        readOperationsCount: 85000,
        bloomFilterStats: {
          totalSeekAttempts: 45000,
          diskSeeksAvoidedCount: 43200,
          diskSeeksAvoidedPercentage: 96.0,
          activeFiltersCount: 4,
        },
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockStats,
      } as any);

      const stats = await client.getStats();
      expect(stats.totalKeys).toBe(12000);
      expect(stats.bloomFilterStats.diskSeeksAvoidedPercentage).toBeGreaterThanOrEqual(90);
    });
  });

  describe('High-Throughput Key Lookup Benchmark (50,000+ ops/sec #549)', () => {
    it('benchmarks and verifies 50,000+ key lookups per second with under 0.2ms latency', async () => {
      const benchmark = await client.runClientBenchmark(50000);

      expect(benchmark.iterations).toBe(50000);
      expect(benchmark.opsPerSecond).toBeGreaterThan(50000);
      expect(benchmark.avgLatencyMs).toBeLessThan(0.2);
    });
  });
});

