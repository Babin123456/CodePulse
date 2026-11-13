import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardError from "./(dashboard)/error";
import RootError from "./error";
import GlobalError from "./global-error";

describe("Next.js Error Boundaries (#74)", () => {
  const mockReset = vi.fn();
  const mockError = new Error("Mock render crash") as Error & { digest?: string };
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("DashboardError boundary (src/app/(dashboard)/error.tsx)", () => {
    it("logs the error to console on mount and renders localized recovery card", () => {
      render(<DashboardError error={mockError} reset={mockReset} />);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Dashboard Error Boundary caught an exception:",
        mockError
      );

      expect(screen.getByTestId("error-title").textContent).toBe("Dashboard Error");
      expect(screen.getByText("Try Again")).toBeDefined();
      expect(screen.getByText("Back to Dashboard")).toBeDefined();
    });

    it("triggers reset() when Try Again is clicked", () => {
      render(<DashboardError error={mockError} reset={mockReset} />);

      const tryAgain = screen.getByTestId("error-try-again-button");
      fireEvent.click(tryAgain);

      expect(mockReset).toHaveBeenCalledTimes(1);
    });
  });

  describe("RootError boundary (src/app/error.tsx)", () => {
    it("logs the error to console on mount and renders application error card", () => {
      render(<RootError error={mockError} reset={mockReset} />);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Root Error Boundary caught an exception:",
        mockError
      );

      expect(screen.getByTestId("error-title").textContent).toBe("Something Went Wrong");
      expect(screen.getByText("Try Again")).toBeDefined();
      expect(screen.getByText("Back to Dashboard")).toBeDefined();
    });
  });

  describe("GlobalError boundary (src/app/global-error.tsx)", () => {
    it("logs the error to console on mount and renders with html and body tags", () => {
      const { container } = render(<GlobalError error={mockError} reset={mockReset} />);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Global Error Boundary caught an exception:",
        mockError
      );

      expect(screen.getByTestId("error-title").textContent).toBe("Critical Application Error");
      expect(container.querySelector("body")).toBeDefined();
    });
  });
});
