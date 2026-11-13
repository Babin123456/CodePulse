import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RepositoryDeepAnalysisPage from "./page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "codepulse" }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

const mockRepo = {
  id: "repo-1",
  name: "codepulse",
  fullName: "code-with-abhi-i5/codepulse",
  description: "Developer analytics and gamified battles platform",
  language: "TypeScript",
  languageColor: "#3178c6",
  stars: 42,
  forks: 12,
  watchers: 8,
  issues: 5,
  pullRequests: 14,
  commits: 88,
  contributors: 4,
  size: 2048,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z",
  topics: ["nextjs", "analytics", "gamification"],
  isPrivate: false,
  url: "https://github.com/code-with-abhi-i5/codepulse",
};

vi.mock("@/hooks/api/use-auth", () => ({
  useCurrentUser: () => ({
    data: {
      username: "code-with-abhi-i5",
      repositories: [mockRepo],
    },
    isLoading: false,
  }),
}));

vi.mock("echarts-for-react", () => ({
  default: () => <div data-testid="echarts-mock" />,
}));

vi.mock("@/components/charts/repo-star-growth-chart", () => ({
  RepoStarGrowthChart: () => <div data-testid="star-growth-chart-mock" />,
}));

describe("RepositoryDeepAnalysisPage - Tooltips (#75)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Health Score and Popularity Score headers with Info icon triggers", () => {
    render(<RepositoryDeepAnalysisPage />);

    expect(screen.getByText("Health Score")).toBeDefined();
    expect(screen.getByText("Popularity Score")).toBeDefined();
    expect(screen.getByText("Activity Score")).toBeDefined();

    const healthInfoBtn = screen.getByTestId("info-health-score");
    const popularityInfoBtn = screen.getByTestId("info-popularity-score");
    const activityInfoBtn = screen.getByTestId("info-activity-score");

    expect(healthInfoBtn).toBeDefined();
    expect(popularityInfoBtn).toBeDefined();
    expect(activityInfoBtn).toBeDefined();

    expect(healthInfoBtn.getAttribute("aria-label")).toBe("Health Score info");
    expect(popularityInfoBtn.getAttribute("aria-label")).toBe("Popularity Score info");
    expect(activityInfoBtn.getAttribute("aria-label")).toBe("Activity Score info");
  });

  it("displays evaluation criteria in Health Score tooltip when interacted with", async () => {
    render(<RepositoryDeepAnalysisPage />);

    const healthInfoBtn = screen.getByTestId("info-health-score");
    fireEvent.pointerDown(healthInfoBtn);
    fireEvent.focus(healthInfoBtn);

    await waitFor(() => {
      expect(screen.getByText(/Health Score Evaluation/i)).toBeDefined();
    });

    expect(screen.getByText(/README existence/i)).toBeDefined();
    expect(screen.getByText(/Repository topics/i)).toBeDefined();
    expect(screen.getByText(/Primary programming language/i)).toBeDefined();
    expect(screen.getByText(/Commit frequency/i)).toBeDefined();
    expect(screen.getByText(/Issue-to-PR closure ratio/i)).toBeDefined();
  });

  it("displays weighted formula in Popularity Score tooltip when interacted with", async () => {
    render(<RepositoryDeepAnalysisPage />);

    const popularityInfoBtn = screen.getByTestId("info-popularity-score");
    fireEvent.pointerDown(popularityInfoBtn);
    fireEvent.focus(popularityInfoBtn);

    await waitFor(() => {
      expect(screen.getByText(/Popularity Score Formula/i)).toBeDefined();
    });

    expect(screen.getByText(/Stars \(3x\) \+ Forks \(5x\) \+ Watchers \(2x\)/i)).toBeDefined();
  });
});
