import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitForElementToBeRemoved } from "@testing-library/react";
import { BackToTop } from "./back-to-top";

describe("BackToTop Component", () => {
  const originalScrollTo = window.scrollTo;

  beforeEach(() => {
    window.scrollTo = vi.fn();
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    window.scrollTo = originalScrollTo;
    vi.restoreAllMocks();
  });

  it("should not be visible initially when scroll position is at the top", () => {
    render(<BackToTop />);
    expect(screen.queryByRole("button", { name: /back to top/i })).not.toBeInTheDocument();
  });

  it("should become visible when scrolling past the default 350px threshold", () => {
    render(<BackToTop />);

    expect(screen.queryByRole("button", { name: /back to top/i })).not.toBeInTheDocument();

    act(() => {
      window.scrollY = 351;
      fireEvent.scroll(window);
    });

    const button = screen.getByRole("button", { name: /back to top/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "Back to top");
  });

  it("should disappear when scrolling back up below the threshold", async () => {
    render(<BackToTop />);

    act(() => {
      window.scrollY = 400;
      fireEvent.scroll(window);
    });

    const button = screen.getByRole("button", { name: /back to top/i });
    expect(button).toBeInTheDocument();

    act(() => {
      window.scrollY = 200;
      fireEvent.scroll(window);
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByRole("button", { name: /back to top/i }),
    );
  });

  it("should smoothly scroll window to top when clicked", () => {
    render(<BackToTop />);

    act(() => {
      window.scrollY = 500;
      fireEvent.scroll(window);
    });

    const button = screen.getByRole("button", { name: /back to top/i });
    fireEvent.click(button);

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });

  it("should respect custom threshold prop", () => {
    render(<BackToTop threshold={150} />);

    act(() => {
      window.scrollY = 100;
      fireEvent.scroll(window);
    });
    expect(screen.queryByRole("button", { name: /back to top/i })).not.toBeInTheDocument();

    act(() => {
      window.scrollY = 151;
      fireEvent.scroll(window);
    });
    expect(screen.getByRole("button", { name: /back to top/i })).toBeInTheDocument();
  });

  it("should merge custom className with default styles", () => {
    render(<BackToTop className="custom-test-class bottom-20" />);

    act(() => {
      window.scrollY = 400;
      fireEvent.scroll(window);
    });

    const button = screen.getByRole("button", { name: /back to top/i });
    expect(button.className).toContain("custom-test-class");
    expect(button.className).toContain("bottom-20");
    expect(button.className).toContain("glass-strong");
  });

  it("should clean up scroll event listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<BackToTop />);

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});
