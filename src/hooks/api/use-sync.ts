import { useState, useEffect, useSyncExternalStore } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes in ms (300,000)
export const LAST_SYNC_STORAGE_KEY = "codepulse_last_sync";
const SYNC_UPDATED_EVENT = "codepulse_sync_updated";

/**
 * Retrieve the last sync timestamp from localStorage.
 */
export function getLastSyncTimestamp(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_SYNC_STORAGE_KEY);
    if (!raw) return null;
    const num = Number(raw);
    if (!isNaN(num) && num > 0) return num;
    const parsed = Date.parse(raw);
    if (!isNaN(parsed) && parsed > 0) return parsed;
    return null;
  } catch {
    return null;
  }
}

/**
 * Store the last sync timestamp in localStorage and broadcast an update event.
 */
export function setLastSyncTimestamp(timestamp: number = Date.now()): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_SYNC_STORAGE_KEY, timestamp.toString());
    window.dispatchEvent(new Event(SYNC_UPDATED_EVENT));
  } catch {
    // Ignore storage errors in private browsing/quota exceeded
  }
}

/**
 * Remove the last sync timestamp from localStorage.
 */
export function clearLastSyncTimestamp(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LAST_SYNC_STORAGE_KEY);
    window.dispatchEvent(new Event(SYNC_UPDATED_EVENT));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Format remaining cooldown seconds into a human-readable string (e.g. "3m 42s" or "45s").
 */
export function formatRemainingCooldown(remainingSeconds: number): string {
  if (remainingSeconds <= 0) return "";
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Format the relative duration since the last sync (e.g. "Last synced: 8 mins ago").
 */
export function formatLastSynced(
  lastSyncTimestamp: number | null,
  now: number = Date.now()
): string {
  if (!lastSyncTimestamp) {
    return "Not synced yet";
  }

  const elapsedMs = Math.max(0, now - lastSyncTimestamp);
  const elapsedSecs = Math.floor(elapsedMs / 1000);
  const elapsedMins = Math.floor(elapsedSecs / 60);
  const elapsedHours = Math.floor(elapsedMins / 60);
  const elapsedDays = Math.floor(elapsedHours / 24);

  if (elapsedMins < 1) {
    return "Last synced: just now";
  }
  if (elapsedMins < 60) {
    return elapsedMins === 1
      ? "Last synced: 1 min ago"
      : `Last synced: ${elapsedMins} mins ago`;
  }
  if (elapsedHours < 24) {
    return elapsedHours === 1
      ? "Last synced: 1 hour ago"
      : `Last synced: ${elapsedHours} hours ago`;
  }
  return elapsedDays === 1
    ? "Last synced: 1 day ago"
    : `Last synced: ${elapsedDays} days ago`;
}

function subscribeToSync(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  window.addEventListener(SYNC_UPDATED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SYNC_UPDATED_EVENT, onChange);
  };
}

function getSyncSnapshot(): number | null {
  return getLastSyncTimestamp();
}

function getServerSyncSnapshot(): number | null {
  return null;
}

export interface UseSyncGitHubOptions {
  username?: string;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export interface UseSyncGitHubResult {
  sync: () => void;
  syncAsync: () => Promise<unknown>;
  isSyncing: boolean;
  isOnCooldown: boolean;
  canSync: boolean;
  remainingSeconds: number;
  cooldownText: string;
  lastSyncTime: number | null;
  lastSyncedText: string;
  tooltipText: string;
}

/**
 * Hook to trigger manual GitHub synchronization with rate-limit cooldown guard.
 */
export function useSyncGitHub(
  options: UseSyncGitHubOptions = {}
): UseSyncGitHubResult {
  const queryClient = useQueryClient();
  const lastSync = useSyncExternalStore(
    subscribeToSync,
    getSyncSnapshot,
    getServerSyncSnapshot
  );

  const [now, setNow] = useState<number>(() => Date.now());

  const timeSinceLastSync = lastSync ? now - lastSync : Infinity;
  const isOnCooldown = timeSinceLastSync < SYNC_COOLDOWN_MS;
  const remainingMs = isOnCooldown ? SYNC_COOLDOWN_MS - timeSinceLastSync : 0;
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

  useEffect(() => {
    // Tick every 1 second during cooldown, otherwise every 15 seconds to keep relative timestamp updated
    const intervalTime = isOnCooldown ? 1000 : 15000;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isOnCooldown]);

  const cooldownText =
    remainingSeconds > 0 ? formatRemainingCooldown(remainingSeconds) : "";
  const lastSyncedText = formatLastSynced(lastSync, now);

  const mutation = useMutation({
    mutationFn: async () => {
      const currentLast = getLastSyncTimestamp();
      if (currentLast && Date.now() - currentLast < SYNC_COOLDOWN_MS) {
        const remainingSec = Math.ceil(
          (SYNC_COOLDOWN_MS - (Date.now() - currentLast)) / 1000
        );
        throw new Error(
          `Sync available in ${formatRemainingCooldown(remainingSec)}`
        );
      }

      try {
        const response = await apiClient.post("/sync");
        return response.data;
      } catch (backendErr: unknown) {
        if (options.username && typeof window !== "undefined") {
          try {
            const fallback = await fetch(
              `/api/github/developer?username=${encodeURIComponent(
                options.username
              )}&force=true`
            );
            if (fallback.ok) {
              return await fallback.json();
            }
          } catch {
            // fallback error ignored
          }
        }
        throw backendErr;
      }
    },
    onSuccess: async () => {
      const syncNow = Date.now();
      setLastSyncTimestamp(syncNow);
      setNow(syncNow);

      await queryClient.invalidateQueries({
        queryKey: ["auth", "current-user"],
      });
      await queryClient.invalidateQueries({ queryKey: ["users"] });

      toast.success("GitHub data synced successfully!");
      options.onSuccess?.();
    },
    onError: (err: unknown) => {
      let msg = "Failed to sync with GitHub";
      if (err && typeof err === "object") {
        const errObj = err as {
          message?: string;
          response?: { data?: { message?: string } };
        };
        msg = errObj.response?.data?.message || errObj.message || msg;
      }
      toast.error(msg);
      options.onError?.(err);
    },
  });

  const isSyncing = mutation.isPending;
  const canSync = !isOnCooldown && !isSyncing;

  const tooltipText = isSyncing
    ? "Syncing your GitHub data..."
    : isOnCooldown
    ? `Sync available in ${cooldownText}`
    : "Sync latest commits, PRs, and stars from GitHub";

  return {
    sync: () => {
      if (canSync) {
        mutation.mutate();
      }
    },
    syncAsync: async () => {
      if (!canSync) {
        throw new Error(
          isOnCooldown
            ? `Sync available in ${cooldownText}`
            : "Sync already in progress"
        );
      }
      return await mutation.mutateAsync();
    },
    isSyncing,
    isOnCooldown,
    canSync,
    remainingSeconds,
    cooldownText,
    lastSyncTime: lastSync,
    lastSyncedText,
    tooltipText,
  };
}
