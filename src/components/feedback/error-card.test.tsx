import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorCard } from "./error-card";

describe("ErrorCard Component (#74)", () => {
  const mockReset = vi.fn();
  const mockError = new Error("Database query failed") as Error & { digest?: string };

  it("renders the error card with warning icon, default title, message, and action triggers", () => {
    render(<ErrorCard error={mockError} reset={mockReset} />);

    expect(screen.getByTestId("error-boundary-card")).toBeDefined();
    expect(screen.getByTestId("error-warning-icon")).toBeDefined();
    expect(screen.getByText("Application Error")).toBeDefined();
    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(
      screen.getByText(
        "An unexpected error occurred while loading this section. You can try again or return to the dashboard."
      )
    ).toBeDefined();

    const tryAgainBtn = screen.getByTestId("error-try-again-button");
    expect(tryAgainBtn).toBeDefined();
    expect(screen.getByText("Try Again")).toBeDefined();

    const dashboardLink = screen.getByTestId("error-dashboard-link");
    expect(dashboardLink.getAttribute("href")).toBe("/dashboard");
    expect(screen.getByText("Back to Dashboard")).toBeDefined();
  });

  it("triggers reset() when clicking the Try Again button", () => {
    mockReset.mockClear();
    render(<ErrorCard error={mockError} reset={mockReset} />);

    const tryAgainBtn = screen.getByTestId("error-try-again-button");
    fireEvent.click(tryAgainBtn);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("renders custom title and message when provided", () => {
    render(
      <ErrorCard
        error={mockError}
        reset={mockReset}
        title="Custom Failure"
        message="Please check your internet connection."
      />
    );

    expect(screen.getByText("Custom Failure")).toBeDefined();
    expect(screen.getByText("Please check your internet connection.")).toBeDefined();
  });

  it("renders the error digest code when available", () => {
    const errorWithDigest = new Error("Failed") as Error & { digest?: string };
    errorWithDigest.digest = "NEXT_ERR_83921";

    render(<ErrorCard error={errorWithDigest} reset={mockReset} />);

    const digestElem = screen.getByTestId("error-digest");
    expect(digestElem).toBeDefined();
    expect(digestElem.textContent).toContain("Digest: NEXT_ERR_83921");
  });

  it("can hide the Back to Dashboard link when showDashboardLink is false", () => {
    render(<ErrorCard error={mockError} reset={mockReset} showDashboardLink={false} />);

    expect(screen.queryByTestId("error-dashboard-link")).toBeNull();
  });
});
