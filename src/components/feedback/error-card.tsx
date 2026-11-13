"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ErrorCardProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  message?: string;
  showDashboardLink?: boolean;
  className?: string;
}

export function ErrorCard({
  error,
  reset,
  title = "Something went wrong",
  message = "An unexpected error occurred while loading this section. You can try again or return to the dashboard.",
  showDashboardLink = true,
  className,
}: ErrorCardProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="error-boundary-card"
      className={cn(
        "relative w-full max-w-lg rounded-[28px] border border-white/10 bg-[#070b14]/90 p-8 text-center backdrop-blur-2xl shadow-2xl sm:p-10 overflow-hidden",
        className
      )}
    >
      {/* Background radial gradient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-rose-500/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-amber-500/20 blur-3xl"
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Warning / Alert Icon with red/amber glow */}
        <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-rose-500/30 to-amber-500/30 blur-xl animate-pulse"
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-gradient-to-b from-rose-500/15 via-rose-500/5 to-amber-500/10 shadow-lg shadow-rose-500/20">
            <AlertTriangle
              data-testid="error-warning-icon"
              className="h-8 w-8 text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.6)]"
            />
          </div>
        </div>

        {/* Badge */}
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400 tracking-wide uppercase">
          Application Error
        </span>

        {/* Title */}
        <h2
          data-testid="error-title"
          className="mb-2 text-2xl font-bold tracking-tight text-white sm:text-3xl"
        >
          {title}
        </h2>

        {/* User-friendly message */}
        <p className="mb-6 max-w-md text-sm text-slate-400 leading-relaxed">
          {message}
        </p>

        {/* Digest identifier (if provided by Next.js server components) */}
        {error.digest && (
          <p
            data-testid="error-digest"
            className="mb-6 inline-block rounded-lg border border-white/5 bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-slate-400"
          >
            Digest: {error.digest}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex w-full flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            data-testid="error-try-again-button"
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-rose-600 to-amber-600 hover:from-rose-600 hover:via-rose-700 hover:to-amber-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </button>

          {showDashboardLink && (
            <Link
              href="/dashboard"
              data-testid="error-dashboard-link"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-6 py-3 text-sm font-semibold text-slate-200 hover:text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <LayoutDashboard className="h-4 w-4" />
              Back to Dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
