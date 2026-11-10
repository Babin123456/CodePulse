"use client";

import { use } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { usePublicUserProfile } from "@/hooks/api/use-user-profile";
import { useCurrentUser } from "@/hooks/api/use-auth";
import { AnimatedCounter, AnimatedProgress } from "@/components/animations/animated-counter";
import { StaggerContainer, StaggerItem } from "@/components/animations/page-transition";
import { LanguageDistribution } from "@/components/charts/language-distribution";
import { ContributionHeatmap } from "@/components/charts/contribution-heatmap";
import { GithubIcon } from "@/components/icons/github";
import { TIER_COLORS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import {
  MapPin,
  Building,
  Globe,
  Calendar,
  Star,
  GitFork,
  GitCommit,
  GitPullRequest,
  Eye,
  Flame,
  Code,
  ExternalLink,
  Crown,
  Swords,
  BarChart3,
  Search,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const router = useRouter();
  const { data: user, isLoading } = usePublicUserProfile(username);
  const { data: currentUser } = useCurrentUser();
  const [searchInput, setSearchInput] = useState("");

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-6">
        <div className="glass-card rounded-[24px] p-8 animate-pulse space-y-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-28 h-28 rounded-3xl bg-white/5 shrink-0" />
            <div className="space-y-3 flex-1 text-center sm:text-left w-full">
              <div className="h-7 w-48 bg-white/5 rounded-lg mx-auto sm:mx-0" />
              <div className="h-4 w-32 bg-white/5 rounded-lg mx-auto sm:mx-0" />
              <div className="flex flex-wrap gap-4 justify-center sm:justify-start pt-2">
                <div className="h-4 w-24 bg-white/5 rounded" />
                <div className="h-4 w-28 bg-white/5 rounded" />
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-[16px] p-5 h-24 animate-pulse bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  // Developer Not Found 404 State
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="glass-card rounded-[32px] p-10 md:p-14 border border-white/10 relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Developer Not Found
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8">
            We couldn&apos;t locate a CodePulse profile for{" "}
            <span className="text-white font-mono font-semibold">@{username}</span>.
            Search another GitHub handle below or discover active developers on the leaderboard.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchInput.trim()) {
                router.push(`/profile/${encodeURIComponent(searchInput.trim())}`);
              }
            }}
            className="flex gap-2 max-w-md mx-auto mb-6"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Find a developer username..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 text-white placeholder:text-muted-foreground/60"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>

          <Link
            href="/leaderboard"
            className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1.5"
          >
            Browse Global Rankings →
          </Link>
        </div>
      </div>
    );
  }

  const tierRaw = user.rating?.tier || "Bronze";
  const tierFormatted = tierRaw.charAt(0).toUpperCase() + tierRaw.slice(1).toLowerCase();
  const tierStyle = TIER_COLORS[tierFormatted] || TIER_COLORS.Bronze;

  const joinedDate = user.joinedAt
    ? new Date(user.joinedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Verified Developer";

  const rating = user.rating || { overall: 0, level: 1, xp: 0, xpToNextLevel: 100, tier: tierFormatted };
  const stats = user.stats || {
    totalCommits: 0,
    totalPRs: 0,
    totalReviews: 0,
    totalStars: 0,
    streak: 0,
    totalRepos: 0,
    followers: 0,
    following: 0,
  };

  const displayLanguages = user.languages || [];
  const contributionData = user.stats?.contributionData || [];
  const isMe = currentUser?.username?.toLowerCase() === user.username?.toLowerCase();

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-[28px] p-8 relative overflow-hidden border border-white/10"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10 pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start justify-between gap-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            <div className="relative">
              <img
                src={user.avatar || `https://github.com/${user.username}.png`}
                alt={user.name || user.username}
                className="w-28 h-28 rounded-3xl border-2 border-white/10 object-cover shadow-2xl"
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-[#111827] bg-emerald-400" />
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-1">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">
                  {user.name || user.username}
                </h1>
                {rating.tier && (
                  <span
                    className={`text-xs px-3 py-1 rounded-lg bg-gradient-to-r ${tierStyle.bg} text-white font-bold flex items-center gap-1 shadow-sm`}
                  >
                    <Crown className="w-3 h-3" />
                    {rating.tier}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground font-mono text-sm mb-2">@{user.username}</p>
              {user.bio && <p className="text-sm text-slate-300 max-w-xl mb-4 leading-relaxed">{user.bio}</p>}

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-muted-foreground">
                {user.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {user.location}
                  </span>
                )}
                {user.company && (
                  <span className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5" />
                    {user.company}
                  </span>
                )}
                <a
                  href={`https://github.com/${user.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <GithubIcon className="w-3.5 h-3.5" />
                  GitHub Profile
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined {joinedDate}
                </span>
              </div>
            </div>
          </div>

          {/* Rating Meter & Action Buttons */}
          <div className="flex flex-col items-center md:items-end gap-5 w-full md:w-auto">
            <div className="text-center md:text-right">
              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-sky-400 font-mono">
                <AnimatedCounter value={rating.overall} decimals={0} />
              </div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1 font-semibold">
                Developer Rating Score
              </div>
            </div>

            {/* Battle & Compare Buttons */}
            {!isMe && (
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => router.push(`/battles?p2=${encodeURIComponent(user.username)}`)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-500/20 cursor-pointer"
                >
                  <Swords className="w-4 h-4" />
                  Challenge to Battle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const me = currentUser?.username || "code-with-abhi-i5";
                    router.push(`/compare?user1=${encodeURIComponent(me)}&user2=${encodeURIComponent(user.username)}`);
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-all cursor-pointer"
                >
                  <BarChart3 className="w-4 h-4 text-sky-400" />
                  Compare Stats
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Counter Grid */}
      <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Commits", value: stats.totalCommits || 0, icon: GitCommit, color: "text-purple-400" },
          { label: "PRs", value: stats.totalPRs || 0, icon: GitPullRequest, color: "text-blue-400" },
          { label: "Stars", value: stats.totalStars || 0, icon: Star, color: "text-amber-400" },
          { label: "Streak", value: stats.streak || 0, icon: Flame, color: "text-orange-400" },
          { label: "Repositories", value: stats.totalRepos || 0, icon: Code, color: "text-emerald-400" },
          { label: "Followers", value: stats.followers || 0, icon: Star, color: "text-cyan-400" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <StaggerItem key={stat.label}>
              <div className="glass-card rounded-[18px] p-4 text-center border border-white/5">
                <Icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
                <div className="text-xl font-bold font-mono">
                  <AnimatedCounter value={stat.value} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* Heatmap & Language Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ContributionHeatmap data={contributionData} />
        </div>
        <div>
          <LanguageDistribution data={displayLanguages} />
        </div>
      </div>
    </div>
  );
}
