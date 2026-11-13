import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RepoCloneDropdown } from "./repo-clone-dropdown";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("RepoCloneDropdown", () => {
  const sampleFullName = "facebook/react";

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the trigger button closed by default", () => {
    render(<RepoCloneDropdown fullName={sampleFullName} />);

    const button = screen.getByRole("button", { name: /Code or Clone repository/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Clone Repository")).not.toBeInTheDocument();
  });

  it("opens the dropdown menu when trigger button is clicked", () => {
    render(<RepoCloneDropdown fullName={sampleFullName} />);

    const button = screen.getByRole("button", { name: /Code or Clone repository/i });
    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Clone Repository")).toBeInTheDocument();
    expect(screen.getByText("All Protocols (1-Click Copy)")).toBeInTheDocument();
  });

  it("displays correct HTTPS, SSH, CLI, and VS Code clone URLs", () => {
    render(<RepoCloneDropdown fullName={sampleFullName} />);

    fireEvent.click(screen.getByRole("button", { name: /Code or Clone repository/i }));

    const expectedHttps = "https://github.com/facebook/react.git";
    const expectedSsh = "git@github.com:facebook/react.git";
    const expectedCli = "gh repo clone facebook/react";
    const expectedVscode = "vscode://vscode.git/clone?url=https://github.com/facebook/react.git";

    // HTTPS input by default
    const activeInput = screen.getByLabelText("HTTPS clone command") as HTMLInputElement;
    expect(activeInput.value).toBe(expectedHttps);

    // Quick copy rows
    expect(screen.getByText(expectedHttps)).toBeInTheDocument();
    expect(screen.getByText(expectedSsh)).toBeInTheDocument();
    expect(screen.getByText(expectedCli)).toBeInTheDocument();

    // VS Code link
    const vsCodeAnchor = screen.getByRole("link", { name: /Open in Visual Studio Code/i });
    expect(vsCodeAnchor).toHaveAttribute("href", expectedVscode);
  });

  it("switches active protocol tabs when clicked", () => {
    render(<RepoCloneDropdown fullName={sampleFullName} />);

    fireEvent.click(screen.getByRole("button", { name: /Code or Clone repository/i }));

    // Click SSH tab
    const sshTab = screen.getByRole("button", { name: "SSH" });
    fireEvent.click(sshTab);

    const sshInput = screen.getByLabelText("SSH clone command") as HTMLInputElement;
    expect(sshInput.value).toBe("git@github.com:facebook/react.git");

    // Click CLI tab
    const cliTab = screen.getByRole("button", { name: "GitHub CLI" });
    fireEvent.click(cliTab);

    const cliInput = screen.getByLabelText("GitHub CLI clone command") as HTMLInputElement;
    expect(cliInput.value).toBe("gh repo clone facebook/react");
  });

  it("copies active clone URL to clipboard with confirmation toast", async () => {
    render(<RepoCloneDropdown fullName={sampleFullName} />);

    fireEvent.click(screen.getByRole("button", { name: /Code or Clone repository/i }));

    const copyBtn = screen.getByLabelText("Copy HTTPS command");
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "https://github.com/facebook/react.git"
      );
      expect(toast.success).toHaveBeenCalledWith("HTTPS clone URL copied to clipboard!");
    });
  });

  it("copies SSH URL using 1-click quick row button", async () => {
    render(<RepoCloneDropdown fullName={sampleFullName} />);

    fireEvent.click(screen.getByRole("button", { name: /Code or Clone repository/i }));

    const copySshBtn = screen.getByLabelText("Copy SSH URL");
    fireEvent.click(copySshBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "git@github.com:facebook/react.git"
      );
      expect(toast.success).toHaveBeenCalledWith("SSH clone URL copied to clipboard!");
    });
  });

  it("closes dropdown when Escape key is pressed", async () => {
    render(<RepoCloneDropdown fullName={sampleFullName} />);

    const trigger = screen.getByRole("button", { name: /Code or Clone repository/i });
    fireEvent.click(trigger);
    expect(screen.getByText("Clone Repository")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByText("Clone Repository")).not.toBeInTheDocument();
    });
  });
});
