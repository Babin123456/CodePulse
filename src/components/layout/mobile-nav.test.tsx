import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MobileNav, MOBILE_NAV_ITEMS } from "./mobile-nav";

const mockState = vi.hoisted(() => ({
  pathname: "/dashboard",
  shouldReduceMotion: false,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockState.pathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    useReducedMotion: () => mockState.shouldReduceMotion,
  };
});

describe("MobileNav Component (#91)", () => {
  beforeEach(() => {
    mockState.pathname = "/dashboard";
    mockState.shouldReduceMotion = false;
  });

  it("renders all 5 core navigation tabs with proper titles and destinations", () => {
    render(<MobileNav />);

    expect(MOBILE_NAV_ITEMS).toHaveLength(5);

    const homeTab = screen.getByTestId("mobile-nav-home");
    const battlesTab = screen.getByTestId("mobile-nav-battles");
    const compareTab = screen.getByTestId("mobile-nav-compare");
    const leaderboardTab = screen.getByTestId("mobile-nav-leaderboard");
    const profileTab = screen.getByTestId("mobile-nav-profile");

    expect(homeTab.getAttribute("href")).toBe("/dashboard");
    expect(battlesTab.getAttribute("href")).toBe("/battles");
    expect(compareTab.getAttribute("href")).toBe("/compare");
    expect(leaderboardTab.getAttribute("href")).toBe("/leaderboard");
    expect(profileTab.getAttribute("href")).toBe("/profile");

    expect(screen.getByText("Home")).toBeDefined();
    expect(screen.getByText("Battles")).toBeDefined();
    expect(screen.getByText("Compare")).toBeDefined();
    expect(screen.getByText("Leaderboard")).toBeDefined();
    expect(screen.getByText("Profile")).toBeDefined();
  });

  it("applies fixed bottom, blur, and md:hidden classes to the container", () => {
    const { container } = render(<MobileNav />);
    const nav = container.querySelector("#mobile-bottom-nav");

    expect(nav).toBeDefined();
    expect(nav?.className).toContain("fixed");
    expect(nav?.className).toContain("bottom-0");
    expect(nav?.className).toContain("inset-x-0");
    expect(nav?.className).toContain("z-40");
    expect(nav?.className).toContain("md:hidden");
    expect(nav?.className).toContain("backdrop-blur-xl");
  });

  it("highlights Home as active when pathname is /dashboard", () => {
    mockState.pathname = "/dashboard";
    render(<MobileNav />);

    const homeTab = screen.getByTestId("mobile-nav-home");
    const battlesTab = screen.getByTestId("mobile-nav-battles");

    expect(homeTab.getAttribute("aria-current")).toBe("page");
    expect(battlesTab.getAttribute("aria-current")).toBeNull();

    expect(screen.getByTestId("mobile-nav-active-indicator")).toBeDefined();
    expect(screen.getByTestId("mobile-nav-active-glow")).toBeDefined();
  });

  it("highlights Battles when pathname is /battles or a subroute", () => {
    mockState.pathname = "/battles/123";
    render(<MobileNav />);

    const homeTab = screen.getByTestId("mobile-nav-home");
    const battlesTab = screen.getByTestId("mobile-nav-battles");

    expect(homeTab.getAttribute("aria-current")).toBeNull();
    expect(battlesTab.getAttribute("aria-current")).toBe("page");
  });

  it("highlights Compare when pathname is /compare", () => {
    mockState.pathname = "/compare";
    render(<MobileNav />);

    const compareTab = screen.getByTestId("mobile-nav-compare");
    expect(compareTab.getAttribute("aria-current")).toBe("page");
  });

  it("highlights Leaderboard when pathname is /leaderboard", () => {
    mockState.pathname = "/leaderboard";
    render(<MobileNav />);

    const leaderboardTab = screen.getByTestId("mobile-nav-leaderboard");
    expect(leaderboardTab.getAttribute("aria-current")).toBe("page");
  });

  it("highlights Profile when pathname is /profile", () => {
    mockState.pathname = "/profile";
    render(<MobileNav />);

    const profileTab = screen.getByTestId("mobile-nav-profile");
    expect(profileTab.getAttribute("aria-current")).toBe("page");
  });

  it("renders cleanly with reduced motion enabled", () => {
    mockState.shouldReduceMotion = true;
    mockState.pathname = "/dashboard";
    render(<MobileNav />);

    const indicator = screen.getByTestId("mobile-nav-active-indicator");
    expect(indicator).toBeDefined();
  });
});
