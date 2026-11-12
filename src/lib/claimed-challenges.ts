// Remembers which completed challenges the user has already claimed XP for.
// There is no claim endpoint yet, so this lives in localStorage and every
// access is wrapped: storage can be missing (SSR), blocked or full.

const STORAGE_KEY = "codepulse:claimed-challenges";
const CHANGE_EVENT = "codepulse:claimed-challenges-changed";

export function getClaimedChallengeIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function isChallengeClaimed(challengeId: string): boolean {
  return getClaimedChallengeIds().includes(challengeId);
}

export function markChallengeClaimed(challengeId: string): void {
  if (typeof window === "undefined") return;

  try {
    const ids = new Set(getClaimedChallengeIds());
    ids.add(challengeId);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage is unavailable: the claim still shows for this visit, it just
    // will not be remembered next time.
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** For `useSyncExternalStore`: calls `onChange` when a claim is saved here or in another tab. */
export function subscribeToClaimedChallenges(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}
