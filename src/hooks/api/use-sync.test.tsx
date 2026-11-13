import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getLastSyncTimestamp,
  setLastSyncTimestamp,
  clearLastSyncTimestamp,
  formatRemainingCooldown,
  formatLastSynced,
  useSyncGitHub,
  LAST_SYNC_STORAGE_KEY,
  SYNC_COOLDOWN_MS,
} from "./use-sync";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("use-sync utilities", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("localStorage sync helpers", () => {
    it("should return null when no sync timestamp is stored", () => {
      expect(getLastSyncTimestamp()).toBeNull();
    });

    it("should store and retrieve timestamp accurately", () => {
      const ts = 1700000000000;
      setLastSyncTimestamp(ts);
      expect(localStorage.getItem(LAST_SYNC_STORAGE_KEY)).toBe(ts.toString());
      expect(getLastSyncTimestamp()).toBe(ts);
    });

    it("should handle ISO string parsing if stored previously", () => {
      const iso = "2026-11-13T08:00:00.000Z";
      localStorage.setItem(LAST_SYNC_STORAGE_KEY, iso);
      expect(getLastSyncTimestamp()).toBe(Date.parse(iso));
    });

    it("should clear timestamp correctly", () => {
      setLastSyncTimestamp(1700000000000);
      expect(getLastSyncTimestamp()).not.toBeNull();
      clearLastSyncTimestamp();
      expect(getLastSyncTimestamp()).toBeNull();
    });
  });

  describe("formatRemainingCooldown", () => {
    it("should return empty string for 0 or negative seconds", () => {
      expect(formatRemainingCooldown(0)).toBe("");
      expect(formatRemainingCooldown(-10)).toBe("");
    });

    it("should format seconds under 1 minute", () => {
      expect(formatRemainingCooldown(45)).toBe("45s");
      expect(formatRemainingCooldown(59)).toBe("59s");
    });

    it("should format exact minutes and seconds", () => {
      // 3m 42s = 3 * 60 + 42 = 222
      expect(formatRemainingCooldown(222)).toBe("3m 42s");
      // 5m 0s = 300
      expect(formatRemainingCooldown(300)).toBe("5m 0s");
      // 1m 5s = 65
      expect(formatRemainingCooldown(65)).toBe("1m 5s");
    });
  });

  describe("formatLastSynced", () => {
    it("should return 'Not synced yet' when timestamp is null", () => {
      expect(formatLastSynced(null)).toBe("Not synced yet");
    });

    it("should return 'Last synced: just now' for timestamps less than 1 min ago", () => {
      const now = 1700000060000;
      const ts = 1700000030000; // 30s ago
      expect(formatLastSynced(ts, now)).toBe("Last synced: just now");
    });

    it("should return singular '1 min ago' and plural 'X mins ago'", () => {
      const now = 1700000000000;
      const oneMinAgo = now - 65 * 1000;
      const eightMinsAgo = now - 8 * 60 * 1000;

      expect(formatLastSynced(oneMinAgo, now)).toBe("Last synced: 1 min ago");
      expect(formatLastSynced(eightMinsAgo, now)).toBe("Last synced: 8 mins ago");
    });

    it("should return hours and days for older timestamps", () => {
      const now = 1700000000000;
      const oneHourAgo = now - 3600 * 1000;
      const twoHoursAgo = now - 2 * 3600 * 1000;
      const oneDayAgo = now - 24 * 3600 * 1000;
      const threeDaysAgo = now - 3 * 24 * 3600 * 1000;

      expect(formatLastSynced(oneHourAgo, now)).toBe("Last synced: 1 hour ago");
      expect(formatLastSynced(twoHoursAgo, now)).toBe("Last synced: 2 hours ago");
      expect(formatLastSynced(oneDayAgo, now)).toBe("Last synced: 1 day ago");
      expect(formatLastSynced(threeDaysAgo, now)).toBe("Last synced: 3 days ago");
    });
  });

  describe("useSyncGitHub hook", () => {
    it("should return initial state when not on cooldown", () => {
      const { result } = renderHook(() => useSyncGitHub(), {
        wrapper: createWrapper(),
      });

      expect(result.current.canSync).toBe(true);
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.isOnCooldown).toBe(false);
      expect(result.current.remainingSeconds).toBe(0);
      expect(result.current.cooldownText).toBe("");
      expect(result.current.lastSyncedText).toBe("Not synced yet");
      expect(result.current.tooltipText).toBe(
        "Sync latest commits, PRs, and stars from GitHub"
      );
    });

    it("should detect active cooldown from persisted localStorage timestamp", () => {
      const now = Date.now();
      // Set sync to 1 minute 18 seconds ago (cooldown remaining: 3m 42s = 222s)
      const pastSync = now - (SYNC_COOLDOWN_MS - 222 * 1000);
      localStorage.setItem(LAST_SYNC_STORAGE_KEY, pastSync.toString());

      const { result } = renderHook(() => useSyncGitHub(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isOnCooldown).toBe(true);
      expect(result.current.canSync).toBe(false);
      expect(result.current.remainingSeconds).toBeGreaterThanOrEqual(220);
      expect(result.current.remainingSeconds).toBeLessThanOrEqual(223);
      expect(result.current.tooltipText).toContain("Sync available in");
    });

    it("should execute sync mutation and invalidate cache on success", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { success: true },
      });

      const onSuccessMock = vi.fn();
      const { result } = renderHook(
        () => useSyncGitHub({ onSuccess: onSuccessMock }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.sync();
      });

      expect(apiClient.post).toHaveBeenCalledWith("/sync");
      expect(toast.success).toHaveBeenCalledWith(
        "GitHub data synced successfully!"
      );
      expect(onSuccessMock).toHaveBeenCalled();
      expect(getLastSyncTimestamp()).not.toBeNull();
      expect(result.current.isOnCooldown).toBe(true);
      expect(result.current.canSync).toBe(false);
    });

    it("should prevent triggering sync when cooldown is active", async () => {
      const now = Date.now();
      localStorage.setItem(LAST_SYNC_STORAGE_KEY, (now - 30 * 1000).toString());

      const { result } = renderHook(() => useSyncGitHub(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.sync();
      });

      expect(apiClient.post).not.toHaveBeenCalled();
    });
  });
});
