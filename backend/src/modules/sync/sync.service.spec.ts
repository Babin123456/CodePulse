import { SyncService } from './sync.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GithubService } from '../github/github.service';

function fixture() {
  let state: any = { repos: [], activities: [], stats: {}, serial: 0 };
  const tx: any = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    developerStats: {
      upsert: jest.fn(async (args: any) => {
        state.stats[args.where.userId] = args.update;
      }),
    },
    user: { update: jest.fn() },
    languageStat: { upsert: jest.fn() },
    developerRating: { upsert: jest.fn() },
    repository: {
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const key = where.userId_githubRepoId;
        let row = state.repos.find(
          (r: any) =>
            r.userId === key.userId && r.githubRepoId === key.githubRepoId,
        );
        if (row) Object.assign(row, update);
        else {
          row = { id: `repo-${++state.serial}`, ...create };
          state.repos.push(row);
        }
        return row;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        state.repos
          .filter(
            (r: any) =>
              r.userId === where.userId &&
              !where.githubRepoId.notIn.includes(r.githubRepoId) &&
              r.archivedAt === null,
          )
          .forEach((r: any) => Object.assign(r, data));
      }),
    },
    activity: {
      findUnique: jest.fn(
        async ({ where }: any) =>
          state.activities.find(
            (r: any) =>
              r.userId === where.userId_githubEventId.userId &&
              r.githubEventId === where.userId_githubEventId.githubEventId,
          ) || null,
      ),
      findFirst: jest.fn(
        async ({ where }: any) =>
          state.activities.find(
            (r: any) =>
              r.userId === where.userId &&
              !r.githubEventId &&
              r.type === where.type &&
              r.repository === where.repository &&
              +r.createdAt === +where.createdAt,
          ) || null,
      ),
      update: jest.fn(async ({ where, data }: any) =>
        Object.assign(
          state.activities.find((r: any) => r.id === where.id),
          data,
        ),
      ),
      create: jest.fn(async ({ data }: any) => {
        state.activities.push({ id: `act-${++state.serial}`, ...data });
      }),
    },
  };
  const prisma: any = {
    $transaction: jest.fn(async (callback: any) => {
      const before = structuredClone(state);
      try {
        return await callback(tx);
      } catch (error) {
        state = before;
        throw error;
      }
    }),
  };
  const data: any = {
    repositories: {
      nodes: [
        {
          id: 'github-repo',
          name: 'demo',
          nameWithOwner: 'owner/demo',
          createdAt: '2026-01-01T00:00:00Z',
          stargazerCount: 4,
        },
      ],
      pageInfo: { hasNextPage: false },
    },
  };
  const events: any[] = [
    {
      id: 'event-1',
      type: 'PushEvent',
      repo: { name: 'owner/demo' },
      created_at: '2026-11-01T00:00:00Z',
      payload: { commits: [{}] },
    },
  ];
  const github: any = {
    fetchUserData: jest.fn(async () => data),
    fetchUserEvents: jest.fn(async () => events),
  };
  return {
    service: new SyncService(prisma as PrismaService, github as GithubService),
    prisma,
    github,
    tx,
    data,
    events,
    state: () => state,
  };
}

describe('differential GitHub sync', () => {
  it('repeated sync updates GitHub stats while preserving IDs, local metadata and old activities', async () => {
    const f = fixture();
    await f.service.syncUserData('u1', 'owner', 'test-token');
    const repo = f.state().repos[0];
    repo.pinned = true;
    const id = repo.id;
    f.state().activities[0].metadata = { bookmark: true };
    f.state().activities.push({
      id: 'historical',
      userId: 'u1',
      title: 'Old contribution',
    });
    f.data.repositories.nodes[0].stargazerCount = 19;
    await f.service.syncUserData('u1', 'owner', 'test-token');
    expect(f.state().repos).toHaveLength(1);
    expect(repo.id).toBe(id);
    expect(repo.pinned).toBe(true);
    expect(repo.stars).toBe(19);
    expect(f.state().activities).toHaveLength(2);
    expect(f.state().activities[0].metadata).toEqual({ bookmark: true });
    expect(f.github.fetchUserEvents).toHaveBeenCalledWith(
      'owner',
      'test-token',
      30,
      true,
    );
    expect(f.tx.$queryRaw).toHaveBeenCalledTimes(2);
  });
  it('the same GitHub repo/event can belong to different users', async () => {
    const f = fixture();
    await f.service.syncUserData('u1', 'owner', 'token');
    await f.service.syncUserData('u2', 'owner', 'token');
    expect(f.state().repos).toHaveLength(2);
    expect(f.state().activities).toHaveLength(2);
  });
  it('adopts an exact legacy activity without deleting its metadata or identity', async () => {
    const f = fixture();
    f.state().activities.push({
      id: 'legacy',
      userId: 'u1',
      type: 'COMMIT',
      repository: 'owner/demo',
      createdAt: new Date(f.events[0].created_at),
      metadata: { saved: true },
    });
    await f.service.syncUserData('u1', 'owner', 'token');
    expect(f.state().activities).toHaveLength(1);
    expect(f.state().activities[0]).toMatchObject({
      id: 'legacy',
      githubEventId: 'github:event-1',
      metadata: { saved: true },
    });
  });
  it('only a confirmed complete repo page archives missing records and reappearance restores them', async () => {
    const f = fixture();
    await f.service.syncUserData('u1', 'owner', 'token');
    const node = f.data.repositories.nodes[0];
    f.data.repositories.nodes = [];
    f.data.repositories.pageInfo.hasNextPage = true;
    await f.service.syncUserData('u1', 'owner', 'token');
    expect(f.state().repos[0].archivedAt).toBeNull();
    delete f.data.repositories.pageInfo;
    await f.service.syncUserData('u1', 'owner', 'token');
    expect(f.state().repos[0].archivedAt).toBeNull();
    f.data.repositories.pageInfo = { hasNextPage: false };
    await f.service.syncUserData('u1', 'owner', 'token');
    expect(f.state().repos[0].archivedAt).toBeInstanceOf(Date);
    f.data.repositories.nodes = [node];
    await f.service.syncUserData('u1', 'owner', 'token');
    expect(f.state().repos[0].archivedAt).toBeNull();
  });
  it('remote event failure opens no write transaction', async () => {
    const f = fixture();
    f.github.fetchUserEvents.mockRejectedValueOnce(
      new Error('network failure'),
    );
    await expect(
      f.service.syncUserData('u1', 'owner', 'token'),
    ).rejects.toThrow('network failure');
    expect(f.prisma.$transaction).not.toHaveBeenCalled();
  });
  it('late repository failure rolls back earlier stats and timeline writes and is propagated', async () => {
    const f = fixture();
    f.tx.repository.upsert.mockRejectedValueOnce(new Error('database failure'));
    await expect(
      f.service.syncUserData('u1', 'owner', 'token'),
    ).rejects.toThrow('database failure');
    expect(f.state()).toMatchObject({ repos: [], activities: [], stats: {} });
  });
  it('missing external event IDs use a repeatable composite key', async () => {
    const f = fixture();
    delete f.events[0].id;
    await f.service.syncUserData('u1', 'owner', 'token');
    await f.service.syncUserData('u1', 'owner', 'token');
    expect(f.state().activities).toHaveLength(1);
    expect(f.state().activities[0].githubEventId).toMatch(/^fallback:/);
  });
  it('invalid repository identities and incomplete responses fail without committed changes', async () => {
    const f = fixture();
    delete f.data.repositories.nodes[0].id;
    await expect(
      f.service.syncUserData('u1', 'owner', 'token'),
    ).rejects.toThrow('identity');
    expect(f.state().activities).toHaveLength(0);
    delete f.data.repositories.nodes;
    await expect(
      f.service.syncUserData('u1', 'owner', 'token'),
    ).rejects.toThrow('Incomplete');
  });
});
