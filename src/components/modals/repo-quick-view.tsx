"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ExternalLink, Star, GitFork, Activity, Code, Eye, AlertCircle, Calendar, Scan } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { RepoSparkline } from "@/components/charts/repo-sparkline";
import { RepoCloneDropdown } from "@/components/repositories/repo-clone-dropdown";

interface RepoQuickViewProps {
  repo: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RepoQuickView({ repo, isOpen, onClose }: RepoQuickViewProps) {
  const router = useRouter();
  if (!repo) return null;

  const getRankBadge = (r: any) => {
    if (r.stars > 50) return { label: "Legendary", color: "from-amber-400 to-orange-500", shadow: "shadow-amber-500/50" };
    if (r.commits > 100 || r.forks > 10) return { label: "On Fire", color: "from-rose-500 to-pink-500", shadow: "shadow-rose-500/50" };
    if (r.commits > 50 && r.stars < 10) return { label: "Hidden Gem", color: "from-emerald-400 to-teal-500", shadow: "shadow-emerald-500/50" };
    return null;
  };

  const badge = getRankBadge(repo);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-[#0B0F19]/95 backdrop-blur-xl border border-white/10 text-white rounded-[32px] p-0 overflow-hidden shadow-2xl">
        {/* Top Gradient Banner */}
        <div 
          className="h-32 w-full relative"
          style={{
            background: `linear-gradient(135deg, ${repo.languageColor || '#3b82f6'}40 0%, transparent 100%)`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0B0F19]/95" />
          
          {badge && (
            <div className={`absolute top-6 right-6 px-3 py-1 rounded-full bg-gradient-to-r ${badge.color} text-white text-xs font-bold uppercase tracking-wider ${badge.shadow} shadow-[0_0_15px] z-10`}>
              {badge.label}
            </div>
          )}
        </div>

        <div className="px-8 pb-8 -mt-12 relative z-10">
          <DialogHeader>
            <div className="flex items-end gap-4 mb-4">
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center border-2 border-[#0B0F19] shadow-xl backdrop-blur-md"
                style={{ backgroundColor: `${repo.languageColor || '#3b82f6'}20` }}
              >
                <Code className="w-10 h-10" style={{ color: repo.languageColor || "#fff" }} />
              </div>
              <div className="flex-1 pb-1">
                <DialogTitle className="text-3xl font-black flex items-center gap-2">
                  {repo.name}
                </DialogTitle>
                <DialogDescription className="text-slate-400 flex items-center gap-2 mt-1">
                  <Calendar className="w-3.5 h-3.5" /> Created {new Date(repo.createdAt || repo.repoCreatedAt).toLocaleDateString()}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <p className="text-slate-300 text-lg leading-relaxed mt-2 mb-6">
            {repo.description || "No description provided for this repository."}
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="glass-card rounded-2xl p-4 border border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-2 text-amber-400 mb-2">
                <Star className="w-4 h-4 fill-amber-400" />
                <span className="text-xs font-semibold uppercase tracking-wider">Stars</span>
              </div>
              <div className="text-2xl font-black">{formatNumber(repo.stars)}</div>
            </div>
            
            <div className="glass-card rounded-2xl p-4 border border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-2 text-slate-300 mb-2">
                <GitFork className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Forks</span>
              </div>
              <div className="text-2xl font-black">{formatNumber(repo.forks)}</div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Commits</span>
              </div>
              <div className="text-2xl font-black">{formatNumber(repo.commits)}</div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-2 text-rose-400 mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Issues</span>
              </div>
              <div className="text-2xl font-black">{formatNumber(repo.issues)}</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-black/20 rounded-2xl p-6 border border-white/5">
            <div>
              <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Activity Pulse</h4>
              <RepoSparkline id={repo.name} color={repo.languageColor || '#a855f7'} />
            </div>
            
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full sm:w-auto items-stretch sm:items-center">
              <RepoCloneDropdown
                fullName={
                  repo.fullName ||
                  (repo.url ? repo.url.replace("https://github.com/", "") : "") ||
                  repo.name
                }
                variant="secondary"
                buttonClassName="w-full sm:w-auto justify-center py-3 rounded-xl"
              />
              <button
                onClick={() => { onClose(); router.push(`/repositories/${encodeURIComponent(repo.name)}`); }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold hover:from-violet-500 hover:to-blue-500 transition-all w-full sm:w-auto justify-center shadow-lg shadow-violet-500/20"
              >
                <Scan className="w-4 h-4" /> Deep Analysis
              </button>
              <a 
                href={repo.url || (repo.name ? `https://github.com/${repo.name}` : '#')}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${repo.name} on GitHub in a new tab`}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-bold hover:bg-slate-200 transition-colors w-full sm:w-auto justify-center focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                Open in GitHub <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
