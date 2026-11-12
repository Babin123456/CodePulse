"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

export function CopyCloneCommand({ fullName }: { fullName: string }) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(resetTimer.current);
    };
  }, []);

  async function copy(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(`git clone https://github.com/${fullName}.git`);
      if (!mounted.current) return;
      clearTimeout(resetTimer.current);
      setCopied(true);
      toast.success("Clone command copied to clipboard!");
      resetTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      if (mounted.current) toast.error("Could not copy the clone command.");
    }
  }

  return (
    <button
      type="button"
      aria-label="Copy git clone command"
      title="Copy git clone command"
      onClick={copy}
      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
    >
      {copied ? (
        <Check className="size-4 text-emerald-400" aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}
