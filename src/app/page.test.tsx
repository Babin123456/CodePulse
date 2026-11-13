import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPage from "./page";

beforeAll(() => {
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = "";
    readonly thresholds: ReadonlyArray<number> = [];
    disconnect = vi.fn();
    observe = vi.fn();
    takeRecords = vi.fn(() => []);
    unobserve = vi.fn();
  }

  globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
});

describe("LandingPage Accessibility (#72)", () => {
  it("renders standard semantic landmarks (header, nav, main, footer)", () => {
    render(<LandingPage />);

    const header = screen.getByRole("banner");
    expect(header).toBeDefined();

    const mainNav = screen.getByRole("navigation", { name: "Main Navigation" });
    expect(mainNav).toBeDefined();

    const main = screen.getByRole("main");
    expect(main).toBeDefined();
    expect(main.id).toBe("main-content");

    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeDefined();

    const footerNav = screen.getByRole("navigation", { name: "Footer Navigation" });
    expect(footerNav).toBeDefined();
  });

  it("includes an accessible keyboard skip-to-content link", () => {
    render(<LandingPage />);

    const skipLink = screen.getByText("Skip to main content");
    expect(skipLink).toBeDefined();
    expect(skipLink.getAttribute("href")).toBe("#main-content");
    expect(skipLink.className).toContain("sr-only");
    expect(skipLink.className).toContain("focus:not-sr-only");
  });

  it("provides meaningful aria-labels for icon-only and interactive links", () => {
    render(<LandingPage />);

    expect(screen.getByRole("link", { name: "CodePulse Homepage" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Sign in to your CodePulse account" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Get started with CodePulse" })).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Start with GitHub - Track and gamify your coding journey" })
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "View interactive demo of developer analytics" })
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Get started with CodePulse for free" })
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "CodePulse on GitHub" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Abhijeet on GitHub" })).toBeDefined();
  });

  it("ensures interactive controls have visible focus rings", () => {
    render(<LandingPage />);

    const homeLink = screen.getByRole("link", { name: "CodePulse Homepage" });
    expect(homeLink.className).toContain("focus-visible:ring-2");
    expect(homeLink.className).toContain("focus-visible:ring-sky-400");

    const githubCta = screen.getByRole("link", {
      name: "Start with GitHub - Track and gamify your coding journey",
    });
    expect(githubCta.className).toContain("focus-visible:ring-2");
    expect(githubCta.className).toContain("focus-visible:ring-sky-400");

    const footerGithub = screen.getByRole("link", { name: "CodePulse on GitHub" });
    expect(footerGithub.className).toContain("focus-visible:ring-2");
  });

  it("hides decorative 3D background canvases, grid overlays, and particles with aria-hidden", () => {
    const { container } = render(<LandingPage />);

    const ariaHiddenNodes = container.querySelectorAll('[aria-hidden="true"]');
    expect(ariaHiddenNodes.length).toBeGreaterThanOrEqual(5);

    // Decorative 3D mockup dashboard
    const heroDashboard = container.querySelector(".hero-dashboard");
    expect(heroDashboard?.parentElement?.getAttribute("aria-hidden")).toBe("true");
  });
});
