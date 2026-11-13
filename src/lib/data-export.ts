import type {
  Achievement,
  Badge,
  Battle,
  Challenge,
  DeveloperRating,
  DeveloperStats,
  Repository,
} from "@/types";
import {
  mockBattles,
  mockChallenges,
  mockCurrentUser,
  mockRepositories,
} from "@/lib/mock-data";

export interface UserDataExportPayload {
  exportDate: string;
  schemaVersion: string;
  user: {
    id?: string;
    username: string;
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
    bio?: string | null;
    location?: string | null;
    company?: string | null;
    website?: string | null;
    githubUrl?: string | null;
    joinedAt?: string;
  };
  rating?: DeveloperRating | Record<string, unknown>;
  stats?: DeveloperStats | Record<string, unknown>;
  repositories: Repository[];
  achievements: Achievement[];
  badges: Badge[];
  challenges: Challenge[];
  battles: Battle[];
}

export interface ExportResult {
  filename: string;
  fileSize: number;
  formattedSize: string;
}

/**
 * Formats a byte number into human-readable string (e.g. 1.2 KB, 340 B)
 */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Builds the complete structured GDPR-compliant account export payload
 */
export function buildUserDataExport(params?: {
  user?: Partial<UserDataExportPayload["user"]> | null;
  rating?: DeveloperRating;
  stats?: DeveloperStats;
  repositories?: Repository[];
  achievements?: Achievement[];
  badges?: Badge[];
  challenges?: Challenge[];
  battles?: Battle[];
}): UserDataExportPayload {
  const baseUser = params?.user || {};
  const fallbackUser = mockCurrentUser;

  const username = baseUser.username || fallbackUser.username || "developer";

  return {
    exportDate: new Date().toISOString(),
    schemaVersion: "1.0.0",
    user: {
      id: baseUser.id || fallbackUser.id,
      username,
      name: baseUser.name ?? fallbackUser.name,
      email: baseUser.email ?? (fallbackUser as any).email ?? null,
      avatar: baseUser.avatar ?? fallbackUser.avatar,
      bio: baseUser.bio ?? fallbackUser.bio,
      location: baseUser.location ?? fallbackUser.location,
      company: baseUser.company ?? fallbackUser.company,
      website: baseUser.website ?? fallbackUser.website,
      githubUrl: baseUser.githubUrl ?? fallbackUser.githubUrl,
      joinedAt: baseUser.joinedAt ?? fallbackUser.joinedAt,
    },
    rating: params?.rating || fallbackUser.rating,
    stats: params?.stats || fallbackUser.stats,
    repositories: params?.repositories || mockRepositories || [],
    achievements: params?.achievements || fallbackUser.achievements || [],
    badges: params?.badges || fallbackUser.badges || [],
    challenges: params?.challenges || mockChallenges || [],
    battles: params?.battles || mockBattles || [],
  };
}

/**
 * Triggers a client-side JSON download of the exported user data
 */
export function downloadUserDataExport(
  data: UserDataExportPayload,
  customFilename?: string
): ExportResult {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], {
    type: "application/json;charset=utf-8",
  });

  const rawUsername = data.user?.username || "user";
  const sanitizedUsername = rawUsername.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const filename =
    customFilename || `codepulse-data-export-${sanitizedUsername}.json`;

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return {
    filename,
    fileSize: blob.size,
    formattedSize: formatFileSize(blob.size),
  };
}
