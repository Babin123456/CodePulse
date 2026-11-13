import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildUserDataExport,
  downloadUserDataExport,
  formatFileSize,
} from "./data-export";

describe("data-export utility", () => {
  describe("formatFileSize", () => {
    it("formats 0 and negative bytes correctly", () => {
      expect(formatFileSize(0)).toBe("0 B");
      expect(formatFileSize(-10)).toBe("0 B");
      expect(formatFileSize(NaN)).toBe("0 B");
    });

    it("formats small bytes correctly", () => {
      expect(formatFileSize(500)).toBe("500 B");
      expect(formatFileSize(1023)).toBe("1023 B");
    });

    it("formats kilobytes correctly", () => {
      expect(formatFileSize(1024)).toBe("1.0 KB");
      expect(formatFileSize(2048)).toBe("2.0 KB");
      expect(formatFileSize(15360)).toBe("15.0 KB");
    });

    it("formats megabytes correctly", () => {
      expect(formatFileSize(1024 * 1024)).toBe("1.00 MB");
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.50 MB");
    });
  });

  describe("buildUserDataExport", () => {
    it("builds a full structured payload with default mock fallback data", () => {
      const payload = buildUserDataExport();

      expect(payload).toHaveProperty("exportDate");
      expect(payload.schemaVersion).toBe("1.0.0");
      expect(payload.user).toBeDefined();
      expect(payload.user.username).toBeDefined();
      expect(Array.isArray(payload.repositories)).toBe(true);
      expect(Array.isArray(payload.achievements)).toBe(true);
      expect(Array.isArray(payload.badges)).toBe(true);
      expect(Array.isArray(payload.challenges)).toBe(true);
      expect(Array.isArray(payload.battles)).toBe(true);
    });

    it("preserves custom user attributes passed in", () => {
      const customUser = {
        id: "custom-user-123",
        username: "johndoe",
        name: "John Doe",
        email: "john@example.com",
        bio: "Open source builder",
        location: "San Francisco, CA",
        company: "Acme Corp",
        website: "https://example.com",
      };

      const payload = buildUserDataExport({ user: customUser });

      expect(payload.user.id).toBe("custom-user-123");
      expect(payload.user.username).toBe("johndoe");
      expect(payload.user.name).toBe("John Doe");
      expect(payload.user.email).toBe("john@example.com");
      expect(payload.user.bio).toBe("Open source builder");
    });

    it("includes custom repositories and achievements when provided", () => {
      const customRepo = {
        id: "repo-1",
        name: "my-repo",
        fullName: "johndoe/my-repo",
        description: "Test repo",
        language: "TypeScript",
        languageColor: "#3178c6",
        stars: 10,
        forks: 2,
        watchers: 5,
        issues: 0,
        pullRequests: 1,
        commits: 50,
        contributors: 1,
        size: 100,
        createdAt: "2024-01-01",
        updatedAt: "2024-02-01",
        topics: ["react"],
        isPrivate: false,
        url: "https://github.com/johndoe/my-repo",
      };

      const payload = buildUserDataExport({
        repositories: [customRepo],
        achievements: [],
      });

      expect(payload.repositories).toHaveLength(1);
      expect(payload.repositories[0].name).toBe("my-repo");
      expect(payload.achievements).toHaveLength(0);
    });
  });

  describe("downloadUserDataExport", () => {
    let originalCreateObjectURL: typeof URL.createObjectURL;
    let originalRevokeObjectURL: typeof URL.revokeObjectURL;

    beforeEach(() => {
      originalCreateObjectURL = URL.createObjectURL;
      originalRevokeObjectURL = URL.revokeObjectURL;

      URL.createObjectURL = vi.fn(() => "blob:mock-url");
      URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      vi.restoreAllMocks();
    });

    it("generates blob, triggers download, and cleans up URL", () => {
      const payload = buildUserDataExport({
        user: { username: "nilesh0199" },
      });

      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(() => {});
      const appendChildSpy = vi.spyOn(document.body, "appendChild");
      const removeChildSpy = vi.spyOn(document.body, "removeChild");

      const result = downloadUserDataExport(payload);

      expect(result.filename).toBe("codepulse-data-export-nilesh0199.json");
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.formattedSize).toBeDefined();

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });

    it("sanitizes username for safe filenames", () => {
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
        () => {}
      );
      const payload = buildUserDataExport({
        user: { username: "User / With @ Characters!" },
      });

      const result = downloadUserDataExport(payload);
      expect(result.filename).toBe(
        "codepulse-data-export-user___with___characters_.json"
      );
    });
  });
});
