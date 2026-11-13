import { describe, it, expect, beforeEach, afterEach } from "vitest";
import sitemap from "./sitemap";

describe("sitemap.xml metadata route", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return public routes with default base URL", () => {
    const entries = sitemap();

    expect(entries).toBeDefined();
    expect(entries).toHaveLength(4);

    const urls = entries.map((entry) => entry.url);
    expect(urls).toEqual([
      "https://code-pulse-three.vercel.app",
      "https://code-pulse-three.vercel.app/login",
      "https://code-pulse-three.vercel.app/signup",
      "https://code-pulse-three.vercel.app/maintenance",
    ]);

    const home = entries.find(
      (entry) => entry.url === "https://code-pulse-three.vercel.app",
    );
    expect(home).toBeDefined();
    expect(home?.priority).toBe(1.0);
    expect(home?.changeFrequency).toBe("daily");
    expect(home?.lastModified).toBeInstanceOf(Date);

    const login = entries.find(
      (entry) => entry.url === "https://code-pulse-three.vercel.app/login",
    );
    expect(login).toBeDefined();
    expect(login?.priority).toBe(0.8);
    expect(login?.changeFrequency).toBe("monthly");
    expect(login?.lastModified).toBeInstanceOf(Date);

    const signup = entries.find(
      (entry) => entry.url === "https://code-pulse-three.vercel.app/signup",
    );
    expect(signup).toBeDefined();
    expect(signup?.priority).toBe(0.8);
    expect(signup?.changeFrequency).toBe("monthly");
    expect(signup?.lastModified).toBeInstanceOf(Date);

    const maintenance = entries.find(
      (entry) =>
        entry.url === "https://code-pulse-three.vercel.app/maintenance",
    );
    expect(maintenance).toBeDefined();
    expect(maintenance?.priority).toBe(0.5);
    expect(maintenance?.changeFrequency).toBe("monthly");
    expect(maintenance?.lastModified).toBeInstanceOf(Date);
  });

  it("should dynamically prefix routes with NEXT_PUBLIC_APP_URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://custom-analytics.dev";

    const entries = sitemap();
    expect(entries.map((e) => e.url)).toEqual([
      "https://custom-analytics.dev",
      "https://custom-analytics.dev/login",
      "https://custom-analytics.dev/signup",
      "https://custom-analytics.dev/maintenance",
    ]);
  });

  it("should trim trailing slash from base URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://custom-analytics.dev/";

    const entries = sitemap();
    expect(entries.map((e) => e.url)).toEqual([
      "https://custom-analytics.dev",
      "https://custom-analytics.dev/login",
      "https://custom-analytics.dev/signup",
      "https://custom-analytics.dev/maintenance",
    ]);
  });
});
