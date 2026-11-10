"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { Trophy, Star, Activity, GitCommit, Brain, Share2, Download, Link as LinkIcon, AlertTriangle, TrendingUp, BookOpen, Code, Terminal, Crown, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { audioManager } from "@/lib/audio-manager";

interface DevData {
  username: string;
  name: string;
  avatar: string;
  score: number;
  stats: any;
  topLanguages: any[];
}

interface BattleReportProps {
  player1: DevData;
  player2: DevData;
  battleType: string;
  onRematch: () => void;
}

export function BattleReport({ player1, player2, battleType, onRematch }: BattleReportProps) {
  // Play victory celebration audio when battle report mounts
  useEffect(() => {
    try {
      audioManager.playVictoryFanfare();
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  }, []);

  // Score calculation for final report
  const calculateScore = (stats: any) => (stats.totalCommits * 1) + (stats.totalPRs * 5) + (stats.totalStars * 10) + (stats.followers * 2) + (stats.streak * 5);
  const p1Score = calculateScore(player1.stats);
  const p2Score = calculateScore(player2.stats);
  
  const p1Wins = p1Score >= p2Score;
  const winner = p1Wins ? player1 : player2;
  const loser = p1Wins ? player2 : player1;
  const winnerScore = Math.max(p1Score, p2Score);
  const loserScore = Math.min(p1Score, p2Score);
  const scoreDiff = winnerScore - loserScore;
  const winPercent = ((winnerScore / (winnerScore + loserScore)) * 100).toFixed(1);

  // Filter helpers
  const isOverall = battleType === "Overall Battle" || battleType === "AI Battle";
  const isRepo = battleType === "Repository Battle" || battleType === "Open Source Impact";
  const isActivity = battleType === "Activity Battle";
  const isLanguage = battleType === "Language Battle";

  // Dynamic Advantage & AI Analysis
  let biggestAdvantage = "Consistency";
  if (winner.stats.totalStars > loser.stats.totalStars && winner.stats.totalStars - loser.stats.totalStars > 100) {
    biggestAdvantage = "Open Source Impact";
  } else if (winner.stats.totalPRs > loser.stats.totalPRs && winner.stats.totalPRs - loser.stats.totalPRs > 20) {
    biggestAdvantage = "Collaboration";
  } else if (winner.stats.totalCommits > loser.stats.totalCommits) {
    biggestAdvantage = "Raw Output";
  }

  const aiAnalysis = `Developer ${winner.name} secured the victory primarily due to their superior ${biggestAdvantage.toLowerCase()}. While ${loser.name} put up a strong fight, ${winner.name}'s impressive metrics generated a solid ${scoreDiff} point advantage that was insurmountable.`;

  // Dynamic Tags
  const earnedTags = [];
  if (winner.stats.totalStars > 500) earnedTags.push("⭐ Open Source King");
  if (winner.stats.streak > 7) earnedTags.push("⚡ Consistency Champion");
  if (winner.stats.totalCommits > 1000) earnedTags.push("💻 Code Machine");
  if (earnedTags.length === 0) earnedTags.push("🚀 Rising Developer");

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-1000">
      
      {/* 4. Final Battle Result (Top Card) */}
      <div className="bg-card/50 backdrop-blur-xl border border-border rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-destructive" />
        
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4">
            <Trophy className="w-4 h-4" /> Battle Completed
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className={cn("flex flex-col items-center flex-1", !p1Wins && "opacity-50 grayscale")}>
            <div className="relative">
              <img src={player1.avatar} className="w-32 h-32 rounded-2xl border-4 border-border mb-4" />
              {p1Wins && <div className="absolute -top-4 -right-4 w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center border-4 border-background shadow-xl text-black"><Crown className="w-6 h-6" /></div>}
            </div>
            <h2 className="text-2xl font-bold">{player1.name}</h2>
            <div className="text-4xl font-black text-primary mt-2">{p1Score}</div>
          </div>

          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="text-5xl font-black italic text-muted-foreground/30">VS</div>
            <div className="mt-4 text-center">
              <div className="text-sm text-muted-foreground">Score Difference</div>
              <div className="text-xl font-bold text-foreground">+{scoreDiff} points</div>
            </div>
          </div>

          <div className={cn("flex flex-col items-center flex-1", p1Wins && "opacity-50 grayscale")}>
            <div className="relative">
              <img src={player2.avatar} className="w-32 h-32 rounded-2xl border-4 border-border mb-4" />
              {!p1Wins && <div className="absolute -top-4 -right-4 w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center border-4 border-background shadow-xl text-black"><Crown className="w-6 h-6" /></div>}
            </div>
            <h2 className="text-2xl font-bold">{player2.name}</h2>
            <div className="text-4xl font-black text-destructive mt-2">{p2Score}</div>
          </div>
        </div>
      </div>

      {/* 5. Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={Trophy} label="Winner" value={winner.name} color="text-amber-400" />
        <SummaryCard icon={TrendingUp} label="Biggest Advantage" value={biggestAdvantage} color="text-emerald-400" />
        <SummaryCard icon={Activity} label="Most Active" value={p1Score > p2Score ? player1.name : player2.name} color="text-blue-400" />
        <SummaryCard icon={Brain} label="AI Confidence" value={`${winPercent}%`} color="text-purple-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* 6. AI Battle Analysis */}
        <div className="md:col-span-2 bg-card/50 backdrop-blur-xl border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold">AI Battle Analysis</h3>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {aiAnalysis}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4">
             <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
               <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">Key Strength</div>
               <div className="font-medium text-emerald-100">{biggestAdvantage}</div>
             </div>
             <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
               <div className="text-xs font-semibold text-destructive uppercase tracking-wider mb-1">Critical Weakness</div>
               <div className="font-medium text-red-100">Community Engagement</div>
             </div>
          </div>
        </div>

        {/* 11. Achievement Tags */}
        <div className="bg-card/50 backdrop-blur-xl border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold">Earned Titles</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {earnedTags.map(tag => (
              <span key={tag} className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 7. Head-to-Head Comparison */}
      <div className="bg-card/50 backdrop-blur-xl border border-border rounded-2xl p-6 overflow-x-auto">
        <h3 className="text-lg font-bold mb-6">Head-to-Head Stats</h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-sm">
              <th className="pb-3 font-medium">Metric</th>
              <th className="pb-3 font-medium text-right">{player1.name}</th>
              <th className="pb-3 font-medium text-right">{player2.name}</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {(isOverall) && <CompareRow label="Followers" v1={player1.stats.followers} v2={player2.stats.followers} />}
            {(isOverall || isRepo) && <CompareRow label="Repositories" v1={player1.stats.repos} v2={player2.stats.repos} />}
            {(isOverall || isActivity || isLanguage) && <CompareRow label="Commits" v1={player1.stats.totalCommits} v2={player2.stats.totalCommits} />}
            {(isOverall || isActivity || isRepo) && <CompareRow label="Pull Requests" v1={player1.stats.totalPRs} v2={player2.stats.totalPRs} />}
            {(isOverall || isActivity || isRepo) && <CompareRow label="Issues" v1={player1.stats.totalIssues} v2={player2.stats.totalIssues} />}
            {(isOverall || isRepo) && <CompareRow label="Stars" v1={player1.stats.totalStars} v2={player2.stats.totalStars} />}
            {(isOverall || isActivity) && <CompareRow label="Streak" v1={player1.stats.streak} v2={player2.stats.streak} />}
            {(isOverall || isLanguage) && <CompareRow label="Unique Languages" v1={player1.topLanguages?.length || 0} v2={player2.topLanguages?.length || 0} />}
          </tbody>
        </table>
      </div>

      {/* 13. Share & Rematch */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
        <button className="px-6 py-3 rounded-xl bg-background border border-border hover:bg-accent font-medium flex items-center gap-2 transition-colors">
          <Share2 className="w-4 h-4" /> Share Card
        </button>
        <button className="px-6 py-3 rounded-xl bg-background border border-border hover:bg-accent font-medium flex items-center gap-2 transition-colors">
          <Download className="w-4 h-4" /> Download PNG
        </button>
        <button onClick={onRematch} className="px-8 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 font-bold transition-opacity">
          Rematch
        </button>
      </div>

    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
  return (
    <div className="bg-card/50 backdrop-blur-xl border border-border rounded-2xl p-4 flex flex-col items-center justify-center text-center">
      <Icon className={cn("w-6 h-6 mb-2", color)} />
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-lg font-bold mt-1 text-foreground">{value}</div>
    </div>
  );
}

function CompareRow({ label, v1, v2 }: { label: string, v1: number, v2: number }) {
  const p1Wins = v1 >= v2;
  const p2Wins = v2 >= v1;
  return (
    <tr className="border-b border-border/50 hover:bg-white/5 transition-colors">
      <td className="py-3 text-muted-foreground">{label}</td>
      <td className={cn("py-3 text-right font-medium", p1Wins ? "text-primary" : "text-muted-foreground")}>{v1}</td>
      <td className={cn("py-3 text-right font-medium", p2Wins ? "text-destructive" : "text-muted-foreground")}>{v2}</td>
    </tr>
  );
}
