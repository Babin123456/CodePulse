"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { StaggerContainer, StaggerItem } from "@/components/animations/page-transition";
import { AnimatedCounter, AnimatedProgress } from "@/components/animations/animated-counter";
import { ContributionHeatmap } from "@/components/charts/contribution-heatmap";
import { LanguageDistribution } from "@/components/charts/language-distribution";
import { ActivityTimeline } from "@/components/data-display/activity-timeline";
import { TIER_COLORS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/api/use-auth";
import { GithubIcon } from "@/components/icons/github";
import {
  MapPin, Building, Globe, Calendar, Star, GitFork, Users, GitCommit,
  GitPullRequest, Eye, Flame, Code, ExternalLink, Crown, QrCode,
} from "lucide-react";
import { ProfileQrModal } from "@/components/modals/profile-qr-modal";

export default function ProfilePage() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Profile Header Skeleton */}
        <div className="glass-card rounded-[20px] p-6 animate-pulse space-y-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-24 h-24 rounded-2xl bg-white/5 shrink-0" />
            <div className="space-y-3 flex-1 text-center sm:text-left w-full">
              <div className="h-6 w-48 bg-white/5 rounded mx-auto sm:mx-0" />
              <div className="h-4 w-32 bg-white/5 rounded mx-auto sm:mx-0" />
              <div className="flex flex-wrap gap-4 justify-center sm:justify-start pt-2">
                <div className="h-4 w-24 bg-white/5 rounded" />
                <div className="h-4 w-28 bg-white/5 rounded" />
                <div className="h-4 w-20 bg-white/5 rounded" />
              </div>
            </div>
            <div className="w-32 h-16 rounded-xl bg-white/5 shrink-0" />
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-[16px] p-4 text-center space-y-2 animate-pulse">
              <div className="h-6 w-16 mx-auto bg-white/5 rounded" />
              <div className="h-3 w-20 mx-auto bg-white/5 rounded" />
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card rounded-[20px] p-6 h-64 animate-pulse space-y-4">
            <div className="h-5 w-40 bg-white/5 rounded" />
            <div className="h-44 w-full bg-white/5 rounded-xl" />
          </div>
          <div className="glass-card rounded-[20px] p-6 h-64 animate-pulse space-y-4">
            <div className="h-5 w-36 bg-white/5 rounded" />
            <div className="h-44 w-full bg-white/5 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Profile not found</div>;
  }

  const tierRaw = user.rating?.tier || "BRONZE";
  const tierFormatted = tierRaw.charAt(0).toUpperCase() + tierRaw.slice(1).toLowerCase();
  const tierStyle = TIER_COLORS[tierFormatted] || TIER_COLORS.Bronze;
  
  // Format joined date
  const joinedDate = user.joinedAt 
    ? new Date(user.joinedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Unknown';

  // Fallbacks for nested objects
  const rating = user.rating || { overall: 0, level: 1, xp: 0, xpToNextLevel: 100, tier: tierFormatted };
  const stats = user.stats || { totalCommits: 0, totalPRs: 0, totalReviews: 0, totalStars: 0, streak: 0, totalRepos: 0, followers: 0, following: 0 };
  
  // Map badges structure
  const displayBadges = user.badges?.map((b: any) => b.badge || b) || [];
  const displayRepos = user.repositories || [];
  const displayActivities = user.activities || [];
  const displayLanguages = user.languages || [];
  const contributionData = user.stats?.contributionData || [];
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-[24px] p-8 relative overflow-hidden"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10" />

        <div className="relative flex flex-col md:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <img
              src={user.avatar || "https://api.dicebear.com/9.x/notionists/svg?seed=fallback"}
              alt={user.name || user.username}
              className="w-28 h-28 rounded-3xl border-2 border-white/10"
            />
            <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-[#111827] ${user.isOnline ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{user.name || user.username}</h1>
              {rating.tier && (
                <span className={`text-xs px-3 py-1 rounded-lg bg-gradient-to-r ${tierStyle.bg} text-white font-bold flex items-center gap-1`}>
                  <Crown className="w-3 h-3" />
                  {rating.tier}
                </span>
              )}
            </div>
            <p className="text-muted-foreground mb-1">@{user.username}</p>
            {user.bio && <p className="text-sm text-muted-foreground mb-4 max-w-xl">{user.bio}</p>}

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {user.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{user.location}</span>}
              {user.company && <span className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5" />{user.company}</span>}
              {user.website && (
                <a href={user.website.startsWith('http') ? user.website : `https://${user.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-blue-400 transition-colors">
                  <Globe className="w-3.5 h-3.5" />{user.website}
                </a>
              )}
              {user.githubUrl && (
                <a href={user.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-blue-400 transition-colors">
                  <GithubIcon className="w-3.5 h-3.5" />GitHub Profile
                </a>
              )}
              {user.socialLinks && Array.isArray(user.socialLinks) && user.socialLinks.map((link: any, idx: number) => {
                let displayUrl = link.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
                if (displayUrl.length > 25) displayUrl = displayUrl.substring(0, 25) + '...';
                return (
                  <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-blue-400 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />{displayUrl}
                  </a>
                );
              })}
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Joined {joinedDate}</span>
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-all"
              >
                <QrCode className="w-3.5 h-3.5 text-purple-400" />
                Share QR
              </button>
            </div>

            {/* Followers/Following */}
            <div className="flex items-center gap-4 mt-3">
              <span className="text-sm"><strong>{formatNumber(stats.followers)}</strong> <span className="text-muted-foreground">followers</span></span>
              <span className="text-sm"><strong>{formatNumber(stats.following)}</strong> <span className="text-muted-foreground">following</span></span>
            </div>
          </div>

          {/* Rating + XP */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-5xl font-bold gradient-text">
              <AnimatedCounter value={rating.overall} decimals={1} />
            </div>
            <div className="text-xs text-muted-foreground">Rating</div>
            <div className="text-center mt-2">
              <div className="text-sm font-medium">Level {rating.level}</div>
              <AnimatedProgress
                value={rating.xp}
                max={rating.xpToNextLevel}
                size="sm"
                className="w-32 mt-1"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {formatNumber(rating.xp)} / {formatNumber(rating.xpToNextLevel)} XP
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Commits", value: stats.totalCommits, icon: GitCommit, color: "text-purple-400" },
          { label: "PRs", value: stats.totalPRs, icon: GitPullRequest, color: "text-blue-400" },
          { label: "Reviews", value: stats.totalReviews, icon: Eye, color: "text-cyan-400" },
          { label: "Stars", value: stats.totalStars, icon: Star, color: "text-amber-400" },
          { label: "Streak", value: stats.streak, icon: Flame, color: "text-orange-400" },
          { label: "Repos", value: stats.totalRepos, icon: Code, color: "text-emerald-400" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <StaggerItem key={stat.label}>
              <div className="glass-card rounded-[16px] p-4 text-center">
                <Icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
                <div className="text-xl font-bold"><AnimatedCounter value={stat.value} /></div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      <ProfileQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        user={user}
      />

      {/* Badges */}
      {displayBadges.length > 0 && (
        <div className="glass-card rounded-[20px] p-6">
          <h2 className="text-lg font-semibold mb-4">Badges</h2>
          <div className="flex flex-wrap gap-3">
            {displayBadges.map((badge: any) => (
              <motion.div
                key={badge.id}
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10"
              >
                <span className="text-lg">🏆</span>
                <div>
                  <div className="text-sm font-medium">{badge.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{badge.tier}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Heatmap + Language */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ContributionHeatmap data={contributionData} />
        </div>
        <LanguageDistribution data={displayLanguages} />
      </div>

      {/* Pinned Repos */}
      {displayRepos.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Pinned Repositories</h2>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayRepos.slice(0, 4).map((repo: any) => (
              <StaggerItem key={repo.id}>
                <motion.div
                  whileHover={{ scale: 1.01, y: -2 }}
                  className="glass-card rounded-[20px] p-5 cursor-pointer group"
                  onClick={() => window.open(repo.url, '_blank')}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                      {repo.name}
                    </h3>
                    <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {repo.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{repo.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: repo.languageColor || '#ccc' }} />
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-1"><Star className="w-3 h-3" />{formatNumber(repo.stars)}</span>
                    <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{formatNumber(repo.forks)}</span>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      )}

      {/* Recent Activity */}
      {displayActivities.length > 0 && (
        <ActivityTimeline activities={displayActivities} maxItems={6} />
      )}
    </div>
  );
}
