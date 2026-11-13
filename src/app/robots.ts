import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://code-pulse-three.vercel.app"
  ).replace(/\/$/, "");

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/signup", "/maintenance"],
      disallow: ["/(dashboard)/*", "/api/*", "/auth/*"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
