import { useQuery } from '@tanstack/react-query';
import { apiClient, extractData } from '@/lib/api-client';
import type { User } from '@/hooks/api/use-auth';

export function usePublicUserProfile(username: string) {
  return useQuery({
    queryKey: ['users', 'public-profile', username],
    queryFn: async (): Promise<User | null> => {
      if (!username) return null;
      try {
        const response = await apiClient.get(`/users/${encodeURIComponent(username)}`);
        return extractData<User>(response);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          return null;
        }
        // Fallback to developer proxy route if direct backend is unreachable
        try {
          const fallbackRes = await fetch(`/api/github/developer?username=${encodeURIComponent(username)}`);
          if (fallbackRes.ok) {
            const devData = await fallbackRes.json();
            return {
              id: devData.id || username,
              username: devData.username || username,
              name: devData.name || username,
              avatar: devData.avatar,
              bio: devData.bio,
              location: devData.location,
              company: devData.company,
              joinedAt: devData.joinedAt,
              rating: {
                overall: devData.score || 0,
                tier: devData.globalRank?.title || 'Bronze',
                level: Math.floor((devData.score || 0) / 100) + 1,
                xp: (devData.score || 0) * 10,
                xpToNextLevel: (Math.floor((devData.score || 0) / 100) + 1) * 1000,
              },
              stats: devData.stats || {
                totalCommits: 0,
                totalPRs: 0,
                totalStars: 0,
                streak: 0,
                totalRepos: 0,
                followers: 0,
                following: 0,
              },
              repositories: [],
              languages: devData.topLanguages?.map((l: any) => ({
                language: l.name,
                percentage: l.count,
                color: '#38bdf8',
              })) || [],
            };
          }
        } catch {
          // ignore
        }
        return null;
      }
    },
    enabled: Boolean(username),
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
