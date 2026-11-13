import type { Challenge } from "@/types";

export const CUSTOM_CHALLENGES_STORAGE_KEY = "codepulse_custom_challenges";
export const CUSTOM_CHALLENGES_CHANGE_EVENT = "codepulse:custom-challenges-changed";

export type MetricType = "Commits" | "PRs" | "Code Reviews" | "Stars";
export type QuestDurationDays = 3 | 7 | 14;
export type QuestDifficulty = "easy" | "medium" | "hard";

export interface CustomChallenge extends Challenge {
  isCustom: true;
  metricType: MetricType;
  durationDays: QuestDurationDays;
}

export interface CustomQuestInput {
  title: string;
  metricType: MetricType;
  target: number;
  durationDays: QuestDurationDays;
  difficulty: QuestDifficulty;
}

export interface ValidationErrors {
  title?: string;
  metricType?: string;
  target?: string;
  durationDays?: string;
  difficulty?: string;
}

/**
 * Calculates XP reward based on difficulty:
 * Easy: 50 XP
 * Medium: 125 XP
 * Hard: 250 XP
 */
export function calculateXPForDifficulty(difficulty: QuestDifficulty): number {
  switch (difficulty) {
    case "easy":
      return 50;
    case "medium":
      return 125;
    case "hard":
      return 250;
    default:
      return 50;
  }
}

/**
 * Validates custom quest form values.
 * - Title is required, trimmed length between 3 and 60.
 * - Metric must be one of Commits, PRs, Code Reviews, Stars.
 * - Target must be an integer between 1 and 100.
 * - Duration must be 3, 7, or 14 days.
 * - Difficulty must be easy, medium, or hard.
 */
export function validateCustomQuestInput(
  input: Partial<CustomQuestInput>
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  const title = (input.title || "").trim();
  if (!title) {
    errors.title = "Title is required";
  } else if (title.length < 3) {
    errors.title = "Title must be at least 3 characters";
  } else if (title.length > 60) {
    errors.title = "Title cannot exceed 60 characters";
  }

  const validMetrics: MetricType[] = ["Commits", "PRs", "Code Reviews", "Stars"];
  if (!input.metricType || !validMetrics.includes(input.metricType)) {
    errors.metricType = "Please select a valid metric";
  }

  const target = Number(input.target);
  if (!input.target || isNaN(target) || !Number.isInteger(target) || target < 1 || target > 100) {
    errors.target = "Target count must be between 1 and 100";
  }

  const validDurations: QuestDurationDays[] = [3, 7, 14];
  if (!input.durationDays || !validDurations.includes(input.durationDays)) {
    errors.durationDays = "Duration must be 3, 7, or 14 days";
  }

  const validDifficulties: QuestDifficulty[] = ["easy", "medium", "hard"];
  if (!input.difficulty || !validDifficulties.includes(input.difficulty)) {
    errors.difficulty = "Please select a valid difficulty level";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Creates a new CustomChallenge object with future expiration date.
 */
export function createCustomChallengeObject(input: CustomQuestInput): CustomChallenge {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + input.durationDays * 24 * 60 * 60 * 1000).toISOString();
  const xpReward = calculateXPForDifficulty(input.difficulty);

  const iconMap: Record<MetricType, string> = {
    Commits: "Flame",
    PRs: "GitPullRequest",
    "Code Reviews": "Eye",
    Stars: "Target",
  };

  const id = `custom-quest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  return {
    id,
    title: input.title.trim(),
    description: `Track ${input.target} ${input.metricType} within ${input.durationDays} days.`,
    type: "custom",
    difficulty: input.difficulty,
    xpReward,
    progress: 0,
    target: input.target,
    isCompleted: false,
    isCustom: true,
    metricType: input.metricType,
    durationDays: input.durationDays,
    createdAt: now.toISOString(),
    expiresAt,
    icon: iconMap[input.metricType] || "Target",
    category: "Personal Quest",
  };
}

/**
 * Retrieves all stored custom challenges from localStorage.
 * Filters out invalid entries and disallows challenges with corrupted expiry dates.
 */
export function getCustomChallenges(): CustomChallenge[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CUSTOM_CHALLENGES_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is CustomChallenge => {
      if (!item || typeof item !== "object") return false;
      const c = item as Partial<CustomChallenge>;
      return (
        typeof c.id === "string" &&
        typeof c.title === "string" &&
        typeof c.target === "number" &&
        typeof c.expiresAt === "string" &&
        c.isCustom === true
      );
    });
  } catch {
    return [];
  }
}

/**
 * Saves a new custom challenge to localStorage and triggers change notification.
 */
export function saveCustomChallenge(challenge: CustomChallenge): void {
  if (typeof window === "undefined") return;

  try {
    const current = getCustomChallenges();
    const updated = [challenge, ...current.filter((c) => c.id !== challenge.id)];
    window.localStorage.setItem(CUSTOM_CHALLENGES_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // If localStorage is unavailable, proceed gracefully
  }

  window.dispatchEvent(new Event(CUSTOM_CHALLENGES_CHANGE_EVENT));
}

/**
 * Updates progress for a custom challenge.
 */
export function updateCustomChallengeProgress(
  id: string,
  newProgress: number
): void {
  if (typeof window === "undefined") return;

  try {
    const current = getCustomChallenges();
    const updated = current.map((c) => {
      if (c.id === id) {
        const clampedProgress = Math.max(0, Math.min(newProgress, c.target));
        return {
          ...c,
          progress: clampedProgress,
          isCompleted: clampedProgress >= c.target,
        };
      }
      return c;
    });
    window.localStorage.setItem(CUSTOM_CHALLENGES_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Proceed gracefully if localStorage fails
  }

  window.dispatchEvent(new Event(CUSTOM_CHALLENGES_CHANGE_EVENT));
}

/**
 * Subscribes to custom challenges changes across storage events and local dispatch.
 */
export function subscribeToCustomChallenges(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CUSTOM_CHALLENGES_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CUSTOM_CHALLENGES_CHANGE_EVENT, onChange);
  };
}
