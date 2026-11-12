import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpException, NotFoundException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { GithubService } from './github.service';
import {
  GITHUB_CACHE_KEYS,
  GITHUB_CACHE_TTL,
} from './constants/cache.constants';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GithubService', () => {
  let service: GithubService;
  let cacheManagerMock: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(async () => {
    cacheManagerMock = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GITHUB_TOKEN') return 'mock_token';
              return null;
            }),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManagerMock,
        },
      ],
    }).compile();

    service = module.get<GithubService>(GithubService);
    jest.clearAllMocks();
  });

  describe('Caching Strategy', () => {
    const username = 'testuser';

    it('should return cached developer analytics on cache HIT without calling GitHub API', async () => {
      const mockCachedData = {
        username: 'testuser',
        score: 85,
        stats: { totalCommits: 100 },
      };
      cacheManagerMock.get.mockResolvedValueOnce(mockCachedData);

      const result = await service.getDeveloperAnalyticsCached(username, undefined, false);

      expect(cacheManagerMock.get).toHaveBeenCalledWith(GITHUB_CACHE_KEYS.DEVELOPER(username));
      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(result).toEqual({
        ...mockCachedData,
        cached: true,
      });
    });

    it('should fetch from GitHub API on cache MISS and store in cache with 5m TTL', async () => {
      cacheManagerMock.get.mockResolvedValueOnce(null);

      // Mock GitHub API responses
      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('/users/testuser/repos')) {
          return Promise.resolve({ data: [{ stargazers_count: 10, language: 'TypeScript', topics: ['react'] }] });
        }
        if (url.includes('/search/issues')) {
          return Promise.resolve({ data: { total_count: 5 } });
        }
        if (url.includes('/search/commits')) {
          return Promise.resolve({ data: { total_count: 50 } });
        }
        if (url.includes('/users/testuser/events')) {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('github-contributions-api')) {
          return Promise.resolve({ status: 200, data: { contributions: [] } });
        }
        // User profile
        return Promise.resolve({
          data: {
            id: 12345,
            login: 'testuser',
            name: 'Test User',
            avatar_url: 'https://avatar.url',
            public_repos: 10,
            followers: 20,
            created_at: '2022-01-01T00:00:00Z',
          },
        });
      });

      const result = await service.getDeveloperAnalyticsCached(username, undefined, false);

      expect(cacheManagerMock.get).toHaveBeenCalledWith(GITHUB_CACHE_KEYS.DEVELOPER(username));
      expect(cacheManagerMock.set).toHaveBeenCalledWith(
        GITHUB_CACHE_KEYS.DEVELOPER(username),
        expect.objectContaining({ username: 'testuser' }),
        GITHUB_CACHE_TTL.DEVELOPER,
      );
      expect(result.cached).toBe(false);
      expect(result).toMatchObject({ username: 'testuser' });
    });

    it('should evict cache and fetch fresh when forceRefresh is true', async () => {
      cacheManagerMock.get.mockResolvedValueOnce({ old: 'data' });

      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('/users/testuser/repos')) return Promise.resolve({ data: [] });
        if (url.includes('/search/issues')) return Promise.resolve({ data: { total_count: 0 } });
        if (url.includes('/search/commits')) return Promise.resolve({ data: { total_count: 0 } });
        if (url.includes('/users/testuser/events')) return Promise.resolve({ data: [] });
        if (url.includes('github-contributions-api')) return Promise.resolve({ status: 200, data: { contributions: [] } });
        return Promise.resolve({
          data: {
            id: 12345,
            login: 'testuser',
            name: 'Test User',
            avatar_url: 'https://avatar.url',
            public_repos: 1,
            followers: 0,
            created_at: '2022-01-01T00:00:00Z',
          },
        });
      });

      const result = await service.getDeveloperAnalyticsCached(username, undefined, true);

      expect(cacheManagerMock.del).toHaveBeenCalledWith(GITHUB_CACHE_KEYS.DEVELOPER(username));
      expect(cacheManagerMock.get).not.toHaveBeenCalled();
      expect(result.cached).toBe(false);
    });

    it('should cache public profile with 10m TTL on cache MISS', async () => {
      cacheManagerMock.get.mockResolvedValueOnce(null);
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          id: 999,
          login: 'testuser',
          name: 'Profile Tester',
          public_repos: 15,
        },
      });

      const result = await service.getUserProfileCached(username, undefined, false);

      expect(cacheManagerMock.set).toHaveBeenCalledWith(
        GITHUB_CACHE_KEYS.PROFILE(username),
        expect.objectContaining({ username: 'testuser', name: 'Profile Tester' }),
        GITHUB_CACHE_TTL.PROFILE,
      );
      expect(result.cached).toBe(false);
    });

    it('should cache public repos with 5m TTL on cache MISS', async () => {
      cacheManagerMock.get.mockResolvedValueOnce(null);
      mockedAxios.get.mockResolvedValueOnce({
        data: [{ id: 1, name: 'repo-1', stargazers_count: 5 }],
      });

      const result = await service.getUserReposCached(username, undefined, false, 30);

      expect(cacheManagerMock.set).toHaveBeenCalledWith(
        `${GITHUB_CACHE_KEYS.REPOS(username)}:30`,
        expect.any(Array),
        GITHUB_CACHE_TTL.REPOS,
      );
      expect(result.cached).toBe(false);
    });

    it('should invalidate all user cache keys in invalidateUserCache', async () => {
      const result = await service.invalidateUserCache('TestUser');

      expect(cacheManagerMock.del).toHaveBeenCalledWith('github:developer:testuser');
      expect(cacheManagerMock.del).toHaveBeenCalledWith('github:profile:testuser');
      expect(cacheManagerMock.del).toHaveBeenCalledWith('github:repos:testuser:30');
      expect(cacheManagerMock.del).toHaveBeenCalledWith('github:events:testuser:30');
      expect(result.invalidated).toBe(true);
      expect(result.username).toBe('TestUser');
    });
  });

  describe('Error & Rate Limit Handling', () => {
    it('should throw NotFoundException on 404 from GitHub', async () => {
      cacheManagerMock.get.mockResolvedValueOnce(null);
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 404, data: { message: 'Not Found' } },
        message: 'Request failed with status code 404',
      });

      await expect(
        service.getDeveloperAnalyticsCached('nonexistent_user', undefined, false),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw HttpException with 429 status when GitHub API rate limit is exceeded', async () => {
      cacheManagerMock.get.mockResolvedValueOnce(null);
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 403,
          data: { message: 'API rate limit exceeded for IP' },
        },
        message: 'Request failed with status code 403',
      });

      await expect(
        service.getDeveloperAnalyticsCached('ratelimited_user', undefined, false),
      ).rejects.toThrow(HttpException);

      try {
        await service.getDeveloperAnalyticsCached('ratelimited_user', undefined, false);
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });
  });
  it('propagates event failures for strict sync callers while keeping proxy fallback behavior', async () => {
    mockedAxios.get.mockRejectedValue(new Error('offline'));
    await expect(service.fetchUserEvents('owner', 'token', 30, true)).rejects.toThrow('offline');
    await expect(service.fetchUserEvents('owner', 'token')).resolves.toEqual([]);
  });
});

