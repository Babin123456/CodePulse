"use client";

import type { ElementType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Home, Swords, BarChart3, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MobileNavItem {
  title: string;
  href: string;
  icon: ElementType;
}

export const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  {
    title: "Home",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Battles",
    href: "/battles",
    icon: Swords,
  },
  {
    title: "Compare",
    href: "/compare",
    icon: BarChart3,
  },
  {
    title: "Leaderboard",
    href: "/leaderboard",
    icon: Trophy,
  },
  {
    title: "Profile",
    href: "/profile",
    icon: User,
  },
];

interface MobileNavProps {
  className?: string;
}

export function MobileNav({ className }: MobileNavProps) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  const isTabActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Mobile Navigation"
      className={cn(
        "fixed bottom-0 inset-x-0 z-40 md:hidden",
        "bg-[#070b14]/90 backdrop-blur-xl border-t border-white/5",
        "pb-[env(safe-area-inset-bottom,0px)]",
        className
      )}
    >
      <div className="grid h-16 grid-cols-5 items-center px-1">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = isTabActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              id={`mobile-nav-${item.title.toLowerCase()}`}
              data-testid={`mobile-nav-${item.title.toLowerCase()}`}
              aria-label={item.title}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex flex-col items-center justify-center py-1.5 transition-colors duration-200 select-none",
                isActive ? "text-sky-400" : "text-slate-400 hover:text-slate-200"
              )}
            >
              {/* Top active indicator line */}
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-active-indicator"
                  data-testid="mobile-nav-active-indicator"
                  className="absolute -top-[1px] h-[2px] w-8 rounded-full bg-gradient-to-r from-purple-500 via-sky-400 to-blue-500 shadow-[0_0_10px_rgba(56,189,248,0.7)]"
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 400, damping: 30 }
                  }
                />
              )}

              {/* Active tab background gradient glow */}
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-active-glow"
                  data-testid="mobile-nav-active-glow"
                  className="absolute inset-x-1 inset-y-1 rounded-xl bg-gradient-to-b from-sky-500/15 via-purple-500/10 to-transparent border border-sky-500/20 shadow-[0_0_15px_-3px_rgba(56,189,248,0.3)] pointer-events-none"
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 400, damping: 30 }
                  }
                />
              )}

              {/* Icon & Label */}
              <motion.div
                whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
                transition={{ duration: 0.1 }}
                className="relative z-10 flex flex-col items-center justify-center gap-0.5"
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isActive
                      ? "text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                      : "text-slate-400 group-hover:text-slate-200"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] tracking-tight transition-colors duration-200",
                    isActive
                      ? "font-semibold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-400"
                      : "font-medium text-slate-400 group-hover:text-slate-300"
                  )}
                >
                  {item.title}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
