import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ForgotPasswordModal } from "./forgot-password-modal";
import { toast } from "sonner";

const mockResetPasswordForEmail = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ForgotPasswordModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the dialog when isOpen is true", () => {
    const onClose = vi.fn();
    render(<ForgotPasswordModal isOpen={true} onClose={onClose} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send Reset Link/i })).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    const onClose = vi.fn();
    render(<ForgotPasswordModal isOpen={false} onClose={onClose} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("pre-fills email when defaultEmail is provided", () => {
    const onClose = vi.fn();
    render(
      <ForgotPasswordModal
        isOpen={true}
        onClose={onClose}
        defaultEmail="developer@codepulse.dev"
      />
    );

    const input = screen.getByPlaceholderText("you@example.com") as HTMLInputElement;
    expect(input.value).toBe("developer@codepulse.dev");
  });

  it("shows validation error when submitting empty email or invalid email", async () => {
    const onClose = vi.fn();
    render(<ForgotPasswordModal isOpen={true} onClose={onClose} />);

    const submitBtn = screen.getByRole("button", { name: /Send Reset Link/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Email is required|Please enter a valid email address/i)).toBeInTheDocument();
    });

    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();

    const input = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(input, { target: { value: "invalid-email" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
    });

    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("triggers supabase.auth.resetPasswordForEmail and shows confirmation on success", async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({ error: null });

    const onClose = vi.fn();
    render(<ForgotPasswordModal isOpen={true} onClose={onClose} />);

    const input = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(input, { target: { value: "alex@example.com" } });

    const submitBtn = screen.getByRole("button", { name: /Send Reset Link/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        "alex@example.com",
        expect.objectContaining({
          redirectTo: expect.stringContaining("/auth/callback?next=/settings"),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Check your inbox")).toBeInTheDocument();
      expect(screen.getByText("alex@example.com")).toBeInTheDocument();
    });

    expect(toast.success).toHaveBeenCalledWith("Password reset instructions sent to your email!");
  });

  it("displays error toast if supabase reset returns an error", async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({
      error: { message: "User not found with this email" },
    });

    const onClose = vi.fn();
    render(<ForgotPasswordModal isOpen={true} onClose={onClose} />);

    const input = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(input, { target: { value: "notfound@example.com" } });

    const submitBtn = screen.getByRole("button", { name: /Send Reset Link/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("User not found with this email");
    });

    // Form stays visible, no success screen
    expect(screen.queryByText("Check your inbox")).not.toBeInTheDocument();
  });

  it("calls onClose when Back to Login button is clicked", () => {
    const onClose = vi.fn();
    render(<ForgotPasswordModal isOpen={true} onClose={onClose} />);

    const backBtn = screen.getByRole("button", { name: /Back to Login/i });
    fireEvent.click(backBtn);

    expect(onClose).toHaveBeenCalled();
  });
});
