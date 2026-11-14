"use client";

import { useState } from "react";
import { Download, Share2, Check, Sparkles, Swords, Trophy, Flame, GitCommit, GitPullRequest } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CompareShareCardProps {
  isOpen: boolean;
  onClose: () => void;
  dev1: any;
  dev2: any;
}

export function CompareShareCard({
  isOpen,
  onClose,
  dev1,
  dev2,
}: CompareShareCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!dev1 || !dev2) return null;

  const score1 = dev1.score || 0;
  const score2 = dev2.score || 0;
  const dev1Leading = score1 >= score2;

  const handleDownload = () => {
    setDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 1200, 630);
      grad.addColorStop(0, "#030712");
      grad.addColorStop(0.5, "#0b132b");
      grad.addColorStop(1, "#030712");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 630);

      // Card border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 3;
      ctx.strokeRect(40, 40, 1120, 550);

      // Header branding
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText("⚡ CODEPULSE DEV BATTLECARD", 80, 100);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "20px sans-serif";
      ctx.fillText("Official Head-to-Head Comparison", 80, 135);

      // VS Badge in Center
      ctx.fillStyle = "#e11d48";
      ctx.beginPath();
      ctx.arc(600, 315, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("VS", 600, 326);

      // Dev 1 Column
      ctx.textAlign = "left";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 38px sans-serif";
      ctx.fillText(dev1.name || dev1.username, 80, 240);

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText(`@${dev1.username} • Tier: ${dev1.globalRank?.title || "Master"}`, 80, 280);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "22px sans-serif";
      ctx.fillText(`Score: ${score1} pts`, 80, 340);
      ctx.fillText(`Commits: ${(dev1.stats?.totalCommits || 0).toLocaleString()}`, 80, 380);
      ctx.fillText(`PRs: ${dev1.stats?.totalPRs || 0}`, 80, 420);
      ctx.fillText(`Streak: ${dev1.stats?.streak || 0} days`, 80, 460);

      // Dev 2 Column
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 38px sans-serif";
      ctx.fillText(dev2.name || dev2.username, 1120, 240);

      ctx.fillStyle = "#a855f7";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText(`@${dev2.username} • Tier: ${dev2.globalRank?.title || "Master"}`, 1120, 280);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "22px sans-serif";
      ctx.fillText(`Score: ${score2} pts`, 1120, 340);
      ctx.fillText(`Commits: ${(dev2.stats?.totalCommits || 0).toLocaleString()}`, 1120, 380);
      ctx.fillText(`PRs: ${dev2.stats?.totalPRs || 0}`, 1120, 420);
      ctx.fillText(`Streak: ${dev2.stats?.streak || 0} days`, 1120, 460);

      // Footer
      ctx.textAlign = "center";
      ctx.fillStyle = "#64748b";
      ctx.font = "18px sans-serif";
      ctx.fillText("Compare developer velocity and impact live at codepulse.dev/compare", 600, 545);

      const link = document.createElement("a");
      link.download = `codepulse-compare-${dev1.username}-vs-${dev2.username}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/compare?u1=${dev1.username}&u2=${dev2.username}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-950 border-white/10 text-white p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Export Matchup Scorecard (1200x630)
          </DialogTitle>
        </DialogHeader>

        {/* Live Preview Card */}
        <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950 p-6 my-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-rose-500" />
              <span className="text-xs uppercase font-bold tracking-widest text-slate-300">
                CodePulse Head-to-Head
              </span>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              1200 × 630 OG Banner
            </span>
          </div>

          <div className="grid grid-cols-2 gap-6 relative">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <img
                  src={dev1.avatar}
                  alt={dev1.username}
                  className="w-10 h-10 rounded-full border border-cyan-400/30"
                />
                <div>
                  <h4 className="font-bold text-white text-base leading-tight truncate">
                    {dev1.name || dev1.username}
                  </h4>
                  <p className="text-xs text-cyan-400">@{dev1.username}</p>
                </div>
              </div>
              <div className="text-2xl font-black text-cyan-300">{score1} pts</div>
              <div className="text-xs text-slate-300 space-y-1">
                <div>Commits: {(dev1.stats?.totalCommits || 0).toLocaleString()}</div>
                <div>PRs: {dev1.stats?.totalPRs || 0}</div>
                <div>Streak: {dev1.stats?.streak || 0}d</div>
              </div>
            </div>

            <div className="space-y-3 text-right">
              <div className="flex items-center justify-end gap-2">
                <div>
                  <h4 className="font-bold text-white text-base leading-tight truncate">
                    {dev2.name || dev2.username}
                  </h4>
                  <p className="text-xs text-purple-400">@{dev2.username}</p>
                </div>
                <img
                  src={dev2.avatar}
                  alt={dev2.username}
                  className="w-10 h-10 rounded-full border border-purple-400/30"
                />
              </div>
              <div className="text-2xl font-black text-purple-300">{score2} pts</div>
              <div className="text-xs text-slate-300 space-y-1">
                <div>Commits: {(dev2.stats?.totalCommits || 0).toLocaleString()}</div>
                <div>PRs: {dev2.stats?.totalPRs || 0}</div>
                <div>Streak: {dev2.stats?.streak || 0}d</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleCopyLink}
            className="flex items-center gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            {copied ? "Link Copied!" : "Copy Match Link"}
          </Button>

          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? "Rendering..." : "Download PNG"}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
