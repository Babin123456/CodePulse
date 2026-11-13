"use client";

import { useEffect } from "react";
import { ErrorCard } from "@/components/feedback/error-card";
import "./globals.css";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log the error to console for developer debugging
    console.error("Global Error Boundary caught an exception:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body
        className="flex min-h-screen w-full items-center justify-center bg-[#020617] p-4 font-sans text-slate-100 antialiased"
        style={{ backgroundColor: "#020617", color: "#f8fafc" }}
      >
        <ErrorCard
          error={error}
          reset={reset}
          title="Critical Application Error"
          message="A critical error prevented the application layout from rendering. Please click Try Again or return to the dashboard."
          showDashboardLink={true}
        />
      </body>
    </html>
  );
}
