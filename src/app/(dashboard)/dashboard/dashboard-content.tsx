"use client";

import { StaggerContainer, StaggerItem } from "@/components/animations/page-transition";
import { DeveloperRatingCard } from "@/components/cards/developer-rating-card";
import { ChallengeCard } from "@/components/cards/challenge-card";
import { AchievementCard } from "@/components/cards/achievement-card";
import { LeaderboardPreview } from "@/components/cards/leaderboard-preview";
import { WelcomeHeroBanner } from "@/components/cards/welcome-hero-banner";
import { ActivityTimeline } from "@/components/data-display/activity-timeline";
import { AnimatedCounter } from "@/components/animations/animated-counter";
import { useCurrentUser } from "@/hooks/api/use-auth";
import { useActiveChallenges } from "@/hooks/api/use-challenges";
import { useLeaderboardInfinite } from "@/hooks/api/use-leaderboard";
import { useSyncGitHub } from "@/hooks/api/use-sync";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { GitCommit, GitPullRequest, Flame, Star, Loader2, Trophy, Swords, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  GitCommit,
  GitPullRequest,
  Flame,
  Star,
};

export function DashboardContent() {
  const { data: currentUser, isLoading } = useCurrentUser();
  const { data: challengesData } = useActiveChallenges();
  const { data: leaderboardData, isLoading: isLeaderboardLoading } = useLeaderboardInfinite("friends", 5);
  const {
    sync,
    isSyncing,
    isOnCooldown,
    canSync,
    cooldownText,
    lastSyncedText,
    tooltipText,
  } = useSyncGitHub({ username: currentUser?.username });

  const leaderboardDevs = leaderboardData?.pages[0]?.data || [];

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        <p className="text-sm text-slate-400">Loading developer profile...</p>
      </div>
    );
  }

  const achievements = (currentUser as any).achievements || [];
  const activeChallenges = (challengesData || []).filter((c: any) => !c.isCompleted).slice(0, 4);
  const rating = (currentUser as any).rating || { overall: 0, level: 1, xp: 0, xpToNextLevel: 100, rank: 0, tier: "BRONZE", totalDevelopers: 0, growthScore: 0 };
  
  const leaderboardEntries = (leaderboardDevs || []).map((dev: any, index: number) => ({
    developer: dev,
    rank: index + 1,
    score: dev.rating?.overall || 0,
    trend: 'up',
    trendValue: 1,
    previousRank: index + 1,
    change: 0
  }));

  const statsData = [
    { title: "Total Commits", value: (currentUser as any).stats?.totalCommits || 0, icon: "GitCommit", color: "text-purple-400", bg: "bg-purple-500/10" },
    { title: "Pull Requests", value: (currentUser as any).stats?.totalPRs || 0, icon: "GitPullRequest", color: "text-blue-400", bg: "bg-blue-500/10" },
    { title: "Total Stars", value: (currentUser as any).stats?.totalStars || 0, icon: "Star", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { title: "Current Streak", value: (currentUser as any).stats?.streak || 0, icon: "Flame", color: "text-orange-400", bg: "bg-orange-500/10", suffix: "days" },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* 0. Dashboard Header Bar with Sync Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Dashboard
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time developer analytics, rating milestones, and quests
          </p>
        </div>

        {/* Sync Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Relative Last Synced Badge */}
          <div
            data-testid="last-synced-badge"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-slate-300 backdrop-blur-sm"
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                isSyncing
                  ? "bg-amber-400 animate-ping"
                  : isOnCooldown
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                  : "bg-slate-400"
              )}
            />
            <span>{lastSyncedText}</span>
          </div>

          {/* Sync with GitHub Button with Tooltip */}
          <Tooltip>
            <TooltipTrigger render={<div className="inline-block" />}>
              <button
                type="button"
                onClick={sync}
                disabled={!canSync}
                data-testid="sync-github-button"
                className={cn(
                  "relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 select-none",
                  canSync
                    ? "bg-purple-600 hover:bg-purple-500 active:scale-95 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 cursor-pointer"
                    : "bg-white/5 border border-white/10 text-slate-400 cursor-not-allowed opacity-80"
                )}
                aria-label={
                  isOnCooldown
                    ? `Sync available in ${cooldownText}`
                    : "Sync with GitHub"
                }
              >
                <RefreshCw
                  className={cn(
                    "w-4 h-4",
                    isSyncing && "animate-spin text-purple-300"
                  )}
                />
                <span>
                  {isSyncing
                    ? "Syncing..."
                    : isOnCooldown
                    ? `Sync available in ${cooldownText}`
                    : "Sync with GitHub"}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8}>
              {tooltipText}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* 1. Welcome Hero Banner */}
      <WelcomeHeroBanner user={currentUser} rating={rating} />

      {/* 2. The Pulse (Quick Stats) */}
      <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsData.map((stat) => {
          const Icon = iconMap[stat.icon];
          return (
            <StaggerItem key={stat.title}>
              <div className="glass-card rounded-[24px] p-6 border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all duration-300 h-full">
                <div className={cn("absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[50px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700", stat.bg)} />
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("p-2.5 rounded-xl", stat.bg)}>
                    <Icon className={cn("w-5 h-5", stat.color)} />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white flex items-baseline gap-1">
                    <AnimatedCounter value={stat.value} decimals={0} />
                    {stat.suffix && <span className="text-sm font-medium text-slate-500 ml-1">{stat.suffix}</span>}
                  </h3>
                  <p className="text-sm font-medium text-slate-400 mt-1">{stat.title}</p>
                </div>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* 3. The Arena (Rating + Leaderboard) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DeveloperRatingCard rating={rating} />
        <div className="lg:col-span-2 h-full">
          <LeaderboardPreview entries={leaderboardEntries} isLoading={isLeaderboardLoading} />
        </div>
      </div>

      {/* 4. The Quest Board (Challenges + Achievements) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Challenges */}
        <div className="glass-card rounded-[32px] p-8 border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-red-500/10 transition-colors duration-700" />
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2 bg-red-500/20 rounded-xl border border-red-500/20">
              <Swords className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Active Quests</h2>
              <p className="text-xs text-slate-400 mt-1">Complete these challenges to earn XP.</p>
            </div>
          </div>
          
          <div className="relative z-10">
            {activeChallenges.length > 0 ? (
              <div className="space-y-3">
                {activeChallenges.map((challenge: any) => (
                  <ChallengeCard key={challenge.id} challenge={challenge} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Swords className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-slate-400 font-medium">No active quests right now.</p>
                <p className="text-xs text-slate-500 mt-1">Check back later for new battles.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Achievements */}
        <div className="glass-card rounded-[32px] p-8 border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/10 transition-colors duration-700" />
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/20">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Trophy Room</h2>
              <p className="text-xs text-slate-400 mt-1">Your recently unlocked achievements.</p>
            </div>
          </div>

          <div className="relative z-10">
            {achievements.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {achievements.slice(0, 4).map((achievement: any) => (
                  <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Trophy className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-slate-400 font-medium">No achievements yet.</p>
                <p className="text-xs text-slate-500 mt-1">Keep pushing code to unlock badges.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Activity Radar (Timeline) */}
      <div className="glass-card rounded-[32px] p-8 border border-white/5 relative overflow-hidden group">
        <ActivityTimeline activities={(currentUser as any).activities || []} maxItems={8} />
      </div>
    </div>
  );
}
