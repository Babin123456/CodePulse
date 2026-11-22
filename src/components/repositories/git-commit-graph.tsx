"use client";

import React, { useState } from "react";
import {
  GitCommit,
  GitBranch,
  ShieldCheck,
  ShieldAlert,
  User,
  Clock,
  ExternalLink,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export interface CommitNode {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  branch: string;
  verified: boolean;
  signatureType?: "GPG" | "SSH" | "S/MIME";
  parents: string[];
}

export interface GitCommitGraphProps {
  repoId?: string;
  initialCommits?: CommitNode[];
}

export function GitCommitGraph({
  repoId = "CodePulse",
  initialCommits = [
    {
      hash: "a1b2c3d4e5f67890123456789abcdef012345678",
      shortHash: "a1b2c3d",
      message: "feat(ops): distributed dynamic configuration hot-reload engine (#829)",
      author: "Babin123456",
      date: "2026-11-21 18:48",
      branch: "main",
      verified: true,
      signatureType: "GPG",
      parents: ["e5f6789"],
    },
    {
      hash: "e5f67890123456789abcdef0123456789abcdef0",
      shortHash: "e5f6789",
      message: "feat(ops): automated chaos engineering & fault injection runner (#828)",
      author: "Babin123456",
      date: "2026-11-21 18:35",
      branch: "main",
      verified: true,
      signatureType: "SSH",
      parents: ["f7a8b9c"],
    },
    {
      hash: "f7a8b9c0123456789abcdef0123456789abcdef1",
      shortHash: "f7a8b9c",
      message: "feat(ops): automated priority load shedding controller (#827)",
      author: "Babin123456",
      date: "2026-11-21 18:20",
      branch: "main",
      verified: true,
      signatureType: "GPG",
      parents: ["b8c9d0e"],
    },
    {
      hash: "b8c9d0e123456789abcdef0123456789abcdef2",
      shortHash: "b8c9d0e",
      message: "chore: update dependency declarations and ci matrices",
      author: "code-with-abhi-i5",
      date: "2026-11-21 15:10",
      branch: "dev",
      verified: false,
      parents: [],
    },
  ],
}: GitCommitGraphProps) {
  const [commits, setCommits] = useState<CommitNode[]>(initialCommits);
  const [search, setSearch] = useState<string>("");
  const [selectedCommit, setSelectedCommit] = useState<CommitNode | null>(commits[0]);

  const filteredCommits = commits.filter(
    (c) =>
      c.message.toLowerCase().includes(search.toLowerCase()) ||
      c.author.toLowerCase().includes(search.toLowerCase()) ||
      c.shortHash.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col border border-border rounded-xl bg-card overflow-hidden shadow-xl w-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-muted/40 border-b border-border gap-3">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-base text-foreground">Interactive Git Commit Graph</h2>
          <Badge variant="outline" className="text-xs font-mono">
            {repoId}
          </Badge>
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Filter commits by SHA, author, or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* Main Commit Tree View */}
      <div className="flex flex-col lg:flex-row min-h-[420px]">
        {/* Tree List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {filteredCommits.map((commit, idx) => {
            const isSelected = selectedCommit?.hash === commit.hash;
            return (
              <div
                key={commit.hash}
                onClick={() => setSelectedCommit(commit)}
                className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                  isSelected ? "bg-primary/10 border-l-4 border-l-primary" : "hover:bg-muted/30"
                }`}
              >
                {/* Branch Graph Node Visualization */}
                <div className="flex flex-col items-center justify-center w-6 shrink-0 relative">
                  {idx > 0 && <div className="w-0.5 h-4 bg-border absolute -top-4" />}
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 ${
                      commit.branch === "main"
                        ? "border-primary bg-primary/20"
                        : "border-purple-500 bg-purple-500/20"
                    }`}
                  />
                  {idx < filteredCommits.length - 1 && (
                    <div className="w-0.5 h-4 bg-border absolute -bottom-4" />
                  )}
                </div>

                {/* Commit Summary */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">
                      {commit.shortHash}
                    </span>
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-mono">
                      {commit.branch}
                    </Badge>
                    {commit.verified ? (
                      <Badge className="text-[10px] py-0 px-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Verified ({commit.signatureType})
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Unverified</span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-foreground truncate mt-1">
                    {commit.message}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {commit.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {commit.date}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Commit Detail Inspector */}
        {selectedCommit && (
          <div className="w-full lg:w-80 p-4 border-t lg:border-t-0 lg:border-l border-border bg-card/60 flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-primary" />
                Commit Inspector
              </h3>

              <div className="p-3 bg-muted/40 rounded-lg space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px]">FULL SHA-256 HASH</span>
                  <span className="font-mono text-[11px] break-all select-all font-semibold text-foreground">
                    {selectedCommit.hash}
                  </span>
                </div>

                <div className="pt-2 border-t border-border">
                  <span className="text-muted-foreground block text-[10px]">CRYPTOGRAPHIC VERIFICATION</span>
                  {selectedCommit.verified ? (
                    <div className="flex items-center gap-1 text-emerald-400 font-medium mt-1">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Valid {selectedCommit.signatureType} Signature</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-amber-500 font-medium mt-1">
                      <ShieldAlert className="w-4 h-4" />
                      <span>No signature attached</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(selectedCommit.hash);
                toast.success("Copied commit hash!");
              }}
              className="w-full mt-4 text-xs"
            >
              Copy Full SHA
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
