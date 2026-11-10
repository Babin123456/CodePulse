import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useCurrentUser,
  saveAuthToken,
  clearAuthToken,
  useHasAuthToken,
} from './use-auth';
import { apiClient } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';

// Mock Supabase Client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

// Mock API Client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
  extractData: vi.fn((res) => res?.data?.data ?? res?.data),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useCurrentUser & Auth Helpers Test Suite', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    };
    (createClient as any).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Auth Token Store Helpers', () => {
    it('saves and clears auth token in localStorage and triggers events', () => {
      expect(localStorage.getItem('devbattle_token')).toBeNull();

      saveAuthToken('token_abc_123');
      expect(localStorage.getItem('devbattle_token')).toBe('token_abc_123');

      clearAuthToken();
      expect(localStorage.getItem('devbattle_token')).toBeNull();
    });

    it('useHasAuthToken correctly reflects presence of token', () => {
      const { result } = renderHook(() => useHasAuthToken());
      expect(result.current).toBe(false);

      act(() => {
        saveAuthToken('test-token');
      });
      expect(result.current).toBe(true);

      act(() => {
        clearAuthToken();
      });
      expect(result.current).toBe(false);
    });
  });

  describe('useCurrentUser hook flows', () => {
    it('1. Authenticated Flow: resolves profile when backend returns 200 OK', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'sb-user-1',
            email: 'dev@codepulse.io',
            user_metadata: {
              user_name: 'octocat',
              full_name: 'The Octocat',
              avatar_url: 'https://github.com/octocat.png',
            },
          },
        },
      });

      const mockBackendUser = {
        id: 'db-1',
        username: 'octocat',
        name: 'The Octocat',
        avatar: 'https://github.com/octocat.png',
        rating: { overall: 1500, tier: 'Diamond' },
        stats: { totalCommits: 1200, totalPRs: 85 },
      };

      (apiClient.get as any).mockResolvedValueOnce({
        data: {
          success: true,
          data: mockBackendUser,
        },
      });

      const { result } = renderHook(() => useCurrentUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.username).toBe('octocat');
      expect(result.current.data?.rating?.tier).toBe('Diamond');
      expect(apiClient.get).toHaveBeenCalledWith('/users/octocat');
    });

    it('2. Backend Failure with Authenticated Supabase session: falls back gracefully to Supabase metadata', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'sb-user-2',
            email: 'coder@test.com',
            user_metadata: {
              user_name: 'testcoder',
              name: 'Test Coder',
              avatar_url: 'https://avatar.url/img.png',
              bio: 'OSS Contributor',
            },
          },
        },
      });

      // Backend fails with 500 error
      (apiClient.get as any).mockRejectedValueOnce(new Error('Internal Server Error 500'));

      const { result } = renderHook(() => useCurrentUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const user = result.current.data;
      expect(user).not.toBeNull();
      expect(user?.username).toBe('testcoder');
      expect(user?.name).toBe('Test Coder');
      expect(user?.rating?.tier).toBe('Gold');
      expect(user?.stats?.totalCommits).toBe(447);
    });

    it('3. Unauthenticated Flow with legacy localStorage token', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
      });

      localStorage.setItem('devbattle_token', 'legacy_token_xyz');

      (apiClient.get as any).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            id: 'legacy-id',
            username: 'legacyuser',
            name: 'Legacy User',
          },
        },
      });

      const { result } = renderHook(() => useCurrentUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.username).toBe('legacyuser');
      expect(apiClient.get).toHaveBeenCalledWith('/users/profile');
    });

    it('4. Guest Flow (no Supabase session, no token): falls back to default profile', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
      });

      (apiClient.get as any).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            id: 'default-id',
            username: 'code-with-abhi-i5',
            name: 'Abhijeet',
          },
        },
      });

      const { result } = renderHook(() => useCurrentUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.username).toBe('code-with-abhi-i5');
      expect(apiClient.get).toHaveBeenCalledWith('/users/code-with-abhi-i5');
    });

    it('5. Network Failure on all endpoints: returns null safely without throwing uncaught errors', async () => {
      mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Supabase unreachable'));
      (apiClient.get as any).mockRejectedValueOnce(new Error('Backend offline'));

      const { result } = renderHook(() => useCurrentUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeNull();
    });
  });
});
