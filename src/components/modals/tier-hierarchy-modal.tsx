"use client";

import { motion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TIER_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Crown,
  Trophy,
  Shield,
  Medal,
  Gem,
  Sparkles,
  Zap,
  CheckCircle2,
  TrendingUp,
  Info,
} from "lucide-react";
import type { DeveloperRating } from "@/types";

// ===========================
// Types & Constants
// ===========================

export type TierName = DeveloperRating["tier"];

export interface TierRoadmapItem {
  name: TierName;
  minScore: number;
  maxScore: number | null;
  scoreRange: string;
  badgeLabel: string;
  description: string;
  perks: string[];
}

export const TIER_ROADMAP: TierRoadmapItem[] = [
  {
    name: "Bronze",
    minScore: 0,
    maxScore: 500,
    scoreRange: "0 - 500",
    badgeLabel: "Tier I",
    description: "Initiate developer building core coding habits and foundational commits.",
    perks: ["Public developer profile", "Basic analytics tracking", "Community leaderboard access"],
  },
  {
    name: "Silver",
    minScore: 500,
    maxScore: 1000,
    scoreRange: "500 - 1000",
    badgeLabel: "Tier II",
    description: "Active contributor with recurring pull requests and multi-repository activity.",
    perks: ["Unlock DevBattle challenges", "Weekly stats digest", "Custom repository badges"],
  },
  {
    name: "Gold",
    minScore: 1000,
    maxScore: 2000,
    scoreRange: "1000 - 2000",
    badgeLabel: "Tier III",
    description: "Proficient engineer driving code quality, reviews, and high-velocity shipping.",
    perks: ["Gold profile ring & badge", "Analytics export reports", "Priority battle matchmaking"],
  },
  {
    name: "Platinum",
    minScore: 2000,
    maxScore: 3500,
    scoreRange: "2000 - 3500",
    badgeLabel: "Tier IV",
    description: "Senior developer recognized for architectural impact and sustained streaks.",
    perks: ["Cyan tier aura flair", "Developer comparison tool", "Exclusive achievement tracks"],
  },
  {
    name: "Diamond",
    minScore: 3500,
    maxScore: 5000,
    scoreRange: "3500 - 5000",
    badgeLabel: "Tier V",
    description: "Elite engineer mastering complex algorithms, performance, and mentorship.",
    perks: ["Diamond sparkler flair", "Global top 5% visibility", "Beta feature preview access"],
  },
  {
    name: "Master",
    minScore: 5000,
    maxScore: 7500,
    scoreRange: "5000 - 7500",
    badgeLabel: "Tier VI",
    description: "Principal innovator shaping open-source ecosystems and commanding top ranks.",
    perks: ["Purple master glow", "Global top 1% spotlight", "Verified master developer badge"],
  },
  {
    name: "Grandmaster",
    minScore: 7500,
    maxScore: null,
    scoreRange: "7500+",
    badgeLabel: "Tier VII",
    description: "Legendary pioneer in software engineering with unmatched contributions worldwide.",
    perks: ["Animated gradient aura", "Hall of Fame permanent honors", "Custom prestige title"],
  },
];

const TIER_ICONS: Record<TierName, typeof Crown> = {
  Bronze: Shield,
  Silver: Medal,
  Gold: Trophy,
  Platinum: Zap,
  Diamond: Gem,
  Master: Sparkles,
  Grandmaster: Crown,
};

export interface TierHierarchyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: DeveloperRating["tier"] | string;
  currentScore?: number;
}

// ===========================
// Component
// ===========================

export function TierHierarchyModal({
  isOpen,
  onClose,
  currentTier,
  currentScore,
}: TierHierarchyModalProps) {
  const currentIndex = TIER_ROADMAP.findIndex(
    (item) => item.name.toLowerCase() === currentTier?.toLowerCase()
  );
  const currentTierItem = currentIndex !== -1 ? TIER_ROADMAP[currentIndex] : null;
  const nextTierItem =
    currentIndex !== -1 && currentIndex < TIER_ROADMAP.length - 1
      ? TIER_ROADMAP[currentIndex + 1]
      : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[90vh] flex flex-col bg-[#0B0F19]/95 backdrop-blur-2xl border border-white/10 rounded-[28px] p-0 text-white shadow-2xl overflow-hidden">
        {/* Header Section */}
        <div className="relative p-6 sm:p-7 border-b border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 shadow-lg shadow-purple-500/25">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-1">
              <DialogHeader className="p-0 text-left">
                <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Developer Rank & Tier Hierarchy
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-400">
                  Developer tiers are determined by cumulative score, code velocity, review impact, and contribution consistency.
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          {/* Current Tier Status Banner */}
          {currentTierItem && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r shadow-md",
                    TIER_COLORS[currentTierItem.name]?.bg ?? "from-purple-500 to-blue-500",
                    TIER_COLORS[currentTierItem.name]?.glow
                  )}
                >
                  {(() => {
                    const Icon = TIER_ICONS[currentTierItem.name] ?? Crown;
                    return <Icon className="h-4 w-4 text-white" />;
                  })()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                      Your Current Tier:
                    </span>
                    <span className="text-sm font-bold text-white">
                      {currentTierItem.name}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      ({currentTierItem.scoreRange} pts)
                    </span>
                  </div>
                  {currentScore !== undefined && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Current Rating Score:{" "}
                      <span className="font-semibold text-slate-200">
                        {currentScore.toLocaleString()}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {nextTierItem ? (
                <div className="flex items-center gap-2 text-xs sm:text-right">
                  <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-slate-400">Next milestone: </span>
                    <span className="font-semibold text-emerald-300">
                      {nextTierItem.name}
                    </span>
                    <span className="text-slate-400"> ({nextTierItem.minScore} pts)</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium">
                  <Sparkles className="h-4 w-4" />
                  <span>Maximum Tier Achieved!</span>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Roadmap Tier List (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-7 space-y-3.5 max-h-[50vh] sm:max-h-[55vh]">
          {TIER_ROADMAP.map((item, index) => {
            const isCurrent = item.name.toLowerCase() === currentTier?.toLowerCase();
            const tierStyle = TIER_COLORS[item.name] ?? TIER_COLORS["Bronze"];
            const TierIcon = TIER_ICONS[item.name] ?? Crown;

            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "relative rounded-2xl p-4 sm:p-5 transition-all duration-200 border",
                  isCurrent
                    ? cn(
                        "bg-white/[0.07] border-purple-500/60 ring-2 ring-purple-500/50 shadow-lg",
                        tierStyle.glow
                      )
                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10"
                )}
              >
                {/* Active Tier Pill */}
                {isCurrent && (
                  <div className="absolute -top-3 right-4 sm:right-6">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-md shadow-purple-500/40">
                      <CheckCircle2 className="h-3 w-3" />
                      Current Tier
                    </span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Badge + Title + Score */}
                  <div className="flex items-center gap-3.5">
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r shadow-md",
                        tierStyle.bg,
                        tierStyle.glow
                      )}
                    >
                      <TierIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4
                          className={cn(
                            "text-base font-bold",
                            tierStyle.text.includes("bg-clip-text")
                              ? tierStyle.text
                              : "text-white"
                          )}
                        >
                          {item.name}
                        </h4>
                        <span className="text-[11px] font-semibold text-slate-400 bg-white/[0.06] px-2 py-0.5 rounded-full border border-white/[0.05]">
                          {item.badgeLabel}
                        </span>
                      </div>
                      <p className="text-xs font-mono font-medium text-purple-300/90 mt-0.5">
                        Score Threshold:{" "}
                        <span className="font-semibold text-white">
                          {item.scoreRange}
                        </span>{" "}
                        pts
                      </p>
                    </div>
                  </div>

                  {/* Right: Score Range Pill */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-bold tracking-wide",
                        isCurrent
                          ? "bg-purple-500 text-white shadow-sm"
                          : "bg-white/[0.05] text-slate-300 border border-white/[0.08]"
                      )}
                    >
                      {item.scoreRange}
                    </span>
                  </div>
                </div>

                {/* Description & Perks */}
                <div className="mt-3 pt-3 border-t border-white/[0.04] space-y-2">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.perks.map((perk) => (
                      <span
                        key={perk}
                        className="text-[10px] text-slate-400 bg-white/[0.03] border border-white/[0.05] rounded-md px-2 py-0.5"
                      >
                        • {perk}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer Info & Action */}
        <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-black/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info className="h-4 w-4 text-purple-400 shrink-0" />
            <span>Increase your score through commits, battle wins, and PR reviews.</span>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="w-full sm:w-auto font-medium"
          >
            Close Roadmap
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

