"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import axios from "axios";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { DashboardBreadcrumbs } from "@/components/layout/breadcrumbs";
import { CommandPalette } from "@/components/layout/command-palette";
import { PageTransition } from "@/components/animations/page-transition";
import { SessionTimeoutModal } from "@/components/feedback/session-timeout-modal";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  clearAuthToken,
  useCurrentUser,
  useHasAuthToken,
} from "@/hooks/api/use-auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const isMobile = useIsMobile();
  const router = useRouter();
  const hasToken = useHasAuthToken();
  const { data: user, isLoading, isError, error, refetch } = useCurrentUser();

  useEffect(() => {
    if (!hasToken) {
      router.replace("/login");
    }
  }, [hasToken, router]);

  useEffect(() => {
    if (
      hasToken &&
      isError &&
      axios.isAxiosError(error) &&
      error.response?.status === 401
    ) {
      clearAuthToken();
      router.replace("/login");
    }
  }, [error, hasToken, isError, router]);

  if (hasToken && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2
          className="h-7 w-7 animate-spin text-primary"
          aria-label="Checking your session"
        />
      </div>
    );
  }

  if (!hasToken) {
    return null;
  }

  if (isError) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null;
    }
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted-foreground">
          We couldn&apos;t verify your session. Check your connection and try
          again.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-xl bg-primary px-5 py-2.5 font-medium text-primary-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area — offset by sidebar width */}
      <motion.div
        className={cn(
          "flex min-h-screen flex-col transition-[margin] duration-300 ease-out",
          !isMobile && "ml-[256px]",
        )}
      >
        {/* Topbar */}
        <Topbar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />

        {/* Page content */}
        <main className="flex-1 px-4 pt-6 pb-20 md:px-6 md:py-6 lg:px-8">
          <DashboardBreadcrumbs />
          <PageTransition>{children}</PageTransition>
        </main>
      </motion.div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Command Palette (global overlay) */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />

      {/* Session Inactivity Timeout Warning Modal */}
      <SessionTimeoutModal />
    </div>
  );
}
