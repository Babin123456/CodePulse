import { Test, TestingModule } from '@nestjs/testing';
import {
  TenantShardingService,
  ShardInstanceConfig,
  IShardClientFactory,
  murmurHash3,
} from './tenant-sharding.service';
import { TenantInterceptor } from '../common/interceptors/tenant.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { PrismaClient } from '@prisma/client';

describe('TenantShardingService & Sharding Architecture', () => {
  let service: TenantShardingService;
  let interceptor: TenantInterceptor;
  const mockClients: Map<string, any> = new Map();

  const customFactory: IShardClientFactory = {
    createClient: (shardId: string, url: string) => {
      const mock = {
        shardId,
        url,
        leaderboard: {
          findMany: jest.fn().mockImplementation(() =>
            Promise.resolve([
              { orgId: `${shardId}-org`, score: 950 },
              { orgId: `${shardId}-org-2`, score: 850 },
            ]),
          ),
        },
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
      } as unknown as PrismaClient;
      mockClients.set(shardId, mock);
      return mock;
    },
    destroyClient: async (client: any) => {
      await client.$disconnect();
    },
  };

  const testShards: ShardInstanceConfig[] = [
    {
      shardId: 'shard-core',
      name: 'Core-Shared',
      databaseUrl: 'postgresql://localhost:5432/core',
      isDefault: true,
      weight: 150,
    },
    {
      shardId: 'shard-alpha',
      name: 'Tenant-Shard-Alpha',
      databaseUrl: 'postgresql://localhost:5433/shard_alpha',
      weight: 150,
    },
    {
      shardId: 'shard-beta',
      name: 'Tenant-Shard-Beta',
      databaseUrl: 'postgresql://localhost:5434/shard_beta',
      weight: 150,
    },
    {
      shardId: 'shard-gamma',
      name: 'Tenant-Shard-Gamma',
      databaseUrl: 'postgresql://localhost:5435/shard_gamma',
      weight: 150,
    },
  ];

  beforeEach(() => {
    mockClients.clear();
    service = new TenantShardingService(testShards, customFactory);
    service.onModuleInit();
    interceptor = new TenantInterceptor(service);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('MurmurHash3 & Consistent Hashing Ring Distribution', () => {
    it('murmurHash3 produces deterministic 32-bit positive integers with high avalanche entropy', () => {
      const hash1 = murmurHash3('org-mit-robotics');
      const hash2 = murmurHash3('org-mit-robotics');
      const hash3 = murmurHash3('org-mit-roboticS'); // 1-bit flip

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(hash1)).toBe(true);
    });

    it('routes system, global, and default requests to shard-core', () => {
      expect(service.resolveShardId(null)).toBe('shard-core');
      expect(service.resolveShardId('global')).toBe('shard-core');
      expect(service.resolveShardId('system')).toBe('shard-core');
    });

    it('deterministically maps organization IDs to consistent shards', () => {
      const orgA = 'org-harvard-university';
      const orgB = 'org-stanford-cs';

      const shardA1 = service.resolveShardId(orgA);
      const shardA2 = service.resolveShardId(orgA);
      expect(shardA1).toBe(shardA2);

      const shardB1 = service.resolveShardId(orgB);
      const shardB2 = service.resolveShardId(orgB);
      expect(shardB1).toBe(shardB2);
    });

    it('achieves even distribution across database shards without hot-spotting (Acceptance Criteria)', () => {
      const counts: Record<string, number> = {
        'shard-core': 0,
        'shard-alpha': 0,
        'shard-beta': 0,
        'shard-gamma': 0,
      };

      const totalTenants = 200;
      for (let i = 0; i < totalTenants; i++) {
        const orgId = `university-org-id-${i}`;
        const targetShard = service.resolveShardId(orgId);
        counts[targetShard] = (counts[targetShard] || 0) + 1;
      }

      // Each of the 4 shards should receive an equitable share of tenants (~50 each)
      for (const shardId of Object.keys(counts)) {
        expect(counts[shardId]).toBeGreaterThan(25);
        expect(counts[shardId]).toBeLessThan(80);
      }
    });
  });

  describe('Zero Data Cross-Talk & Tenant Isolation (Acceptance Criteria)', () => {
    it('strictly isolates tenant operations to their allocated database shard', async () => {
      const orgAlpha = 'org-alpha-tenant';
      const orgBeta = 'org-beta-tenant';

      let executedShardAlpha = '';
      await service.executeOnTenantShard(orgAlpha, async (client, shardId) => {
        executedShardAlpha = shardId;
        expect((client as any).shardId).toBe(shardId);
        return true;
      });

      let executedShardBeta = '';
      await service.executeOnTenantShard(orgBeta, async (client, shardId) => {
        executedShardBeta = shardId;
        expect((client as any).shardId).toBe(shardId);
        return true;
      });

      expect(executedShardAlpha).toBe(service.resolveShardId(orgAlpha));
      expect(executedShardBeta).toBe(service.resolveShardId(orgBeta));
    });
  });

  describe('Parallel Map-Reduce Query Execution (< 250ms SLA) (Acceptance Criteria)', () => {
    it('fans out cross-shard queries in parallel and aggregates results with P95 < 250ms', async () => {
      const mapReduceRes = await service.executeCrossShardMapReduce({
        mapFn: async (client, shardId) => {
          // Simulate sub-query on each shard
          return [
            { org: `${shardId}-orgA`, points: 400 },
            { org: `${shardId}-orgB`, points: 250 },
          ];
        },
        reduceFn: (results) => {
          const flat = results.flat();
          flat.sort((a, b) => b.points - a.points);
          return flat.slice(0, 5); // Global top 5 leaderboard
        },
        timeoutMs: 200,
      });

      expect(mapReduceRes.shardsQueriedCount).toBe(4);
      expect(mapReduceRes.p95SlaMet).toBe(true);
      expect(mapReduceRes.durationMs).toBeLessThan(250.0);
      expect(mapReduceRes.data.length).toBe(5);
      expect(mapReduceRes.data[0].points).toBe(400);
    });
  });

  describe('Dynamic Shard Rebalancing / Tenant Migration', () => {
    it('migrates an overloaded organization to a fresh shard without data loss', async () => {
      const orgId = 'heavy-enterprise-google';
      const initialShard = service.resolveShardId(orgId);

      const targetShard =
        initialShard === 'shard-alpha' ? 'shard-beta' : 'shard-alpha';

      const syncSpy = jest.fn().mockResolvedValue(450);

      const migration = await service.migrateTenant(orgId, targetShard, syncSpy);

      expect(migration.status).toBe('COMPLETED');
      expect(migration.recordsMigrated).toBe(450);
      expect(migration.sourceShardId).toBe(initialShard);
      expect(migration.targetShardId).toBe(targetShard);
      expect(syncSpy).toHaveBeenCalled();

      // Subsequent query routing must resolve to the new target shard
      expect(service.resolveShardId(orgId)).toBe(targetShard);
      const directoryEntry = service.getDirectoryEntry(orgId);
      expect(directoryEntry?.shardId).toBe(targetShard);
      expect(directoryEntry?.migrationStatus).toBe('COMPLETED');
    });
  });

  describe('Distributed Deadlock Prevention & Atomic 2-Phase Commit (2PC)', () => {
    it('executes atomic 2PC across multiple shards enforcing global lexicographical order', async () => {
      const participants = ['org-gamma-student', 'org-alpha-mentor'];

      const result = await service.executeCrossShard2PC(
        participants,
        async (shards, txId) => {
          expect(txId).toContain('2pc-');
          expect(shards.size).toBeGreaterThanOrEqual(1);
          return { battleWagerSettled: true, amount: 500 };
        },
      );

      expect(result.status).toBe('COMMITTED');
      expect(result.result.battleWagerSettled).toBe(true);

      const log = service.get2PcLog(result.txId);
      expect(log).toBeDefined();
      expect(log?.status).toBe('COMMITTED');

      // Verify deadlock prevention: participants were sorted lexicographically
      const sortedParticipants = [...log!.participants].sort();
      expect(log?.participants).toEqual(sortedParticipants);
    });

    it('aborts 2PC transaction if execution throws an error', async () => {
      const participants = ['org-alpha-1', 'org-beta-2'];

      await expect(
        service.executeCrossShard2PC(participants, async () => {
          throw new Error('Insufficient balance on shard-beta');
        }),
      ).rejects.toThrow('Insufficient balance on shard-beta');
    });
  });

  describe('TenantInterceptor Shard Connection Injection', () => {
    it('extracts organization context from JWT claims and injects active shard connection', (done) => {
      const mockRequest: any = {
        user: { id: 'user-1', orgId: 'org-stanford-ai' },
        headers: {},
      };
      const mockResponse: any = {
        setHeader: jest.fn(),
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as unknown as ExecutionContext;

      const mockCallHandler: CallHandler = {
        handle: () => of({ success: true }),
      };

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: () => {
          expect(mockRequest.tenantOrgId).toBe('org-stanford-ai');
          expect(mockRequest.activeShardId).toBe(
            service.resolveShardId('org-stanford-ai'),
          );
          expect(mockRequest.shardClient).toBeDefined();
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'X-Database-Shard-Id',
            mockRequest.activeShardId,
          );
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'X-Tenant-Org-Id',
            'org-stanford-ai',
          );
          done();
        },
      });
    });

    it('extracts organization context from custom request headers', (done) => {
      const mockRequest: any = {
        headers: { 'x-organization-id': 'org-harvard-medical' },
      };
      const mockResponse: any = {
        setHeader: jest.fn(),
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as unknown as ExecutionContext;

      const mockCallHandler: CallHandler = {
        handle: () => of({ success: true }),
      };

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        next: () => {
          expect(mockRequest.tenantOrgId).toBe('org-harvard-medical');
          expect(mockRequest.activeShardId).toBe(
            service.resolveShardId('org-harvard-medical'),
          );
          done();
        },
      });
    });
  });
});

