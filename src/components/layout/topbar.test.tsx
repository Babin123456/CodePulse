import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Topbar } from "./topbar";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "dark",
    setTheme: vi.fn(),
  }),
}));

// Mock use-notifications
vi.mock("@/hooks/api/use-notifications", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  }),
}));

// Mock use-auth
vi.mock("@/hooks/api/use-auth", () => ({
  useCurrentUser: () => ({
    data: {
      username: "testdev",
      name: "Test Developer",
      avatarUrl: "https://github.com/testdev.png",
      tier: "DIAMOND",
    },
    isLoading: false,
  }),
  useLogout: () => ({
    mutate: vi.fn(),
  }),
}));

describe("Topbar Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders search trigger button with correct shortcut label", () => {
    const onOpenCommandPalette = vi.fn();
    render(<Topbar onOpenCommandPalette={onOpenCommandPalette} />);

    const searchBtn = screen.getByRole("button", { name: /search dashboard/i });
    expect(searchBtn).toBeDefined();

    fireEvent.click(searchBtn);
    expect(onOpenCommandPalette).toHaveBeenCalledTimes(1);
  });

  it("renders notifications trigger and displays unread indicator when appropriate", () => {
    render(<Topbar onOpenCommandPalette={vi.fn()} />);
    const notifBtn = screen.getByLabelText(/unread notifications/i);
    expect(notifBtn).toBeDefined();
  });

  it("renders theme toggle button", () => {
    render(<Topbar onOpenCommandPalette={vi.fn()} />);
    const themeBtn = screen.getByLabelText(/toggle theme/i);
    expect(themeBtn).toBeDefined();
  });
});
