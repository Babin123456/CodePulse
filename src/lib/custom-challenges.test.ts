import { beforeEach, describe, expect, it, vi } from "vitest";
import { installMemoryStorage } from "@/test/memory-storage";
import {
  CUSTOM_CHALLENGES_STORAGE_KEY,
  calculateXPForDifficulty,
  createCustomChallengeObject,
  getCustomChallenges,
  saveCustomChallenge,
  subscribeToCustomChallenges,
  updateCustomChallengeProgress,
  validateCustomQuestInput,
  type CustomQuestInput,
} from "./custom-challenges";

describe("custom challenges utility", () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  describe("calculateXPForDifficulty", () => {
    it("returns correct XP for each difficulty", () => {
      expect(calculateXPForDifficulty("easy")).toBe(50);
      expect(calculateXPForDifficulty("medium")).toBe(125);
      expect(calculateXPForDifficulty("hard")).toBe(250);
    });
  });

  describe("validateCustomQuestInput", () => {
    const validInput: CustomQuestInput = {
      title: "Weekly Commits Sprint",
      metricType: "Commits",
      target: 20,
      durationDays: 7,
      difficulty: "medium",
    };

    it("passes validation with valid input", () => {
      const result = validateCustomQuestInput(validInput);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it("catches empty or short title", () => {
      const resultEmpty = validateCustomQuestInput({ ...validInput, title: "   " });
      expect(resultEmpty.isValid).toBe(false);
      expect(resultEmpty.errors.title).toBe("Title is required");

      const resultShort = validateCustomQuestInput({ ...validInput, title: "ab" });
      expect(resultShort.isValid).toBe(false);
      expect(resultShort.errors.title).toBe("Title must be at least 3 characters");
    });

    it("catches title exceeding 60 characters", () => {
      const result = validateCustomQuestInput({
        ...validInput,
        title: "a".repeat(65),
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.title).toBe("Title cannot exceed 60 characters");
    });

    it("validates metric type", () => {
      const result = validateCustomQuestInput({
        ...validInput,
        metricType: "InvalidMetric" as any,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.metricType).toBe("Please select a valid metric");
    });

    it("validates target count bounds", () => {
      const resultZero = validateCustomQuestInput({ ...validInput, target: 0 });
      expect(resultZero.isValid).toBe(false);

      const resultOver = validateCustomQuestInput({ ...validInput, target: 101 });
      expect(resultOver.isValid).toBe(false);

      const resultDec = validateCustomQuestInput({ ...validInput, target: 5.5 });
      expect(resultDec.isValid).toBe(false);
    });

    it("validates duration days", () => {
      const result = validateCustomQuestInput({
        ...validInput,
        durationDays: 5 as any,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.durationDays).toBe("Duration must be 3, 7, or 14 days");
    });

    it("validates difficulty levels", () => {
      const result = validateCustomQuestInput({
        ...validInput,
        difficulty: "legendary" as any,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.difficulty).toBe("Please select a valid difficulty level");
    });
  });

  describe("createCustomChallengeObject", () => {
    it("creates a well-formed custom challenge with future expiry", () => {
      const input: CustomQuestInput = {
        title: "Hackathon Sprint",
        metricType: "PRs",
        target: 5,
        durationDays: 7,
        difficulty: "hard",
      };

      const before = Date.now();
      const challenge = createCustomChallengeObject(input);
      const after = Date.now();

      expect(challenge.title).toBe("Hackathon Sprint");
      expect(challenge.isCustom).toBe(true);
      expect(challenge.target).toBe(5);
      expect(challenge.progress).toBe(0);
      expect(challenge.isCompleted).toBe(false);
      expect(challenge.xpReward).toBe(250);
      expect(challenge.icon).toBe("GitPullRequest");

      const expiryTime = new Date(challenge.expiresAt).getTime();
      const expectedMin = before + 7 * 24 * 60 * 60 * 1000;
      const expectedMax = after + 7 * 24 * 60 * 60 * 1000;
      expect(expiryTime).toBeGreaterThanOrEqual(expectedMin);
      expect(expiryTime).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe("localStorage storage & subscriptions", () => {
    it("saves and loads custom challenges", () => {
      expect(getCustomChallenges()).toEqual([]);

      const challenge = createCustomChallengeObject({
        title: "PR Sprint",
        metricType: "PRs",
        target: 3,
        durationDays: 3,
        difficulty: "easy",
      });

      saveCustomChallenge(challenge);

      const loaded = getCustomChallenges();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe(challenge.id);
      expect(loaded[0].title).toBe("PR Sprint");
    });

    it("updates progress and completes challenge when target is reached", () => {
      const challenge = createCustomChallengeObject({
        title: "Stars Hunt",
        metricType: "Stars",
        target: 10,
        durationDays: 14,
        difficulty: "medium",
      });

      saveCustomChallenge(challenge);

      updateCustomChallengeProgress(challenge.id, 5);
      let loaded = getCustomChallenges();
      expect(loaded[0].progress).toBe(5);
      expect(loaded[0].isCompleted).toBe(false);

      updateCustomChallengeProgress(challenge.id, 10);
      loaded = getCustomChallenges();
      expect(loaded[0].progress).toBe(10);
      expect(loaded[0].isCompleted).toBe(true);
    });

    it("triggers subscription callbacks on change", () => {
      const callback = vi.fn();
      const unsubscribe = subscribeToCustomChallenges(callback);

      const challenge = createCustomChallengeObject({
        title: "Review Sprint",
        metricType: "Code Reviews",
        target: 4,
        durationDays: 7,
        difficulty: "easy",
      });

      saveCustomChallenge(challenge);
      expect(callback).toHaveBeenCalledTimes(1);

      updateCustomChallengeProgress(challenge.id, 2);
      expect(callback).toHaveBeenCalledTimes(2);

      unsubscribe();
      saveCustomChallenge(challenge);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("gracefully handles invalid JSON in storage", () => {
      window.localStorage.setItem(CUSTOM_CHALLENGES_STORAGE_KEY, "invalid-json-content");
      expect(getCustomChallenges()).toEqual([]);
    });
  });
});
