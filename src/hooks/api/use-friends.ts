import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface FollowerUser {
  id: string;
  username: string;
  avatar?: string;
}

export function useFollowStatus(targetUserId?: string, targetUsername?: string) {
  const queryClient = useQueryClient();

  const followingQuery = useQuery({
    queryKey: ['friends', 'following', 'me'],
    queryFn: async () => {
      try {
        const res = await apiClient.get<any>('/friends/123/following');
        return res.data?.data || res.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 60 * 1000,
  });

  const followersQuery = useQuery({
    queryKey: ['friends', 'followers', targetUserId || targetUsername],
    queryFn: async () => {
      if (!targetUserId && !targetUsername) return [];
      try {
        const id = targetUserId || targetUsername;
        const res = await apiClient.get<any>(`/friends/${id}/followers`);
        return res.data?.data || res.data || [];
      } catch {
        return [];
      }
    },
    enabled: Boolean(targetUserId || targetUsername),
  });

  const isFollowing = Boolean(
    followingQuery.data?.some(
      (f: any) =>
        (targetUserId && (f.followingId === targetUserId || f.following?.id === targetUserId)) ||
        (targetUsername && f.following?.username?.toLowerCase() === targetUsername.toLowerCase())
    )
  );

  const followMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.post(`/friends/follow/${id}`);
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['friends', 'following', 'me'] });
      const previous = queryClient.getQueryData(['friends', 'following', 'me']);

      queryClient.setQueryData(['friends', 'following', 'me'], (old: any[] = []) => [
        ...old,
        { followingId: id, following: { id, username: targetUsername } },
      ]);

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['friends', 'following', 'me'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', 'following', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['friends', 'followers', targetUserId || targetUsername] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/friends/follow/${id}`);
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['friends', 'following', 'me'] });
      const previous = queryClient.getQueryData(['friends', 'following', 'me']);

      queryClient.setQueryData(['friends', 'following', 'me'], (old: any[] = []) =>
        old.filter((f: any) => f.followingId !== id && f.following?.id !== id)
      );

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['friends', 'following', 'me'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', 'following', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['friends', 'followers', targetUserId || targetUsername] });
    },
  });

  return {
    isFollowing,
    followersCount: followersQuery.data?.length,
    follow: (id: string) => followMutation.mutate(id),
    unfollow: (id: string) => unfollowMutation.mutate(id),
    isPending: followMutation.isPending || unfollowMutation.isPending,
  };
}
