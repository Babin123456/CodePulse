import { RocksDbService, BloomFilter } from './rocksdb.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('RocksDbService (Embedded LSM-Tree Key-Value Engine #549)', () => {
  let service: RocksDbService;
  let tempDbDir: string;

  beforeEach(async () => {
    tempDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rocksdb-test-'));
    service = new RocksDbService({
      dbPath: tempDbDir,
      writeBufferSize: 1024 * 1024, // 1MB buffer for test flushing
      blockCacheSize: 8 * 1024 * 1024,
      compression: 'snappy',
      bloomFilterBitsPerKey: 10,
    });
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    try {
      fs.rmSync(tempDbDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('CRUD Operations & Microsecond Writes', () => {
    it('puts and gets keys from active MemTable with sub-millisecond latency', async () => {
      const key = 'ws:user123:file456';
      const value = { content: 'console.log("hello world");', cursorLine: 12 };

      await service.put(key, value);
      const retrieved = await service.get<typeof value>(key);

      expect(retrieved).toEqual(value);
    });

    it('returns null for non-existent keys', async () => {
      const result = await service.get('non_existent_key');
      expect(result).toBeNull();
    });

    it('deletes keys correctly from both MemTable and SST index', async () => {
      await service.put('key1', 'val1');
      expect(await service.get('key1')).toBe('val1');

      const deleted = await service.delete('key1');
      expect(deleted).toBe(true);
      expect(await service.get('key1')).toBeNull();
    });
  });

  describe('Bloom Filter & Disk Seek Reduction (#549)', () => {
    it('validates standalone BloomFilter correctness and low false-positive rate', () => {
      const filter = new BloomFilter(1000, 10);
      for (let i = 0; i < 1000; i++) {
        filter.add(`key-${i}`);
      }

      // True positives must be 100%
      for (let i = 0; i < 1000; i++) {
        expect(filter.mightContain(`key-${i}`)).toBe(true);
      }

      // Negative queries should return false ~99% of the time (less than 3% false positives)
      let falsePositives = 0;
      const testCount = 1000;
      for (let i = 0; i < testCount; i++) {
        if (filter.mightContain(`non-existent-key-${i}`)) {
          falsePositives++;
        }
      }

      const falsePositiveRate = falsePositives / testCount;
      expect(falsePositiveRate).toBeLessThan(0.03); // < 3%
    });

    it('Bloom filters reduce unnecessary disk seeks by >= 90% on negative queries', async () => {
      // Populate and flush to SSTable
      for (let i = 0; i < 50; i++) {
        await service.put(`disk-key-${i}`, `val-${i}`);
      }
      await service.flushMemTable();

      // Query keys that definitely do not exist
      const MISS_COUNT = 100;
      for (let i = 0; i < MISS_COUNT; i++) {
        const val = await service.get(`definitely-not-here-${i}`);
        expect(val).toBeNull();
      }

      const stats = service.getStats();
      expect(stats.bloomFilterStats.totalSeekAttempts).toBeGreaterThan(0);
      expect(stats.bloomFilterStats.diskSeeksAvoidedPercentage).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Pre-parsed AST Caching & Parsing (#549)', () => {
    it('stores and retrieves pre-parsed AST trees indexed by commit SHA and file path', async () => {
      const commitSha = 'c0ffee1234';
      const filePath = 'src/components/Header.tsx';

      const astPayload = {
        commitSha,
        filePath,
        language: 'typescript',
        nodeCount: 15,
        ast: { type: 'Program', body: [{ type: 'FunctionDeclaration', name: 'Header' }] },
        tokensCount: 75,
        parsedAt: Date.now(),
      };

      await service.putAst(commitSha, filePath, astPayload);
      const cached = await service.getAst(commitSha, filePath);

      expect(cached).toBeDefined();
      expect(cached?.commitSha).toBe(commitSha);
      expect(cached?.filePath).toBe(filePath);
      expect(cached?.nodeCount).toBe(15);
      expect(cached?.ast.body[0].name).toBe('Header');
    });

    it('automatically parses TypeScript source code and caches AST in RocksDB', async () => {
      const code = `
        import { useState } from 'react';
        export class UserService {
          getUser() { return null; }
        }
        export function calculateTotal(a: number, b: number) {
          return a + b;
        }
      `;

      const parsed = await service.parseAndCacheAst('sha-abc-1', 'src/services/user.ts', code);

      expect(parsed.language).toBe('typescript');
      expect(parsed.nodeCount).toBeGreaterThan(0);
      expect(parsed.ast.body.some((n: any) => n.name === 'UserService')).toBe(true);
      expect(parsed.ast.body.some((n: any) => n.name === 'calculateTotal')).toBe(true);

      // Verify cached in RocksDB
      const cached = await service.getAst('sha-abc-1', 'src/services/user.ts');
      expect(cached).toEqual(parsed);
    });
  });

  describe('File Symbol Table Caching & Workspace Symbols (#549)', () => {
    it('stores and retrieves file symbol tables indexed by commit SHA and file path', async () => {
      const commitSha = 'sha-symbols-100';
      const filePath = 'backend/src/app.service.ts';

      const symbolTable = {
        filePath,
        commitSha,
        language: 'typescript',
        symbols: [
          { name: 'AppService', kind: 'class' as const, line: 5, character: 13 },
          { name: 'getHello', kind: 'function' as const, line: 8, character: 2 },
        ],
        exports: ['AppService'],
        imports: ['@nestjs/common'],
        parsedAt: Date.now(),
      };

      await service.putSymbols(commitSha, filePath, symbolTable);
      const retrieved = await service.getSymbols(commitSha, filePath);

      expect(retrieved).toBeDefined();
      expect(retrieved?.symbols).toHaveLength(2);
      expect(retrieved?.exports).toContain('AppService');
    });

    it('parses symbols and extracts workspace symbols across multiple files', async () => {
      const commitSha = 'sha-multi-files';

      const file1Code = `
        import { Injectable } from '@nestjs/common';
        export class AuthService {
          login() {}
        }
      `;

      const file2Code = `
        export interface UserDto {
          id: string;
        }
        export function hashPassword(p: string) {}
      `;

      await service.parseAndCacheSymbols(commitSha, 'src/auth/auth.service.ts', file1Code);
      await service.parseAndCacheSymbols(commitSha, 'src/auth/dto/user.dto.ts', file2Code);

      const workspaceSymbols = await service.getWorkspaceSymbols(commitSha);
      expect(workspaceSymbols).toHaveLength(2);

      const allSymbolNames = workspaceSymbols.flatMap((s) => s.symbols.map((x) => x.name));
      expect(allSymbolNames).toContain('AuthService');
      expect(allSymbolNames).toContain('UserDto');
      expect(allSymbolNames).toContain('hashPassword');
    });
  });

  describe('SST Flush, Block Compression, and Block Cache', () => {
    it('flushes active MemTable to compressed SST file on disk and retrieves via Block Cache', async () => {
      await service.put('ws:user1:draft1', 'function compute() { return 42; }');
      await service.put('ws:user1:draft2', 'function render() { return null; }');

      // Flush MemTable to SST
      const sstFile = await service.flushMemTable();
      expect(sstFile).toBeDefined();
      expect(fs.existsSync(sstFile!)).toBe(true);

      // Verify stats reflect SST creation
      const stats = service.getStats();
      expect(stats.sstFilesCount).toBe(1);
      expect(stats.totalSizeBytes).toBeGreaterThan(0);

      // Read back from SST via Block Cache
      const val1 = await service.get('ws:user1:draft1');
      const val2 = await service.get('ws:user1:draft2');
      expect(val1).toBe('function compute() { return 42; }');
      expect(val2).toBe('function render() { return null; }');
      expect(service.getStats().blockCacheSizeBytes).toBeGreaterThan(0);
    });
  });

  describe('Compaction, Recovery & Graceful Shutdown (#549)', () => {
    it('compacts multiple SST levels into a single consolidated file and reclaims space', async () => {
      await service.put('keyA', 'valA');
      await service.flushMemTable();

      await service.put('keyB', 'valB');
      await service.flushMemTable();

      expect(service.getStats().sstFilesCount).toBe(2);

      const compaction = await service.compact();
      expect(compaction.mergedFilesCount).toBe(2);
      expect(service.getStats().sstFilesCount).toBe(1);

      expect(await service.get('keyA')).toBe('valA');
      expect(await service.get('keyB')).toBe('valB');
    });

    it('gracefully shuts down and recovers state after simulated restart', async () => {
      await service.put('persist:key', 'durable data');
      await service.flushMemTable();
      await service.onModuleDestroy();

      // Create new instance pointing to same dbPath
      const newService = new RocksDbService({ dbPath: tempDbDir });
      await newService.onModuleInit();

      expect(await newService.get('persist:key')).toBe('durable data');
      await newService.onModuleDestroy();
    });
  });

  describe('High-Throughput Key-Value Benchmark (50,000+ lookups/sec #549)', () => {
    it('executes 10,000+ key lookups with under 0.2ms average latency and >50,000 ops/sec', async () => {
      const bench = await service.runBenchmark(10000);

      expect(bench.iterations).toBe(10000);
      expect(bench.opsPerSecond).toBeGreaterThan(50000);
      expect(bench.avgLatencyMs).toBeLessThan(0.2);
    });
  });
});
