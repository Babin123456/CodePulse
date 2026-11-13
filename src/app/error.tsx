"use client";

import { useEffect } from "react";
import { ErrorCard } from "@/components/feedback/error-card";

interface RootErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: RootErrorProps) {
  useEffect(() => {
    // Log the error to console for developer debugging
    console.error("Root Error Boundary caught an exception:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#020617] p-4 text-slate-100">
      <ErrorCard
        error={error}
        reset={reset}
        title="Something Went Wrong"
        message="An unexpected system error occurred while rendering the page. You can attempt to reload the component or return to the dashboard."
        showDashboardLink={true}
      />
    </div>
  );
}
