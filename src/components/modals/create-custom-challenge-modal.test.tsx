import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { installMemoryStorage } from "@/test/memory-storage";
import { CreateCustomChallengeModal } from "./create-custom-challenge-modal";
import { getCustomChallenges } from "@/lib/custom-challenges";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("CreateCustomChallengeModal", () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it("renders modal form inputs when open", () => {
    const onOpenChange = vi.fn();
    render(<CreateCustomChallengeModal open={true} onOpenChange={onOpenChange} />);

    expect(screen.getByText("Create Custom Quest")).toBeInTheDocument();
    expect(screen.getByLabelText(/Quest Title/i)).toBeInTheDocument();
    expect(screen.getByText("Commits")).toBeInTheDocument();
    expect(screen.getByText("Pull Requests")).toBeInTheDocument();
    expect(screen.getByLabelText(/Target Count/i)).toBeInTheDocument();
    expect(screen.getByText("3 Days")).toBeInTheDocument();
    expect(screen.getByText("7 Days")).toBeInTheDocument();
    expect(screen.getByText("14 Days")).toBeInTheDocument();
    expect(screen.getByText("Easy")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Hard")).toBeInTheDocument();
  });

  it("does not render dialog content when open is false", () => {
    render(<CreateCustomChallengeModal open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByText("Create Custom Quest")).not.toBeInTheDocument();
  });

  it("displays validation error when submitting with empty title", () => {
    render(<CreateCustomChallengeModal open={true} onOpenChange={vi.fn()} />);

    const submitBtn = screen.getByRole("button", { name: /Create Quest/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText("Title is required")).toBeInTheDocument();
    expect(getCustomChallenges()).toHaveLength(0);
  });

  it("updates difficulty and dynamically changes XP reward display", () => {
    render(<CreateCustomChallengeModal open={true} onOpenChange={vi.fn()} />);

    // Default is medium (125 XP)
    expect(screen.getByText(/Reward: 125 XP/i)).toBeInTheDocument();

    // Click Easy
    fireEvent.click(screen.getByText("Easy"));
    expect(screen.getByText(/Reward: 50 XP/i)).toBeInTheDocument();

    // Click Hard
    fireEvent.click(screen.getByText("Hard"));
    expect(screen.getByText(/Reward: 250 XP/i)).toBeInTheDocument();
  });

  it("successfully creates and persists custom quest on valid submission", () => {
    const onOpenChange = vi.fn();
    const onQuestCreated = vi.fn();

    render(
      <CreateCustomChallengeModal
        open={true}
        onOpenChange={onOpenChange}
        onQuestCreated={onQuestCreated}
      />
    );

    const titleInput = screen.getByLabelText(/Quest Title/i);
    fireEvent.change(titleInput, { target: { value: "Hackathon Sprint 2026" } });

    fireEvent.click(screen.getByText("Pull Requests"));
    fireEvent.click(screen.getByText("14 Days"));
    fireEvent.click(screen.getByText("Hard"));

    const submitBtn = screen.getByRole("button", { name: /Create Quest/i });
    fireEvent.click(submitBtn);

    const challenges = getCustomChallenges();
    expect(challenges).toHaveLength(1);
    expect(challenges[0].title).toBe("Hackathon Sprint 2026");
    expect(challenges[0].metricType).toBe("PRs");
    expect(challenges[0].difficulty).toBe("hard");
    expect(challenges[0].xpReward).toBe(250);
    expect(challenges[0].isCustom).toBe(true);

    expect(onQuestCreated).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
