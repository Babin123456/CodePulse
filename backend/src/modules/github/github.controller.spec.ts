import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';
import { CustomThrottlerGuard } from '../../common/guards/custom-throttler.guard';

describe('GithubController', () => {
  let controller: GithubController;
  let githubServiceMock: {
    getDeveloperAnalyticsCached: jest.Mock;
    getUserProfileCached: jest.Mock;
    getUserReposCached: jest.Mock;
    getUserEventsCached: jest.Mock;
    invalidateUserCache: jest.Mock;
    syncUser: jest.Mock;
  };

  beforeEach(async () => {
    githubServiceMock = {
      getDeveloperAnalyticsCached: jest.fn(),
      getUserProfileCached: jest.fn(),
      getUserReposCached: jest.fn(),
      getUserEventsCached: jest.fn(),
      invalidateUserCache: jest.fn(),
      syncUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GithubController],
      providers: [
        {
          provide: GithubService,
          useValue: githubServiceMock,
        },
      ],
    })
      .overrideGuard(CustomThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GithubController>(GithubController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDeveloperByQuery', () => {
    it('should throw BadRequestException if username is omitted in query', async () => {
      await expect(
        controller.getDeveloperByQuery({} as any, undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('should proxy developer analytics when username is provided in query', async () => {
      githubServiceMock.getDeveloperAnalyticsCached.mockResolvedValueOnce({
        username: 'octocat',
        score: 95,
      });

      const result = await controller.getDeveloperByQuery(
        { username: 'octocat', force: true },
        'Bearer test_token',
      );

      expect(githubServiceMock.getDeveloperAnalyticsCached).toHaveBeenCalledWith(
        'octocat',
        'test_token',
        true,
      );
      expect(result).toEqual({ username: 'octocat', score: 95 });
    });
  });

  describe('getDeveloper', () => {
    it('should proxy developer analytics by param username', async () => {
      githubServiceMock.getDeveloperAnalyticsCached.mockResolvedValueOnce({
        username: 'torvalds',
        score: 100,
      });

      const result = await controller.getDeveloper('torvalds', { force: false }, undefined);

      expect(githubServiceMock.getDeveloperAnalyticsCached).toHaveBeenCalledWith(
        'torvalds',
        undefined,
        false,
      );
      expect(result).toEqual({ username: 'torvalds', score: 100 });
    });
  });

  describe('getProfile', () => {
    it('should proxy user profile with caching options', async () => {
      githubServiceMock.getUserProfileCached.mockResolvedValueOnce({
        username: 'gaearon',
        publicRepos: 50,
      });

      const result = await controller.getProfile('gaearon', { refresh: true }, undefined);

      expect(githubServiceMock.getUserProfileCached).toHaveBeenCalledWith(
        'gaearon',
        undefined,
        true,
      );
      expect(result).toEqual({ username: 'gaearon', publicRepos: 50 });
    });
  });

  describe('getRepos', () => {
    it('should proxy user repos with pagination limit', async () => {
      githubServiceMock.getUserReposCached.mockResolvedValueOnce({
        repos: [{ name: 'repo-1' }],
      });

      const result = await controller.getRepos('octocat', { force: false }, '15', undefined);

      expect(githubServiceMock.getUserReposCached).toHaveBeenCalledWith(
        'octocat',
        undefined,
        false,
        15,
      );
      expect(result).toEqual({ repos: [{ name: 'repo-1' }] });
    });
  });

  describe('getEvents', () => {
    it('should proxy user events', async () => {
      githubServiceMock.getUserEventsCached.mockResolvedValueOnce({
        events: [{ type: 'PushEvent' }],
      });

      const result = await controller.getEvents('octocat', { force: false }, '20', undefined);

      expect(githubServiceMock.getUserEventsCached).toHaveBeenCalledWith(
        'octocat',
        undefined,
        false,
        20,
      );
      expect(result).toEqual({ events: [{ type: 'PushEvent' }] });
    });
  });

  describe('invalidateCache', () => {
    it('should trigger cache invalidation for the username', async () => {
      githubServiceMock.invalidateUserCache.mockResolvedValueOnce({
        invalidated: true,
        username: 'torvalds',
      });

      const result = await controller.invalidateCache('torvalds');

      expect(githubServiceMock.invalidateUserCache).toHaveBeenCalledWith('torvalds');
      expect(result).toEqual({ invalidated: true, username: 'torvalds' });
    });
  });

  describe('syncUser', () => {
    it('should trigger sync and cache invalidation for the user', async () => {
      githubServiceMock.syncUser.mockResolvedValueOnce({
        synced: true,
        username: 'torvalds',
      });

      const result = await controller.syncUser({ username: 'torvalds' }, 'Bearer token_123');

      expect(githubServiceMock.syncUser).toHaveBeenCalledWith('torvalds', 'token_123');
      expect(result).toEqual({ synced: true, username: 'torvalds' });
    });
  });

  describe('x-cache header', () => {
    const header = async (payload: Record<string, unknown>) => {
      githubServiceMock.getUserProfileCached.mockResolvedValueOnce(payload);
      const res = { setHeader: jest.fn() };
      await controller.getProfile('octocat', {} as any, undefined, res as any);
      return res.setHeader;
    };

    it('sets STALE-FALLBACK for stale responses', async () => {
      expect(await header({ cached: false, stale: true })).toHaveBeenCalledWith('x-cache', 'STALE-FALLBACK');
    });

    it('sets HIT for fresh cache hits and MISS for upstream fetches', async () => {
      expect(await header({ cached: true })).toHaveBeenCalledWith('x-cache', 'HIT');
      expect(await header({ cached: false })).toHaveBeenCalledWith('x-cache', 'MISS');
    });
  });
});
