import { beforeEach, describe, expect, it, vi } from "vitest";
import { installMemoryStorage } from "@/test/memory-storage";
import {
  getClaimedChallengeIds,
  isChallengeClaimed,
  markChallengeClaimed,
  subscribeToClaimedChallenges,
} from "./claimed-challenges";

const STORAGE_KEY = "codepulse:claimed-challenges";

describe("claimed challenges storage", () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it("starts empty", () => {
    expect(getClaimedChallengeIds()).toEqual([]);
    expect(isChallengeClaimed("ch-1")).toBe(false);
  });

  it("remembers a claimed challenge", () => {
    markChallengeClaimed("ch-1");

    expect(isChallengeClaimed("ch-1")).toBe(true);
    expect(isChallengeClaimed("ch-2")).toBe(false);
  });

  it("does not store the same challenge twice", () => {
    markChallengeClaimed("ch-1");
    markChallengeClaimed("ch-1");
    markChallengeClaimed("ch-2");

    expect(getClaimedChallengeIds()).toEqual(["ch-1", "ch-2"]);
  });

  it("ignores saved data that is not a list of ids", () => {
    window.localStorage.setItem(STORAGE_KEY, "not json");
    expect(getClaimedChallengeIds()).toEqual([]);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ a: 1 }));
    expect(getClaimedChallengeIds()).toEqual([]);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(["ch-1", 7, null]));
    expect(getClaimedChallengeIds()).toEqual(["ch-1"]);
  });

  it("tells subscribers when a claim is saved, until they unsubscribe", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToClaimedChallenges(onChange);

    markChallengeClaimed("ch-1");
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
    markChallengeClaimed("ch-2");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not throw when storage is unavailable", () => {
    installMemoryStorage({
      getItem: vi.fn(() => {
        throw new Error("blocked");
      }),
      setItem: vi.fn(() => {
        throw new Error("full");
      }),
    });

    expect(getClaimedChallengeIds()).toEqual([]);
    expect(() => markChallengeClaimed("ch-1")).not.toThrow();
  });
});
