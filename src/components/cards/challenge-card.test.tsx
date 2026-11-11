import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { installMemoryStorage } from "@/test/memory-storage";
import { ChallengeCard } from "./challenge-card";
import type { Challenge } from "@/types";

// The confetti canvas does not exist in jsdom, and the tests do not need to see it.
vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

const mockChallenge: Challenge = {
  id: "ch-101",
  title: "Git Master",
  description: "Commit 10 times to any public repository",
  type: "daily",
  difficulty: "medium",
  xpReward: 150,
  progress: 5,
  target: 10,
  isCompleted: false,
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(), // 5 hours in future
  createdAt: new Date().toISOString(),
  icon: "Flame",
  category: "commits",
};

describe("ChallengeCard Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should render challenge title, description, and type", () => {
    render(<ChallengeCard challenge={mockChallenge} />);

    expect(screen.getByText("Git Master")).toBeInTheDocument();
    expect(
      screen.getByText("Commit 10 times to any public repository")
    ).toBeInTheDocument();
    expect(screen.getByText("daily")).toBeInTheDocument();
  });

  it("should render difficulty badge correctly", () => {
    render(<ChallengeCard challenge={mockChallenge} />);

    const badge = screen.getByText("Medium");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("text-amber-400");
  });

  it("should render different difficulty badges (Easy, Hard, Legendary)", () => {
    const easyChallenge: Challenge = {
      ...mockChallenge,
      id: "ch-easy",
      difficulty: "easy",
    };
    const { rerender } = render(<ChallengeCard challenge={easyChallenge} />);
    expect(screen.getByText("Easy")).toBeInTheDocument();

    const hardChallenge: Challenge = {
      ...mockChallenge,
      id: "ch-hard",
      difficulty: "hard",
    };
    rerender(<ChallengeCard challenge={hardChallenge} />);
    expect(screen.getByText("Hard")).toBeInTheDocument();

    const legendaryChallenge: Challenge = {
      ...mockChallenge,
      id: "ch-legendary",
      difficulty: "legendary",
    };
    rerender(<ChallengeCard challenge={legendaryChallenge} />);
    expect(screen.getByText("Legendary")).toBeInTheDocument();
  });

  it("should render reward XP with Zap icon", () => {
    render(<ChallengeCard challenge={mockChallenge} />);

    expect(screen.getByText("+150 XP")).toBeInTheDocument();
  });

  it("should render progress values and calculated percentage", () => {
    render(<ChallengeCard challenge={mockChallenge} />);

    expect(screen.getByText(/5\/10/)).toBeInTheDocument();
    expect(screen.getByText(/\(50%\)/)).toBeInTheDocument();
  });

  it("should handle edge case: 0 progress correctly", () => {
    const zeroProgressChallenge: Challenge = {
      ...mockChallenge,
      id: "ch-zero",
      progress: 0,
      target: 10,
    };

    render(<ChallengeCard challenge={zeroProgressChallenge} />);

    expect(screen.getByText(/0\/10/)).toBeInTheDocument();
    expect(screen.getByText(/\(0%\)/)).toBeInTheDocument();
  });

  it("should handle edge case: large numbers for progress and XP", () => {
    const largeNumberChallenge: Challenge = {
      ...mockChallenge,
      id: "ch-large",
      progress: 50000,
      target: 100000,
      xpReward: 25000,
    };

    render(<ChallengeCard challenge={largeNumberChallenge} />);

    expect(screen.getByText(/50000\/100000/)).toBeInTheDocument();
    expect(screen.getByText(/\(50%\)/)).toBeInTheDocument();
    expect(screen.getByText("+25000 XP")).toBeInTheDocument();
  });

  it("should display Completed state when isCompleted is true", () => {
    const completedChallenge: Challenge = {
      ...mockChallenge,
      id: "ch-completed",
      isCompleted: true,
      progress: 10,
      target: 10,
    };

    render(<ChallengeCard challenge={completedChallenge} />);

    expect(screen.getByText("Completed")).toBeInTheDocument();
    // No countdown such as "5h 0m", "2d 3h" or "30m" (the Claim button's text is not one).
    expect(screen.queryByText(/^(\d+d \d+h|\d+h \d+m|\d+m)$/)).not.toBeInTheDocument();
  });

  it("should display Expired when time remaining is non-positive and not completed", () => {
    const expiredChallenge: Challenge = {
      ...mockChallenge,
      id: "ch-expired",
      isCompleted: false,
      expiresAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    };

    render(<ChallengeCard challenge={expiredChallenge} />);

    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("should fallback to Target icon when an unknown icon is provided", () => {
    const unknownIconChallenge: Challenge = {
      ...mockChallenge,
      id: "ch-unknown-icon",
      icon: "NonExistentIconName",
    };

    const { container } = render(
      <ChallengeCard challenge={unknownIconChallenge} />
    );

    expect(container.querySelector("#challenge-ch-unknown-icon")).toBeInTheDocument();
  });

  it("should merge custom className props", () => {
    const { container } = render(
      <ChallengeCard challenge={mockChallenge} className="custom-test-class" />
    );

    expect(container.firstChild).toHaveClass("custom-test-class");
  });

  describe("claiming the reward", () => {
    const completedChallenge: Challenge = {
      ...mockChallenge,
      id: "ch-claim",
      isCompleted: true,
      progress: 10,
      target: 10,
    };

    beforeEach(() => {
      installMemoryStorage();
    });

    it("offers a Claim button only for a completed challenge", () => {
      const { rerender } = render(<ChallengeCard challenge={completedChallenge} />);
      expect(
        screen.getByRole("button", { name: "Claim +150 XP" })
      ).toBeInTheDocument();

      rerender(<ChallengeCard challenge={mockChallenge} />);
      expect(screen.queryByRole("button", { name: /claim/i })).not.toBeInTheDocument();
    });

    it("opens the celebration, saves the claim and switches to Claimed", () => {
      render(<ChallengeCard challenge={completedChallenge} currentXp={500} />);

      fireEvent.click(screen.getByRole("button", { name: "Claim +150 XP" }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Reward claimed!")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(
        "Total XP went from 500 to 650."
      );

      // The open dialog hides the page behind it from assistive tech, hence `hidden: true`.
      const claimed = screen.getByRole("button", { name: "Claimed", hidden: true });
      expect(claimed).toBeDisabled();
      expect(
        screen.queryByRole("button", { name: "Claim +150 XP", hidden: true })
      ).not.toBeInTheDocument();
      expect(window.localStorage.getItem("codepulse:claimed-challenges")).toBe(
        JSON.stringify(["ch-claim"])
      );
    });

    it("closes the celebration with the Awesome button and stays claimed", () => {
      render(<ChallengeCard challenge={completedChallenge} />);
      fireEvent.click(screen.getByRole("button", { name: "Claim +150 XP" }));

      fireEvent.click(screen.getByRole("button", { name: "Awesome!" }));

      expect(screen.getByRole("button", { name: "Claimed" })).toBeDisabled();
    });

    it("shows Claimed when the challenge is already marked as claimed", () => {
      render(<ChallengeCard challenge={{ ...completedChallenge, isClaimed: true }} />);

      expect(screen.getByRole("button", { name: "Claimed" })).toBeDisabled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("still shows Claimed for this visit when storage is blocked", () => {
      installMemoryStorage({
        setItem: () => {
          throw new Error("blocked");
        },
      });
      render(<ChallengeCard challenge={completedChallenge} />);

      fireEvent.click(screen.getByRole("button", { name: "Claim +150 XP" }));

      expect(
        screen.getByRole("button", { name: "Claimed", hidden: true })
      ).toBeDisabled();
    });

    it("shows Claimed when a saved claim exists from an earlier visit", () => {
      window.localStorage.setItem(
        "codepulse:claimed-challenges",
        JSON.stringify(["ch-claim"])
      );

      render(<ChallengeCard challenge={completedChallenge} />);

      expect(screen.getByRole("button", { name: "Claimed" })).toBeDisabled();
    });
  });
});

