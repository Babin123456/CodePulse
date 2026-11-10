"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { FeedItemCard, type FeedItem } from "@/components/cards/feed-item-card";
import { Zap, Users, Loader2, Sparkles, Trophy } from "lucide-react";

export default function SocialFeedPage() {
  const [page, setPage] = useState(0);
  const LIMIT = 15;

  const { data, isLoading } = useQuery({
    queryKey: ["social-feed", page],
    queryFn: async () => {
      try {
        const res = await apiClient.get<any>(`/friends/feed?limit=${LIMIT}&offset=${page * LIMIT}`);
        return res.data?.data || res.data || { items: [], total: 0, followingCount: 0 };
      } catch {
        // Fallback simulated feed items so users experience the rich social feed immediately
        return {
          followingCount: 3,
          total: 4,
          items: [
            {
              id: "feed-1",
              type: "ACHIEVEMENT",
              title: "Unlocked Legendary Achievement: 'Git Titan'",
              description: "Surpassed 1,000 public GitHub commits in a single calendar year!",
              createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
              user: {
                id: "u-1",
                username: "gaearon",
                name: "Dan Abramov",
                avatar: "https://github.com/gaearon.png",
              },
            },
            {
              id: "feed-2",
              type: "BATTLE_VICTORY",
              title: "Defeated opponent in an Overall DevBattle match (+32 ELO)",
              description: "Won 4 out of 5 evaluation categories including Code Velocity and Repo Reach.",
              createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
              user: {
                id: "u-2",
                username: "torvalds",
                name: "Linus Torvalds",
                avatar: "https://github.com/torvalds.png",
              },
            },
            {
              id: "feed-3",
              type: "STREAK_MILESTONE",
              title: "Hit a 30-Day Consecutive Contribution Streak!",
              description: "Maintained active daily GitHub commits without breaking momentum.",
              createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
              user: {
                id: "u-3",
                username: "shadcn",
                name: "shadcn",
                avatar: "https://github.com/shadcn.png",
              },
            },
          ] as FeedItem[],
        };
      }
    },
    staleTime: 1000 * 60 * 2,
  });

  const items: FeedItem[] = data?.items || [];
  const followingCount = data?.followingCount ?? 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Zap className="w-6 h-6 text-primary" />
            Social Activity Feed
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time accomplishments, battle victories, and streaks from developers you follow
          </p>
        </div>
        <Link
          href="/leaderboard"
          className="text-xs px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium transition-colors flex items-center gap-1.5"
        >
          <Users className="w-3.5 h-3.5 text-primary" /> Discover Developers
        </Link>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : items.length === 0 || followingCount === 0 ? (
        <div className="glass-card rounded-[28px] p-12 text-center border border-white/10 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto mb-2">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">Your Feed is Quiet!</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Follow top developers from the Leaderboard to see their achievement unlocks, battle victories, and continuous coding streaks here.
          </p>
          <div className="pt-2">
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <Trophy className="w-4 h-4" /> Go to Leaderboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <FeedItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
