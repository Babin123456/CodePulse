"use client";

import { useEffect } from "react";
import { ErrorCard } from "@/components/feedback/error-card";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    // Log the error to console for developer debugging
    console.error("Dashboard Error Boundary caught an exception:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-4">
      <ErrorCard
        error={error}
        reset={reset}
        title="Dashboard Error"
        message="An unexpected error occurred while loading this dashboard view. Your session and data are secure. You can try refreshing the component or navigate back to the main overview."
        showDashboardLink={true}
      />
    </div>
  );
}
