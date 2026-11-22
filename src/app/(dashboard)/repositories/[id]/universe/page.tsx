"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Code2,
  GitBranch,
  Loader2,
  Orbit,
  RefreshCw,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/api/use-auth";
import type { UniverseData, UniverseNode } from "@/components/visualization/universe-types";
import type { DetailedRepository } from "../page";

const ThreeGitUniverse = dynamic(
  () =>
    import("@/components/visualization/three-git-universe").then(
      (module) => module.ThreeGitUniverse,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center gap-3 text-sm text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Initializing WebGL universe...
      </div>
    ),
  },
);

const QUALITY_OPTIONS = ["auto", "low", "medium", "high"] as const;
type QualityOption = (typeof QUALITY_OPTIONS)[number];

export default function RepositoryUniversePage() {
  const params = useParams();
  const router = useRouter();
  const repoName = decodeURIComponent(params.id as string);
  const { data: currentUser, isLoading } = useCurrentUser();
  const [quality, setQuality] = useState<QualityOption>("auto");
  const [selectedNode, setSelectedNode] = useState<UniverseNode | null>(null);

  const repo = useMemo<DetailedRepository | null>(() => {
    if (!currentUser) return null;
    const repositories =
      ((currentUser as unknown as { repositories?: DetailedRepository[] }).repositories) ?? [];
    return repositories.find((item) => item.name === repoName) ?? null;
  }, [currentUser, repoName]);

  const repoFullName = repo?.fullName?.includes("/") ? repo.fullName : null;
  const {
    data: universe,
    isLoading: isUniverseLoading,
    isError: isUniverseError,
    refetch,
  } = useQuery<UniverseData & { truncated: boolean; sampledCommits: number }>({
    queryKey: ["repository-universe", repoFullName],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/github/repository-universe?repo=${encodeURIComponent(repoFullName as string)}`,
        { signal },
      );
      const payload = (await response.json()) as UniverseData & {
        truncated: boolean;
        sampledCommits: number;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Could not load the knowledge universe.");
      return payload;
    },
    enabled: Boolean(repoFullName),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Code2 className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold text-white">Repository not found</h2>
        <p className="text-muted-foreground">
          We could not find a repository named &quot;{repoName}&quot;.
        </p>
        <button
          onClick={() => router.push("/repositories")}
          className="mt-4 rounded-xl bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary/90"
        >
          ← Back to Repositories
        </button>
      </div>
    );
  }

  if (isUniverseLoading || !universe) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        Mapping repository history and file relationships...
      </div>
    );
  }

  if (isUniverseError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Orbit className="h-16 w-16 text-rose-300" />
        <h2 className="text-2xl font-bold text-white">Universe unavailable</h2>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          We could not load GitHub tree and commit data for {repoFullName ?? repo.name}. Check that
          this is a public repository and try again.
        </p>
        <button
          onClick={() => void refetch()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.push(`/repositories/${encodeURIComponent(repo.name)}`)}
            className="mb-3 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to repository
          </button>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
            <Orbit className="h-8 w-8 text-violet-400" />
            Knowledge Universe
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            A 3D map of {repo.name}: directories are stars, files orbit by churn, and beams trace
            files that change together.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-1">
          {QUALITY_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => setQuality(option)}
              aria-pressed={quality === option}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                quality === option
                  ? "bg-violet-500/20 text-violet-200"
                  : "text-slate-400 hover:text-white",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Files in orbit", value: formatNumber(universe.files.length), icon: Code2 },
          { label: "Galactic clusters", value: formatNumber(universe.directories.length), icon: Sparkles },
          { label: "Co-change beams", value: formatNumber(universe.edges.length), icon: GitBranch },
          { label: "Contributors", value: formatNumber(repo.contributors), icon: Users },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass-card rounded-2xl border border-white/5 p-4"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              {stat.label}
              <stat.icon className="h-4 w-4 text-violet-300" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-card relative overflow-hidden rounded-[28px] border border-white/5 p-2 md:p-3">
        <div className="h-[58vh] min-h-[440px] w-full overflow-hidden rounded-2xl border border-white/5">
          <ThreeGitUniverse data={universe} quality={quality} onSelectNode={setSelectedNode} />
        </div>
        <div className="pointer-events-none absolute bottom-5 right-5 flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-950/80 p-3 text-[11px] text-slate-300 backdrop-blur">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-400" /> Directory star
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" /> File planet (size = churn)
          </span>
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-4 bg-sky-300" /> Co-change particle beam
          </span>
          <span className="flex items-center gap-2 text-[10px] text-cyan-300/80">
            <Sparkles className="h-3 w-3 text-cyan-400" /> Holographic 3D Constellation Active
          </span>
        </div>
      </div>

      <div className="glass-card rounded-[28px] border border-white/5 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-300" />
          <h2 className="text-sm font-semibold text-white">Celestial inspector</h2>
        </div>
        {selectedNode ? (
          <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="truncate font-mono text-sm text-violet-200">{selectedNode.path}</p>
              <p className="mt-2 text-xs text-slate-400">
                {selectedNode.kind === "directory" ? "Directory cluster" : "File planet"} · depth{" "}
                {selectedNode.depth} · intensity {selectedNode.glow.toFixed(2)}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                <p className="text-lg font-semibold text-white">{selectedNode.churn}</p>
                <p className="text-[11px] text-slate-400">Churn</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                <p className="text-lg font-semibold text-white">{selectedNode.file?.commits ?? "—"}</p>
                <p className="text-[11px] text-slate-400">Commits</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                <p className="text-lg font-semibold text-white">
                  {selectedNode.file?.contributors.length ?? "—"}
                </p>
                <p className="text-[11px] text-slate-400">Authors</p>
              </div>
            </div>
            {selectedNode.file && selectedNode.file.contributors.length > 0 && (
              <div className="md:col-span-2">
                <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Top contributors</p>
                <div className="flex flex-wrap gap-2">
                  {selectedNode.file.contributors.map((contributor) => (
                    <span
                      key={contributor.id}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
                    >
                      {contributor.name} · {contributor.commits}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Click any star or planet to inspect file metrics and contributors. Camera will fly to
            the selected body.
          </p>
        )}
      </div>
    </motion.div>
  );
}
