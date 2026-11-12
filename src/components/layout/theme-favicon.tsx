"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

// Points every <link rel="icon"> at the favicon matching the active theme.
// SSR ships the dark icon; resolvedTheme is undefined until mount, so nothing changes until then.
export function ThemeFavicon() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    const href = resolvedTheme === "light" ? "/favicon-light.svg" : "/favicon-dark.svg";
    const apply = () =>
      document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]').forEach((link) => {
        if (link.getAttribute("href") === href) return;
        link.type = "image/svg+xml";
        link.href = href;
      });

    apply();
    // Next re-inserts metadata <link> tags (hydration, navigation), so re-apply when head changes.
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true });
    return () => observer.disconnect();
  }, [resolvedTheme]);

  return null;
}
