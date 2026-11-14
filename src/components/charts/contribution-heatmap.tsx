"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import type { ContributionDay } from "@/types";
import { ChevronDown, Flame, Calendar } from "lucide-react";
import { motion } from "motion/react";

interface ContributionHeatmapProps {
  className?: string;
  data?: ContributionDay[];
}

type LevelColors = Record<0 | 1 | 2 | 3 | 4, string>;

interface HeatmapPalette {
  label: string;
  levels: LevelColors;
  ambience: string;
  iconWrap: string;
  icon: string;
  tooltipText: string;
  hoverRing: string;
}

const PALETTES = {
  cyberpunk: {
    label: "Cyberpunk",
    levels: {
      0: "bg-white/5 border-white/5",
      1: "bg-purple-900/40 border-purple-800/50",
      2: "bg-purple-700/60 border-purple-600/50 shadow-[0_0_8px_rgba(126,34,206,0.3)]",
      3: "bg-fuchsia-500/80 border-fuchsia-400/50 shadow-[0_0_12px_rgba(217,70,239,0.5)]",
      4: "bg-pink-400 border-pink-300 shadow-[0_0_16px_rgba(244,114,182,0.8)]",
    },
    ambience: "bg-fuchsia-500/10 group-hover:bg-fuchsia-500/20",
    iconWrap: "bg-fuchsia-500/20 border-fuchsia-500/20",
    icon: "text-fuchsia-400",
    tooltipText: "text-fuchsia-400",
    hoverRing: "ring-fuchsia-500/50",
  },
  github: {
    label: "GitHub Classic",
    levels: {
      0: "bg-white/5 border-white/5",
      1: "bg-emerald-900/40 border-emerald-800/50",
      2: "bg-emerald-700/60 border-emerald-600/50 shadow-[0_0_8px_rgba(4,120,87,0.3)]",
      3: "bg-green-500/80 border-green-400/50 shadow-[0_0_12px_rgba(34,197,94,0.5)]",
      4: "bg-green-400 border-green-300 shadow-[0_0_16px_rgba(74,222,128,0.8)]",
    },
    ambience: "bg-emerald-500/10 group-hover:bg-emerald-500/20",
    iconWrap: "bg-emerald-500/20 border-emerald-500/20",
    icon: "text-emerald-400",
    tooltipText: "text-emerald-400",
    hoverRing: "ring-emerald-500/50",
  },
  solar: {
    label: "Solar Ember",
    levels: {
      0: "bg-white/5 border-white/5",
      1: "bg-amber-900/40 border-amber-800/50",
      2: "bg-amber-700/60 border-amber-600/50 shadow-[0_0_8px_rgba(180,83,9,0.3)]",
      3: "bg-orange-500/80 border-orange-400/50 shadow-[0_0_12px_rgba(249,115,22,0.5)]",
      4: "bg-red-400 border-red-300 shadow-[0_0_16px_rgba(248,113,113,0.8)]",
    },
    ambience: "bg-orange-500/10 group-hover:bg-orange-500/20",
    iconWrap: "bg-orange-500/20 border-orange-500/20",
    icon: "text-orange-400",
    tooltipText: "text-orange-400",
    hoverRing: "ring-orange-500/50",
  },
  ice: {
    label: "Neon Ice",
    levels: {
      0: "bg-white/5 border-white/5",
      1: "bg-cyan-900/40 border-cyan-800/50",
      2: "bg-sky-700/60 border-sky-600/50 shadow-[0_0_8px_rgba(3,105,161,0.3)]",
      3: "bg-sky-400/80 border-sky-300/50 shadow-[0_0_12px_rgba(56,189,248,0.5)]",
      4: "bg-indigo-300 border-indigo-200 shadow-[0_0_16px_rgba(165,180,252,0.8)]",
    },
    ambience: "bg-cyan-500/10 group-hover:bg-cyan-500/20",
    iconWrap: "bg-cyan-500/20 border-cyan-500/20",
    icon: "text-cyan-400",
    tooltipText: "text-cyan-400",
    hoverRing: "ring-cyan-500/50",
  },
} satisfies Record<string, HeatmapPalette>;

type PaletteId = keyof typeof PALETTES;

const DEFAULT_PALETTE_ID: PaletteId = "cyberpunk";
const PALETTE_STORAGE_KEY = "codepulse_heatmap_theme";
const PALETTE_CHANGE_EVENT = "codepulse-heatmap-theme-change";
const PALETTE_IDS = Object.keys(PALETTES) as PaletteId[];

function isPaletteId(value: string | null): value is PaletteId {
  return value !== null && Object.prototype.hasOwnProperty.call(PALETTES, value);
}

function subscribeToPalette(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(PALETTE_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(PALETTE_CHANGE_EVENT, onChange);
  };
}

function getStoredPalette(): string | null {
  try {
    return window.localStorage.getItem(PALETTE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerPalette(): string | null {
  return null;
}

function savePalette(id: PaletteId) {
  try {
    window.localStorage.setItem(PALETTE_STORAGE_KEY, id);
  } catch {}
  window.dispatchEvent(new Event(PALETTE_CHANGE_EVENT));
}

type TimeframeOption = "recent" | "2026" | "2025" | "2024";

export function ContributionHeatmap({ className, data = [] }: ContributionHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<ContributionDay | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>("recent");

  const storedPalette = useSyncExternalStore(subscribeToPalette, getStoredPalette, getServerPalette);
  const paletteId = isPaletteId(storedPalette) ? storedPalette : DEFAULT_PALETTE_ID;
  const palette: HeatmapPalette = PALETTES[paletteId];
  const levelColors = palette.levels;

  // Filter or structure data based on selected timeframe
  const gridData = useMemo(() => {
    const isYear = selectedTimeframe !== "recent";
    const weeksCount = isYear ? 52 : 24;
    const totalDays = weeksCount * 7;

    const sorted = [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let filtered = sorted;
    if (isYear) {
      filtered = sorted.filter((d) => d.date.startsWith(selectedTimeframe));
    } else {
      filtered = sorted.slice(-totalDays);
    }

    if (filtered.length < totalDays) {
      const paddingNeeded = totalDays - filtered.length;
      const firstDate =
        filtered.length > 0
          ? new Date(filtered[0].date)
          : isYear
          ? new Date(`${selectedTimeframe}-01-01`)
          : new Date();

      const paddedDays: ContributionDay[] = [];
      for (let i = paddingNeeded; i > 0; i--) {
        const d = new Date(firstDate);
        d.setDate(d.getDate() - i);
        paddedDays.push({
          date: d.toISOString().split("T")[0],
          count: 0,
          level: 0,
        });
      }
      return [...paddedDays, ...filtered];
    }

    return filtered.slice(-totalDays);
  }, [data, selectedTimeframe]);

  const weeks = useMemo(() => {
    const w = [];
    for (let i = 0; i < gridData.length; i += 7) {
      w.push(gridData.slice(i, i + 7));
    }
    return w;
  }, [gridData]);

  // Compute month labels across weeks
  const monthLabels = useMemo(() => {
    const labels: { index: number; month: string }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, wIdx) => {
      if (week.length > 0) {
        const date = new Date(week[0].date);
        const month = date.getMonth();
        if (month !== lastMonth) {
          labels.push({
            index: wIdx,
            month: date.toLocaleString("en-US", { month: "short" }),
          });
          lastMonth = month;
        }
      }
    });

    return labels;
  }, [weeks]);

  const totalContributions = useMemo(() => {
    return gridData.reduce((sum, day) => sum + (day.count || 0), 0);
  }, [gridData]);

  const getLevel = (count: number) => {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 10) return 3;
    return 4;
  };

  return (
    <div
      className={cn(
        "glass-card rounded-[32px] border border-white/5 p-8 relative overflow-hidden group h-full flex flex-col",
        className
      )}
    >
      {/* Background Ambience */}
      <div
        className={cn(
          "absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[80px] pointer-events-none transition-colors duration-1000",
          palette.ambience
        )}
      />

      {/* Header */}
      <div className="flex flex-col items-start gap-4 mb-6 relative z-10 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className={cn("p-2 rounded-xl border", palette.iconWrap)}>
              <Flame className={cn("w-5 h-5", palette.icon)} />
            </div>
            Activity Grid
          </h3>
          <p className="text-sm text-slate-400 mt-2">
            {totalContributions.toLocaleString()} contributions across{" "}
            {selectedTimeframe === "recent" ? "the last 6 months" : selectedTimeframe}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Year / Timeframe Selector */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 gap-1">
            {(
              [
                { id: "recent", label: "6 Months" },
                { id: "2026", label: "2026" },
                { id: "2025", label: "2025" },
                { id: "2024", label: "2024" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedTimeframe(opt.id)}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all",
                  selectedTimeframe === opt.id
                    ? "bg-white/20 text-white shadow"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Color palette selector */}
          <div className="relative shrink-0">
            <select
              aria-label="Heatmap color palette"
              value={paletteId}
              onChange={(e) => {
                if (isPaletteId(e.target.value)) savePalette(e.target.value);
              }}
              className="appearance-none bg-black/40 border border-white/10 text-white rounded-xl pl-3 pr-8 py-1.5 text-xs font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              {PALETTE_IDS.map((id) => (
                <option key={id} value={id} className="bg-slate-900 text-white">
                  {PALETTES[id].label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
          </div>

          {/* Hover Status Detail */}
          <div className="hidden sm:flex flex-col items-end min-h-[40px] justify-center pl-2">
            {hoveredDay ? (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-right"
              >
                <div className={cn("font-bold text-sm leading-none", palette.tooltipText)}>
                  {hoveredDay.count} {hoveredDay.count === 1 ? "commit" : "commits"}
                </div>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  {new Date(hoveredDay.date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </motion.div>
            ) : (
              <div className="text-slate-500 text-xs italic">Hover cell for details</div>
            )}
          </div>
        </div>
      </div>

      {/* Heatmap Grid & Month labels */}
      <div className="flex-1 flex flex-col justify-center relative z-10 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10">
        {/* Month Labels Bar */}
        <div className="flex gap-1 md:gap-1.5 mb-1.5 pl-6 text-[10px] text-slate-500 font-semibold select-none">
          {weeks.map((_, idx) => {
            const label = monthLabels.find((m) => m.index === idx);
            return (
              <div
                key={idx}
                className="w-2.5 md:w-3 text-left overflow-visible shrink-0 whitespace-nowrap"
              >
                {label ? label.month : ""}
              </div>
            );
          })}
        </div>

        {/* The Days Grid */}
        <div className="flex items-center gap-1.5">
          {/* Day of Week Labels */}
          <div className="flex flex-col justify-between h-[84px] md:h-[98px] pr-2 text-[9px] text-slate-500 font-medium select-none">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>

          <div className="flex gap-1 md:gap-1.5">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1 md:gap-1.5 shrink-0">
                {week.map((day, dIdx) => {
                  const level = getLevel(day.count) as keyof LevelColors;
                  return (
                    <motion.div
                      key={`${wIdx}-${dIdx}`}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: wIdx * 0.005 + dIdx * 0.005, duration: 0.2 }}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={cn(
                        "w-2.5 h-2.5 md:w-3 md:h-3 rounded-[3px] border cursor-pointer transition-all duration-200",
                        levelColors[level],
                        hoveredDay?.date === day.date
                          ? cn("scale-150 z-20 border-white ring-2", palette.hoverRing)
                          : "hover:scale-125"
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend & Stats */}
      <div className="mt-4 flex items-center justify-between text-xs font-medium text-slate-500 relative z-10 pt-2 border-t border-white/5">
        <div className="flex items-center gap-2 text-slate-400">
          <Calendar className="w-3.5 h-3.5" />
          <span>{weeks.length} Weeks Recorded</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <div
              key={l}
              className={cn("w-3 h-3 rounded-[3px] border", levelColors[l as keyof LevelColors])}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
