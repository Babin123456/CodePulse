import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import confetti from "canvas-confetti";
import { ClaimRewardModal } from "./claim-reward-modal";

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

const reducedMotion = vi.hoisted(() => ({ value: false }));
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => reducedMotion.value };
});

const challenge = { title: "Git Master", xpReward: 150 };

function renderModal(props: Partial<Parameters<typeof ClaimRewardModal>[0]> = {}) {
  const onClose = vi.fn();
  render(
    <ClaimRewardModal
      isOpen
      onClose={onClose}
      challenge={challenge}
      previousXp={1000}
      {...props}
    />
  );
  return { onClose };
}

describe("ClaimRewardModal", () => {
  beforeEach(() => {
    reducedMotion.value = false;
    vi.mocked(confetti).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the reward, the challenge name and the new XP total", () => {
    reducedMotion.value = true;
    renderModal();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Reward claimed!")).toBeInTheDocument();
    expect(screen.getByText(/Git Master/)).toBeInTheDocument();
    expect(screen.getByText("+150 XP")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Total XP went from 1,000 to 1,150."
    );
    // With reduced motion the total is shown straight away, with no counting up.
    expect(screen.getByText("1,150")).toBeInTheDocument();
  });

  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("fires confetti once the chest opens", async () => {
    vi.useFakeTimers();
    renderModal();

    expect(confetti).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
      await vi.dynamicImportSettled();
    });

    expect(confetti).toHaveBeenCalled();
    const options = vi.mocked(confetti).mock.calls[0][0];
    expect(options?.shapes).toEqual(["star"]);
  });

  it("skips confetti when the user prefers reduced motion", async () => {
    vi.useFakeTimers();
    reducedMotion.value = true;
    renderModal();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
      await vi.dynamicImportSettled();
    });

    expect(confetti).not.toHaveBeenCalled();
  });

  it("calls onClose from the Awesome button", () => {
    reducedMotion.value = true;
    const { onClose } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Awesome!" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Escape is pressed", () => {
    reducedMotion.value = true;
    const { onClose } = renderModal();

    fireEvent.keyDown(document.body, { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
  });
});
