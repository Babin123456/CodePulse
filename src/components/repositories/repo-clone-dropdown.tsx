"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Code2,
  ChevronDown,
  Copy,
  Check,
  ExternalLink,
  Laptop,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface RepoCloneDropdownProps {
  fullName: string;
  className?: string;
  buttonClassName?: string;
  variant?: "primary" | "secondary";
}

type CloneProtocol = "https" | "ssh" | "cli";

export function RepoCloneDropdown({
  fullName,
  className,
  buttonClassName,
  variant = "primary",
}: RepoCloneDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeProtocol, setActiveProtocol] = useState<CloneProtocol>("https");
  const [copiedProtocol, setCopiedProtocol] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Clean full name (strip leading/trailing slashes, .git suffix if provided)
  const cleanFullName = fullName.replace(/\.git$/, "").replace(/^\//, "");

  const httpsUrl = `https://github.com/${cleanFullName}.git`;
  const sshUrl = `git@github.com:${cleanFullName}.git`;
  const cliCommand = `gh repo clone ${cleanFullName}`;
  const vscodeUrl = `vscode://vscode.git/clone?url=https://github.com/${cleanFullName}.git`;

  const protocolDetails: Record<
    CloneProtocol,
    { label: string; value: string; copyNotice: string }
  > = {
    https: {
      label: "HTTPS",
      value: httpsUrl,
      copyNotice: "HTTPS clone URL copied to clipboard!",
    },
    ssh: {
      label: "SSH",
      value: sshUrl,
      copyNotice: "SSH clone URL copied to clipboard!",
    },
    cli: {
      label: "GitHub CLI",
      value: cliCommand,
      copyNotice: "GitHub CLI command copied to clipboard!",
    },
  };

  const handleCopy = useCallback(
    async (text: string, protocolKey: string, notice: string) => {
      try {
        await navigator.clipboard.writeText(text);
        clearTimeout(copyTimeoutRef.current);
        setCopiedProtocol(protocolKey);
        toast.success(notice);
        copyTimeoutRef.current = setTimeout(() => {
          setCopiedProtocol(null);
        }, 2000);
      } catch {
        toast.error("Failed to copy to clipboard.");
      }
    },
    []
  );

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(copyTimeoutRef.current);
    };
  }, [isOpen]);

  const activeDetails = protocolDetails[activeProtocol];

  return (
    <div ref={dropdownRef} className={cn("relative inline-block", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Code or Clone repository"
        className={cn(
          "flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold transition-all shadow-lg shrink-0 cursor-pointer select-none",
          variant === "primary"
            ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-purple-600/25"
            : "bg-white/10 hover:bg-white/15 text-white border border-white/10 shadow-black/20",
          buttonClassName
        )}
      >
        <Code2 className="w-4 h-4 text-white" />
        <span>Code / Clone</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-white/80 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className={cn(
              "absolute right-0 top-full mt-2.5 z-50",
              "w-[calc(100vw-2rem)] sm:w-[390px] max-w-[390px]",
              "rounded-2xl border border-white/10 bg-[#0B0F19]/95 backdrop-blur-2xl p-4 text-white shadow-2xl shadow-black/60",
              "ring-1 ring-white/5"
            )}
          >
            {/* Header / Protocol Tabs */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Clone Repository
              </span>
              <div className="flex bg-white/[0.05] p-1 rounded-xl border border-white/5 gap-1">
                {(["https", "ssh", "cli"] as CloneProtocol[]).map((protocol) => (
                  <button
                    key={protocol}
                    type="button"
                    onClick={() => setActiveProtocol(protocol)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer",
                      activeProtocol === protocol
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {protocolDetails[protocol].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Protocol Snippet & Copy Action */}
            <div className="mt-3.5 space-y-2">
              <label className="text-xs text-slate-400 block font-medium">
                {activeDetails.label} Clone URL
              </label>
              <div className="flex items-center gap-2 rounded-xl bg-black/50 border border-white/10 p-1.5 pl-3">
                <input
                  type="text"
                  readOnly
                  value={activeDetails.value}
                  className="flex-1 bg-transparent text-xs text-slate-200 font-mono outline-none truncate selection:bg-purple-500/30"
                  aria-label={`${activeDetails.label} clone command`}
                />
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      activeDetails.value,
                      activeProtocol,
                      activeDetails.copyNotice
                    )
                  }
                  aria-label={`Copy ${activeDetails.label} command`}
                  title={`Copy ${activeDetails.label} command`}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer shrink-0",
                    copiedProtocol === activeProtocol
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
                  )}
                >
                  {copiedProtocol === activeProtocol ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Quick Copy List for All Protocols */}
            <div className="mt-3.5 pt-3 border-t border-white/[0.08] space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                All Protocols (1-Click Copy)
              </span>

              {/* HTTPS row */}
              <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-slate-300 w-12 shrink-0">
                    HTTPS:
                  </span>
                  <span className="font-mono text-slate-400 truncate text-[11px]">
                    {httpsUrl}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(httpsUrl, "https-row", protocolDetails.https.copyNotice)
                  }
                  className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
                  aria-label="Copy HTTPS URL"
                  title="Copy HTTPS URL"
                >
                  {copiedProtocol === "https-row" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {/* SSH row */}
              <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-slate-300 w-12 shrink-0">
                    SSH:
                  </span>
                  <span className="font-mono text-slate-400 truncate text-[11px]">
                    {sshUrl}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(sshUrl, "ssh-row", protocolDetails.ssh.copyNotice)
                  }
                  className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
                  aria-label="Copy SSH URL"
                  title="Copy SSH URL"
                >
                  {copiedProtocol === "ssh-row" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {/* GitHub CLI row */}
              <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-slate-300 w-12 shrink-0">
                    CLI:
                  </span>
                  <span className="font-mono text-slate-400 truncate text-[11px]">
                    {cliCommand}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      cliCommand,
                      "cli-row",
                      protocolDetails.cli.copyNotice
                    )
                  }
                  className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
                  aria-label="Copy GitHub CLI command"
                  title="Copy GitHub CLI command"
                >
                  {copiedProtocol === "cli-row" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Open in VS Code Action Row */}
            <div className="mt-3 pt-3 border-t border-white/[0.08]">
              <a
                href={vscodeUrl}
                onClick={() => {
                  toast.success("Opening repository in VS Code...");
                  setIsOpen(false);
                }}
                className="flex items-center justify-between w-full p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 hover:text-blue-300 transition-all group cursor-pointer"
                aria-label="Open in Visual Studio Code"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white group-hover:text-blue-200 flex items-center gap-1.5">
                      Open in VS Code
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Clone and launch directly in your editor
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
