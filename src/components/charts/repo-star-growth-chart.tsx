"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Star, Zap, Target, TrendingUp } from "lucide-react";
import { AnimatedCounter } from "@/components/animations/animated-counter";
import { formatNumber, cn } from "@/lib/utils";

interface RepoStarGrowthChartProps {
  repo: any;
  className?: string;
}

const MILESTONES = [10, 50, 100, 250, 500, 1000, 5000, 10000];

export function RepoStarGrowthChart({ repo, className }: RepoStarGrowthChartProps) {
  const currentStars = repo.stars || 0;

  // 1. Calculate age & velocity metrics
  const { monthlyVelocity, nextMilestone, daysToMilestone, months, historicalData, projectedData } = useMemo(() => {
    const createdAt = new Date(repo.repoCreatedAt || repo.createdAt || Date.now());
    const daysOld = Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Average monthly velocity based on repo lifetime
    const velocity = Math.max(0.5, (currentStars / daysOld) * 30);
    const mVelocity = Number(velocity.toFixed(1));

    // Next milestone
    const milestone = MILESTONES.find((m) => m > currentStars) || (currentStars + 50);
    const starsNeeded = milestone - currentStars;
    const daysRemaining = Math.max(1, Math.round((starsNeeded / (velocity / 30))));

    // Build 6 past months + 1 future month for projection
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const labels: string[] = [];
    const hist: (number | null)[] = [];

    // Historical curve: 5 months back to current month (6 points)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(monthNames[d.getMonth()]);
      
      // Interpolate star progression up to currentStars
      const factor = Math.pow((6 - i) / 6, 1.4);
      hist.push(Math.max(0, Math.round(currentStars * factor)));
    }

    // Add 30-day projection point
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    labels.push(`${monthNames[nextMonth.getMonth()]} (30d Est)`);
    
    const proj: (number | null)[] = [null, null, null, null, null, hist[5], Math.round(currentStars + velocity)];

    return {
      monthlyVelocity: mVelocity,
      nextMilestone: milestone,
      daysToMilestone: daysRemaining,
      months: labels,
      historicalData: hist,
      projectedData: proj,
    };
  }, [currentStars, repo.repoCreatedAt, repo.createdAt]);

  // 2. ECharts Option
  const chartOption = useMemo(() => {
    const maxVal = Math.max(...(historicalData.filter((v): v is number => v !== null)), ...(projectedData.filter((v): v is number => v !== null)), 10);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(10,15,30,0.95)",
        borderColor: "rgba(245,158,11,0.3)",
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: "#fff", fontSize: 13 },
        formatter: (params: any[]) => {
          const point = params.find((p) => p.value !== null && p.value !== undefined);
          if (!point) return "";
          const isProjection = point.seriesName === "Forecast (30d)";
          return `
            <div class="flex flex-col gap-1">
              <span class="text-xs text-amber-400 font-bold uppercase tracking-wider">${point.name}</span>
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full ${isProjection ? 'bg-amber-300' : 'bg-amber-400'}"></span>
                <span class="text-white font-bold text-base">${point.value} <span class="text-xs font-normal text-slate-400">${isProjection ? 'predicted stars' : 'stars'}</span></span>
              </div>
            </div>
          `;
        },
      },
      grid: { top: 25, right: 25, bottom: 25, left: 45, containLabel: false },
      xAxis: {
        type: "category",
        data: months,
        boundaryGap: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#64748b", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: Math.ceil(maxVal * 1.15),
        splitNumber: 4,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#64748b", fontSize: 11 },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
      },
      series: [
        {
          name: "Star Growth",
          type: "line",
          smooth: 0.35,
          showSymbol: false,
          data: historicalData,
          lineStyle: { width: 3, color: "#f59e0b" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(245,158,11,0.35)" },
                { offset: 1, color: "rgba(245,158,11,0.0)" },
              ],
            },
          },
        },
        {
          name: "Forecast (30d)",
          type: "line",
          smooth: false,
          showSymbol: true,
          symbolSize: 6,
          data: projectedData,
          lineStyle: { width: 2.5, type: "dashed", color: "#fbbf24" },
          itemStyle: { color: "#fbbf24" },
        },
      ],
    };
  }, [months, historicalData, projectedData]);

  return (
    <div className={cn("glass-card rounded-[28px] p-8 border border-white/5 relative overflow-hidden", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Header & Metric Pills */}
      <div className="relative z-10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/20">
                <TrendingUp className="w-5 h-5 text-amber-400" />
              </div>
              Star Growth & Velocity Projection
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Historical accumulation and 30-day milestone forecast
            </p>
          </div>

          {/* Metric Pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Pill 1: Total Stars */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-300">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span><AnimatedCounter value={currentStars} /> Stars</span>
            </div>

            {/* Pill 2: Velocity */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-300">
              <Zap className="w-3.5 h-3.5 text-violet-400" />
              <span>+{monthlyVelocity} stars/mo</span>
            </div>

            {/* Pill 3: Milestone */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-300">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>{formatNumber(currentStars)}/{formatNumber(nextMilestone)} Stars (Est. in {daysToMilestone}d)</span>
            </div>
          </div>
        </div>

        {/* ECharts Area Graph */}
        <div className="h-[280px] w-full">
          <ReactECharts
            option={chartOption}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "svg" }}
            theme="dark"
          />
        </div>
      </div>
    </div>
  );
}

