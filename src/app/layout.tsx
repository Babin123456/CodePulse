import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    template: "%s | DevBattle",
    default: "DevBattle — GitHub Developer Analytics & Gamification Platform",
  },
  description:
    "The ultimate platform for GitHub developer analytics, comparison, gamification, and leaderboards. Track your coding journey, compete with friends, and level up your development skills.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CodePulse",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-dark.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  keywords: [
    "GitHub",
    "developer analytics",
    "coding statistics",
    "developer comparison",
    "gamification",
    "leaderboard",
    "coding challenges",
  ],
  authors: [{ name: "DevBattle" }],
  openGraph: {
    title: "DevBattle — GitHub Developer Analytics & Gamification",
    description:
      "Track, compare, and gamify your GitHub development journey. The most beautiful developer analytics platform.",
    type: "website",
    siteName: "DevBattle",
  },
  twitter: {
    card: "summary_large_image",
    title: "DevBattle — GitHub Developer Analytics & Gamification",
    description:
      "Track, compare, and gamify your GitHub development journey.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
