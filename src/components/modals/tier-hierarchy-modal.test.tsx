import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TierHierarchyModal } from "./tier-hierarchy-modal";
import { DeveloperRatingCard } from "@/components/cards/developer-rating-card";
import type { DeveloperRating } from "@/types";

describe("TierHierarchyModal", () => {
  it("renders all 7 tiers with exact score thresholds when open", () => {
    const onClose = vi.fn();
    render(<TierHierarchyModal isOpen={true} onClose={onClose} currentTier="Gold" />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Developer Rank & Tier Hierarchy")).toBeInTheDocument();

    // Verify all 7 tiers are displayed
    expect(screen.getByRole("heading", { name: "Bronze" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Silver" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Gold" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Platinum" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Diamond" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Master" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Grandmaster" })).toBeInTheDocument();

    // Verify expected score ranges are present
    expect(screen.getAllByText("0 - 500").length).toBeGreaterThan(0);
    expect(screen.getAllByText("500 - 1000").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1000 - 2000").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2000 - 3500").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3500 - 5000").length).toBeGreaterThan(0);
    expect(screen.getAllByText("5000 - 7500").length).toBeGreaterThan(0);
    expect(screen.getAllByText("7500+").length).toBeGreaterThan(0);
  });

  it("highlights current tier with a Current Tier badge", () => {
    const onClose = vi.fn();
    render(<TierHierarchyModal isOpen={true} onClose={onClose} currentTier="Platinum" currentScore={2400} />);

    // Should indicate Platinum as current tier
    const currentTierBadges = screen.getAllByText(/Current Tier/i);
    expect(currentTierBadges.length).toBeGreaterThan(0);
    expect(screen.getByText(/Your Current Tier:/i)).toBeInTheDocument();
  });

  it("calls onClose when Close Roadmap button is clicked", () => {
    const onClose = vi.fn();
    render(<TierHierarchyModal isOpen={true} onClose={onClose} currentTier="Silver" />);

    const closeBtn = screen.getByRole("button", { name: /Close Roadmap/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("does not render dialog content when isOpen is false", () => {
    const onClose = vi.fn();
    render(<TierHierarchyModal isOpen={false} onClose={onClose} currentTier="Gold" />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("DeveloperRatingCard with TierHierarchyModal Integration", () => {
  const mockRating: DeveloperRating = {
    overall: 1250,
    level: 14,
    xp: 4200,
    xpToNextLevel: 5000,
    rank: 420,
    totalDevelopers: 125000,
    tier: "Gold",
    growthScore: 88,
  };

  it("opens TierHierarchyModal when clicking HelpCircle info button", () => {
    render(<DeveloperRatingCard rating={mockRating} username="johndoe" />);

    // Modal is initially closed
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Click help icon
    const helpBtn = screen.getByLabelText("Explain developer rank thresholds");
    fireEvent.click(helpBtn);

    // Modal should now be open
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Developer Rank & Tier Hierarchy")).toBeInTheDocument();
  });

  it("opens TierHierarchyModal when clicking the tier badge directly", () => {
    render(<DeveloperRatingCard rating={mockRating} username="johndoe" />);

    // Click tier badge button
    const tierBadgeBtn = screen.getByRole("button", { name: /Tier: Gold/i });
    fireEvent.click(tierBadgeBtn);

    // Modal should now be open
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Developer Rank & Tier Hierarchy")).toBeInTheDocument();
  });
});

