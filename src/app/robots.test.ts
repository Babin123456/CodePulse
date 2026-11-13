import { describe, it, expect, beforeEach, afterEach } from "vitest";
import robots from "./robots";

describe("robots.txt metadata route", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return correct default robots rules and dynamic sitemap URL", () => {
    const config = robots();

    expect(config).toBeDefined();
    expect(config.sitemap).toBe("https://code-pulse-three.vercel.app/sitemap.xml");

    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    expect(rules).toBeDefined();
    expect(rules?.userAgent).toBe("*");
    expect(rules?.allow).toEqual(["/", "/login", "/signup", "/maintenance"]);
    expect(rules?.disallow).toEqual(["/(dashboard)/*", "/api/*", "/auth/*"]);
  });

  it("should respect NEXT_PUBLIC_APP_URL when configured", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://custom-domain.com";

    const config = robots();
    expect(config.sitemap).toBe("https://custom-domain.com/sitemap.xml");
  });

  it("should handle trailing slash in NEXT_PUBLIC_APP_URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://custom-domain.com/";

    const config = robots();
    expect(config.sitemap).toBe("https://custom-domain.com/sitemap.xml");
  });

  it("should respect NEXT_PUBLIC_SITE_URL when NEXT_PUBLIC_APP_URL is not set", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://site-domain.org";

    const config = robots();
    expect(config.sitemap).toBe("https://site-domain.org/sitemap.xml");
  });
});
