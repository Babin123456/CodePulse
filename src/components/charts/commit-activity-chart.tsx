'use client';

import { useMemo, useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'motion/react';
import { CHART_THEME } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { GitCommit, TrendingUp, Calendar } from 'lucide-react';
import type { CommitActivity } from '@/types';

export type TimeframeOption = '7D' | '1M' | '6M' | '1Y' | 'ALL';

interface TimeframeConfig {
  id: TimeframeOption;
  label: string;
  days: number | null;
}

const TIMEFRAMES: TimeframeConfig[] = [
  { id: '7D', label: '7D', days: 7 },
  { id: '1M', label: '1M', days: 30 },
  { id: '6M', label: '6M', days: 180 },
  { id: '1Y', label: '1Y', days: 365 },
  { id: 'ALL', label: 'ALL', days: null },
];

const STORAGE_KEY = 'codepulse_chart_timeframe';

interface CommitActivityChartProps {
  className?: string;
  data?: CommitActivity[];
}

export function CommitActivityChart({ className, data = [] }: CommitActivityChartProps) {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('1M');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as TimeframeOption | null;
      if (saved && TIMEFRAMES.some((t) => t.id === saved)) {
        setTimeframe(saved);
      }
    } catch (e) {
      console.error('Failed to read timeframe preference', e);
    }
  }, []);

  const handleSelectTimeframe = (tf: TimeframeOption) => {
    setTimeframe(tf);
    try {
      localStorage.setItem(STORAGE_KEY, tf);
    } catch (e) {
      console.error('Failed to save timeframe preference', e);
    }
  };

  const selectedConfig = TIMEFRAMES.find((t) => t.id === timeframe) || TIMEFRAMES[1];

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (selectedConfig.days === null) {
      return [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - selectedConfig.days);

    return data
      .filter((d) => new Date(d.date).getTime() >= cutoff.getTime())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data, selectedConfig.days]);

  // Summary Metrics calculations based on selected timeframe
  const metrics = useMemo(() => {
    if (filteredData.length === 0) {
      return { total: 0, avgPerDay: '0.0', peakDay: { date: 'N/A', commits: 0 } };
    }

    let total = 0;
    let max = { date: filteredData[0].date, commits: filteredData[0].commits };

    for (const d of filteredData) {
      total += d.commits;
      if (d.commits > max.commits) {
        max = { date: d.date, commits: d.commits };
      }
    }

    const activeDays = filteredData.length || 1;
    const avgPerDay = (total / activeDays).toFixed(1);

    return {
      total,
      avgPerDay,
      peakDay: {
        date: max.date ? new Date(max.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
        commits: max.commits,
      },
    };
  }, [filteredData]);

  const option = useMemo(() => {
    const dates = filteredData.map((d: CommitActivity) => d.date);
    const commits = filteredData.map((d: CommitActivity) => d.commits);

    return {
      ...CHART_THEME,
      tooltip: {
        ...CHART_THEME.tooltip,
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          lineStyle: { color: 'rgba(168, 85, 247, 0.3)' },
          crossStyle: { color: 'rgba(168, 85, 247, 0.3)' },
          label: {
            backgroundColor: '#1e293b',
            color: '#e2e8f0',
          },
        },
        formatter: (params: Array<{ axisValue: string; value: number; marker: string }>) => {
          const p = params[0];
          const date = new Date(p.axisValue);
          const formatted = date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          return `
            <div style="padding: 4px 0;">
              <div style="font-weight: 600; margin-bottom: 6px;">${formatted}</div>
              <div style="display: flex; align-items: center; gap: 6px;">
                ${p.marker}
                <span>${p.value} commits</span>
              </div>
            </div>
          `;
        },
      },
      grid: {
        top: 20,
        right: 16,
        bottom: 32,
        left: 48,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          fontFamily: 'Inter, system-ui, sans-serif',
          formatter: (val: string) => {
            const d = new Date(val);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          },
          interval: Math.max(Math.floor(dates.length / 6) - 1, 0),
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        splitLine: {
          lineStyle: { color: 'rgba(255,255,255,0.04)', type: 'dashed' },
        },
      },
      series: [
        {
          name: 'Commits',
          type: 'line',
          data: commits,
          smooth: 0.4,
          showSymbol: false,
          symbolSize: 6,
          emphasis: {
            focus: 'series',
            itemStyle: {
              borderColor: '#a855f7',
              borderWidth: 2,
              shadowBlur: 12,
              shadowColor: 'rgba(168, 85, 247, 0.5)',
            },
          },
          lineStyle: {
            width: 2.5,
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: '#8b5cf6' },
                { offset: 0.5, color: '#a855f7' },
                { offset: 1, color: '#6366f1' },
              ],
            },
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(139, 92, 246, 0.35)' },
                { offset: 0.5, color: 'rgba(139, 92, 246, 0.1)' },
                { offset: 1, color: 'rgba(139, 92, 246, 0)' },
              ],
            },
          },
        },
      ],
      animation: true,
      animationDuration: 750,
      animationEasing: 'cubicOut',
    };
  }, [filteredData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className={cn(
        'rounded-[24px] border border-white/[0.06] bg-[#111827]/80 p-6 backdrop-blur-xl space-y-6',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-primary" />
            Commit Activity
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time contribution frequency and velocity
          </p>
        </div>

        {/* Segmented Timeframe Control */}
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] self-start sm:self-auto">
          {TIMEFRAMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelectTimeframe(t.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer',
                timeframe === t.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recalculated Summary Badges */}
      <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
        <div className="text-center sm:text-left">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
            <GitCommit className="w-3 h-3 text-purple-400" /> Commits ({timeframe})
          </span>
          <div className="text-lg font-bold text-white mt-0.5">{metrics.total.toLocaleString()}</div>
        </div>
        <div className="text-center sm:text-left border-x border-white/[0.06] px-3">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" /> Avg / Day
          </span>
          <div className="text-lg font-bold text-emerald-400 mt-0.5">{metrics.avgPerDay}</div>
        </div>
        <div className="text-center sm:text-left">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
            <Calendar className="w-3 h-3 text-amber-400" /> Peak Day
          </span>
          <div className="text-lg font-bold text-amber-400 mt-0.5">
            {metrics.peakDay.commits} <span className="text-xs font-normal text-muted-foreground">({metrics.peakDay.date})</span>
          </div>
        </div>
      </div>

      <ReactECharts
        option={option}
        style={{ height: '350px', width: '100%' }}
        opts={{ renderer: 'canvas' }}
        theme="dark"
        notMerge={false}
      />
    </motion.div>
  );
}
