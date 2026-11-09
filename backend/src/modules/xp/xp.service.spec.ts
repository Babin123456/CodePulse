import { XpService } from './xp.service';
import { LevelsService, tierForLevel } from '../levels/levels.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Tier } from '@prisma/client';

function fixture() {
  let state = {
    rating: {
      userId: 'user',
      xp: 0,
      level: 1,
      xpToNextLevel: 100,
      tier: Tier.BRONZE,
    },
    ledger: [] as any[],
    notices: [] as any[],
    activities: [] as any[],
  };
  const tx: any = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    developerRating: {
      findUnique: jest.fn(async () => ({ ...state.rating })),
      update: jest.fn(async ({ data }: any) => {
        const patch = { ...data };
        if (patch.xp?.increment)
          patch.xp = state.rating.xp + patch.xp.increment;
        Object.assign(state.rating, patch);
        return { ...state.rating };
      }),
    },
    xpTransaction: {
      create: jest.fn(async ({ data }: any) => {
        state.ledger.push({ ...data });
      }),
    },
    notification: {
      create: jest.fn(async ({ data }: any) => {
        state.notices.push({ ...data });
      }),
    },
    activity: {
      create: jest.fn(async ({ data }: any) => {
        state.activities.push({ ...data });
      }),
    },
  };
  let pending = Promise.resolve();
  const prisma: any = {
    $transaction: jest.fn((callback: any) => {
      const run = pending.then(async () => {
        const snapshot = structuredClone(state);
        try {
          return await callback(tx);
        } catch (error) {
          state = snapshot;
          throw error;
        }
      });
      pending = run.catch(() => undefined);
      return run;
    }),
  };
  const levels = new LevelsService(prisma as PrismaService);
  return {
    state: () => state,
    tx,
    prisma,
    levels,
    service: new XpService(prisma as PrismaService, levels),
  };
}

describe('atomic XP awards and tier progression', () => {
  it('appends an award without consuming cumulative XP', async () => {
    const f = fixture();
    const result = await f.service.addXp({
      userId: 'user',
      amount: 40,
      reason: 'Challenge',
      source: 'CHALLENGE_COMPLETED',
    });
    expect(result.xp).toBe(40);
    expect(f.state().ledger).toEqual([
      {
        userId: 'user',
        amount: 40,
        source: 'CHALLENGE_COMPLETED',
        description: 'Challenge',
      },
    ]);
    expect(f.state().notices).toHaveLength(0);
  });
  it('crossing multiple levels creates a single final-level notification/activity in the same transaction', async () => {
    const f = fixture();
    const result = await f.service.addXp({
      userId: 'user',
      amount: 1700,
      reason: 'Milestone',
    });
    expect(result).toMatchObject({
      xp: 1700,
      level: 5,
      xpToNextLevel: 2500,
      tier: Tier.SILVER,
    });
    expect(f.state().notices).toHaveLength(1);
    expect(f.state().notices[0].type).toBe('LEVEL_UP');
    expect(f.state().activities[0].metadata).toEqual({
      levelBefore: 1,
      levelAfter: 5,
      tier: Tier.SILVER,
    });
    expect(f.state().ledger[0].source).toBe('MANUAL');
    expect(f.prisma.$transaction).toHaveBeenCalledTimes(1);
  });
  it('exact threshold and repeated checks do not duplicate level-up messages', async () => {
    const f = fixture();
    await f.service.addXp({
      userId: 'user',
      amount: 100,
      reason: 'First level',
    });
    await f.levels.checkAndLevelUp('user');
    expect(f.state().rating.level).toBe(2);
    expect(f.state().notices).toHaveLength(1);
    expect(f.state().ledger).toHaveLength(1);
  });
  it('20 serialized concurrent awards retain every audit row and exact total', async () => {
    const f = fixture();
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        f.service.addXp({
          userId: 'user',
          amount: 10 + i,
          reason: `award-${i}`,
        }),
      ),
    );
    expect(f.state().rating.xp).toBe(390);
    expect(f.state().rating.level).toBe(2);
    expect(f.state().ledger).toHaveLength(20);
    expect(f.tx.$queryRaw).toHaveBeenCalledTimes(20);
  });
  it('ledger and level-notification failures roll back all award state', async () => {
    for (const part of ['xpTransaction', 'notification']) {
      const f = fixture();
      f.tx[part].create.mockRejectedValueOnce(new Error('injected failure'));
      await expect(
        f.service.addXp({ userId: 'user', amount: 100, reason: 'rollback' }),
      ).rejects.toThrow('injected failure');
      expect(f.state().rating.xp).toBe(0);
      expect(f.state().ledger).toHaveLength(0);
      expect(f.state().notices).toHaveLength(0);
    }
  });
  it('rejects malformed amounts, empty descriptions and overflow before committing', async () => {
    const f = fixture();
    for (const amount of [0, -1, 1.5, Infinity, 2147483648])
      await expect(
        f.service.addXp({ userId: 'user', amount, reason: 'invalid' }),
      ).rejects.toThrow();
    await expect(
      f.service.addXp({ userId: 'user', amount: 1, reason: ' ' }),
    ).rejects.toThrow();
    expect(f.state().ledger).toHaveLength(0);
  });
  it('maps every supported tier boundary and repairs stale tiers without a level-up notification', async () => {
    for (const [level, tier] of [
      [1, 'BRONZE'],
      [5, 'SILVER'],
      [10, 'GOLD'],
      [20, 'PLATINUM'],
      [30, 'DIAMOND'],
      [40, 'MASTER'],
      [50, 'GRANDMASTER'],
    ] as const)
      expect(tierForLevel(level)).toBe(tier);
    const f = fixture();
    Object.assign(f.state().rating, {
      level: 10,
      xp: 8100,
      xpToNextLevel: 10000,
    });
    await f.levels.checkAndLevelUp('user');
    expect(f.state().rating.tier).toBe('GOLD');
    expect(f.state().notices).toHaveLength(0);
  });
  it('missing rating rejects without an audit row', async () => {
    const f = fixture();
    f.tx.developerRating.findUnique.mockResolvedValue(null);
    await expect(
      f.service.addXp({ userId: 'user', amount: 1, reason: 'missing' }),
    ).rejects.toThrow('not found');
    expect(f.state().ledger).toHaveLength(0);
  });
});
