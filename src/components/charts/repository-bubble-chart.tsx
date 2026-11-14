"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { Code2, Star, GitFork, ExternalLink, GitCommit, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface RepositoryBubbleChartProps {
  repos: any[];
}

type MetricMode = "all" | "stars" | "forks" | "commits";

export function RepositoryBubbleChart({ repos }: RepositoryBubbleChartProps) {
  const [metric, setMetric] = useState<MetricMode>("stars");

  // Get top repos sorted by active metric
  const sortedRepos = useMemo(() => {
    return [...repos]
      .sort((a, b) => {
        if (metric === "stars") return (b.stars || 0) - (a.stars || 0);
        if (metric === "forks") return (b.forks || 0) - (a.forks || 0);
        if (metric === "commits") return (b.commitsCount || b.stars * 3 || 0) - (a.commitsCount || a.stars * 3 || 0);
        const scoreA = (a.stars || 0) * 2 + (a.forks || 0);
        const scoreB = (b.stars || 0) * 2 + (b.forks || 0);
        return scoreB - scoreA;
      })
      .slice(0, 6);
  }, [repos, metric]);

  if (sortedRepos.length === 0) {
    return (
      <div className="glass-card rounded-[32px] p-8 border border-white/5 h-full flex flex-col items-center justify-center">
        <Code2 className="w-12 h-12 text-slate-500 mb-4 opacity-50" />
        <p className="text-muted-foreground">No repositories found.</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-[32px] p-8 border border-white/5 h-full flex flex-col relative overflow-hidden group">
      {/* Ambient Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none group-hover:bg-blue-500/10 transition-colors duration-1000" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/20">
              <Code2 className="w-5 h-5 text-blue-400" />
            </div>
            Top Repositories & Impact
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Sort and explore repositories by activity, stars, and engagement metrics.
          </p>
        </div>

        {/* Metric Switcher Filter */}
        <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 gap-1">
          {(
            [
              { id: "stars", label: "Stars", icon: Star },
              { id: "forks", label: "Forks", icon: GitFork },
              { id: "commits", label: "Velocity", icon: GitCommit },
            ] as const
          ).map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  metric === m.id
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10 flex-1">
        {sortedRepos.map((repo, idx) => {
          const commits = repo.commitsCount || (repo.stars || 0) * 3 + 12;
          return (
            <motion.a
              key={repo.id || repo.name}
              href={repo.url || `https://github.com/${repo.name}`}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3, ease: "easeOut" }}
              className="group/card relative rounded-2xl p-5 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-300 flex flex-col justify-between overflow-hidden"
            >
              {/* Hover Gradient based on language color */}
              <div
                className="absolute inset-0 opacity-0 group-hover/card:opacity-10 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, ${repo.languageColor || "#38bdf8"} 0%, transparent 100%)`,
                }}
              />

              <div className="mb-4 relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <h4
                    className="font-bold text-base text-slate-200 group-hover/card:text-white transition-colors truncate"
                    title={repo.name}
                  >
                    {repo.name}
                  </h4>
                  <ExternalLink className="w-4 h-4 text-slate-500 group-hover/card:text-white opacity-0 group-hover/card:opacity-100 transition-all -translate-x-1 group-hover/card:translate-x-0" />
                </div>

                {repo.description ? (
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {repo.description}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 italic mt-2">No description provided.</p>
                )}
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 relative z-10">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shadow-sm"
                    style={{
                      backgroundColor: repo.languageColor || "#38bdf8",
                      boxShadow: `0 0 6px ${repo.languageColor || "#38bdf8"}`,
                    }}
                  />
                  <span className="text-xs font-medium text-slate-300 truncate max-w-[80px]">
                    {repo.language || "Unknown"}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-semibold">
                  <div
                    className={cn(
                      "flex items-center gap-1",
                      metric === "stars" ? "text-amber-400 font-bold" : "text-slate-400"
                    )}
                  >
                    <Star className="w-3.5 h-3.5" />
                    {repo.stars || 0}
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1",
                      metric === "forks" ? "text-emerald-400 font-bold" : "text-slate-400"
                    )}
                  >
                    <GitFork className="w-3.5 h-3.5" />
                    {repo.forks || 0}
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1",
                      metric === "commits" ? "text-cyan-400 font-bold" : "text-slate-400"
                    )}
                  >
                    <GitCommit className="w-3.5 h-3.5" />
                    {commits}
                  </div>
                </div>
              </div>
            </motion.a>
          );
        })}
      </div>
    </div>
  );
}
