import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardContent } from "./dashboard-content";
import { LAST_SYNC_STORAGE_KEY, SYNC_COOLDOWN_MS } from "@/hooks/api/use-sync";
import { apiClient } from "@/lib/api-client";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/modals/claim-reward-modal", () => ({
  ClaimRewardModal: () => null,
}));

const mockUser = {
  id: "user-123",
  username: "testdev",
  name: "Test Developer",
  avatar: "https://github.com/testdev.png",
  rating: {
    overall: 85,
    level: 3,
    xp: 450,
    xpToNextLevel: 1000,
    tier: "SILVER",
  },
  stats: {
    totalCommits: 120,
    totalPRs: 15,
    totalStars: 42,
    streak: 5,
  },
  achievements: [],
  activities: [],
};

vi.mock("@/hooks/api/use-auth", () => ({
  useCurrentUser: vi.fn(() => ({
    data: mockUser,
    isLoading: false,
  })),
}));

vi.mock("@/hooks/api/use-challenges", () => ({
  useActiveChallenges: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
}));

vi.mock("@/hooks/api/use-leaderboard", () => ({
  useLeaderboardInfinite: vi.fn(() => ({
    data: { pages: [{ data: [] }] },
    isLoading: false,
  })),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delay={0}>{ui}</TooltipProvider>
    </QueryClientProvider>
  );
}

describe("DashboardContent - Manual Sync with GitHub (#76)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders the dashboard header, last-synced badge, and 'Sync with GitHub' button", () => {
    renderWithProviders(<DashboardContent />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("last-synced-badge")).toHaveTextContent(
      "Not synced yet"
    );

    const syncButton = screen.getByTestId("sync-github-button");
    expect(syncButton).toBeInTheDocument();
    expect(syncButton).toHaveTextContent("Sync with GitHub");
    expect(syncButton).not.toBeDisabled();
  });

  it("displays relative last synced time when sync history exists", () => {
    const now = Date.now();
    // 8 minutes ago
    const eightMinsAgo = now - 8 * 60 * 1000;
    localStorage.setItem(LAST_SYNC_STORAGE_KEY, eightMinsAgo.toString());

    renderWithProviders(<DashboardContent />);

    const badge = screen.getByTestId("last-synced-badge");
    expect(badge).toHaveTextContent("Last synced: 8 mins ago");

    const syncButton = screen.getByTestId("sync-github-button");
    expect(syncButton).not.toBeDisabled();
    expect(syncButton).toHaveTextContent("Sync with GitHub");
  });

  it("disables button and displays countdown timer when on cooldown", () => {
    const now = Date.now();
    // 1 minute 18 seconds ago -> 3m 42s remaining
    const pastSync = now - (SYNC_COOLDOWN_MS - 222 * 1000);
    localStorage.setItem(LAST_SYNC_STORAGE_KEY, pastSync.toString());

    renderWithProviders(<DashboardContent />);

    const syncButton = screen.getByTestId("sync-github-button");
    expect(syncButton).toBeDisabled();
    expect(syncButton).toHaveTextContent(/Sync available in 3m/);
  });

  it("triggers sync API mutation when 'Sync with GitHub' is clicked", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { success: true },
    });

    renderWithProviders(<DashboardContent />);

    const syncButton = screen.getByTestId("sync-github-button");
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/sync");
    });
  });
});
