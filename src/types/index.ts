// ===========================
// Developer Types
// ===========================

export interface Developer {
  id: string;
  username: string;
  name: string;
  avatar: string;
  bio: string;
  location: string;
  company: string;
  website: string;
  githubUrl: string;
  joinedAt: string;
  isOnline: boolean;
  rating: DeveloperRating;
  stats: DeveloperStats;
  languages: LanguageStat[];
  badges: Badge[];
  achievements: Achievement[];
  pinnedRepos: Repository[];
}

export interface DeveloperRating {
  overall: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  rank: number;
  totalDevelopers: number;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Master" | "Grandmaster";
  growthScore: number;
}

export interface DeveloperStats {
  totalCommits: number;
  totalPRs: number;
  totalIssues: number;
  totalReviews: number;
  totalStars: number;
  totalForks: number;
  totalRepos: number;
  followers: number;
  following: number;
  contributions: number;
  streak: number;
  longestStreak: number;
  avgCommitsPerDay: number;
  activeDays: number;
}

// ===========================
// Repository Types
// ===========================

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string;
  language: string;
  languageColor: string;
  stars: number;
  forks: number;
  watchers: number;
  issues: number;
  pullRequests: number;
  commits: number;
  contributors: number;
  size: number;
  createdAt: string;
  updatedAt: string;
  topics: string[];
  isPrivate: boolean;
  fork?: boolean;
  isFork?: boolean;
  url: string;
}

export interface LanguageStat {
  name: string;
  color: string;
  percentage: number;
  linesOfCode: number;
  repos: number;
}

// ===========================
// Challenge Types
// ===========================

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: "daily" | "weekly" | "monthly" | "seasonal";
  difficulty: "easy" | "medium" | "hard" | "legendary";
  xpReward: number;
  progress: number;
  target: number;
  isCompleted: boolean;
  /** True once the user has claimed the XP reward for a completed challenge. */
  isClaimed?: boolean;
  expiresAt: string;
  createdAt: string;
  icon: string;
  category: string;
}

// ===========================
// Achievement & Badge Types
// ===========================

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  isUnlocked: boolean;
  unlockedAt?: string;
  progress: number;
  target: number;
  xpReward: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  earnedAt: string;
  category: string;
}

// ===========================
// Battle Types
// ===========================

export interface Battle {
  id: string;
  challenger: BattleParticipant;
  opponent: BattleParticipant;
  status: "pending" | "active" | "completed";
  category: string;
  startedAt: string;
  endsAt: string;
  winner?: string;
}

export interface BattleParticipant {
  id: string;
  username: string;
  name: string;
  avatar: string;
  score: number;
  stats: Record<string, number>;
}

// ===========================
// Leaderboard Types
// ===========================

export interface LeaderboardEntry {
  rank: number;
  previousRank: number;
  developer: Developer;
  score: number;
  change: number;
}

export type LeaderboardCategory = "global" | "country" | "friends" | "college" | "monthly" | "yearly";

// ===========================
// Notification Types
// ===========================

export interface Notification {
  id: string;
  type: "achievement" | "challenge" | "battle" | "friend" | "system" | "level_up";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  icon?: string;
  metadata?: Record<string, unknown>;
}

// ===========================
// Activity Types
// ===========================

export interface Activity {
  id: string;
  type: "commit" | "pull_request" | "issue" | "review" | "star" | "fork" | "achievement" | "level_up";
  title: string;
  description: string;
  repository?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// ===========================
// Chart Data Types
// ===========================

export interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface CommitActivity {
  date: string;
  commits: number;
  additions: number;
  deletions: number;
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

// ===========================
// Common Types
// ===========================

export type TimeRange = "7d" | "30d" | "90d" | "1y" | "all";

export interface FilterOptions {
  search?: string;
  language?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ===========================
// Navigation Types
// ===========================

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  badge?: string | number;
  isNew?: boolean;
  children?: NavItem[];
}

export interface BreadcrumbItem {
  title: string;
  href?: string;
}
