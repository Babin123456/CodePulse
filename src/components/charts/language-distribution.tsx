'use client';

import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { CHART_THEME } from '@/lib/constants';
import { cn, formatNumber } from '@/lib/utils';
import type { LanguageStat } from '@/types';
import { PieChart, BarChart2, Table } from 'lucide-react';

interface LanguageDistributionProps {
  className?: string;
  data?: LanguageStat[];
}

type ViewType = 'donut' | 'bar' | 'table';

export function LanguageDistribution({
  className,
  data,
}: LanguageDistributionProps) {
  const [viewType, setViewType] = useState<ViewType>('donut');
  const langData = data || [];

  const totalLines = useMemo(
    () => langData.reduce((sum, l) => sum + l.linesOfCode, 0),
    [langData]
  );

  // Donut Option
  const donutOption = useMemo(() => {
    const chartData = langData.map((lang) => ({
      name: lang.name,
      value: lang.percentage,
      linesOfCode: lang.linesOfCode,
      repos: lang.repos,
      itemStyle: { color: lang.color },
    }));

    return {
      ...CHART_THEME,
      tooltip: {
        ...CHART_THEME.tooltip,
        trigger: 'item',
        formatter: (params: {
          name: string;
          value: number;
          marker: string;
          data: { linesOfCode: number; repos: number };
        }) => {
          return `
            <div style="padding: 4px 0;">
              <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; margin-bottom: 6px;">
                ${params.marker}
                <span>${params.name}</span>
              </div>
              <div style="color: #94a3b8; font-size: 12px; line-height: 1.8;">
                <div>${params.value}% of codebase</div>
                <div>${formatNumber(params.data.linesOfCode)} lines of code</div>
                <div>${params.data.repos} repositories</div>
              </div>
            </div>
          `;
        },
      },
      legend: { show: false },
      series: [
        {
          type: 'pie',
          radius: ['55%', '80%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: true,
          padAngle: 2,
          itemStyle: {
            borderRadius: 6,
            borderColor: 'transparent',
            borderWidth: 0,
          },
          label: { show: false },
          emphasis: {
            label: { show: false },
            itemStyle: {
              shadowBlur: 20,
              shadowColor: 'rgba(0, 0, 0, 0.4)',
            },
            scaleSize: 8,
          },
          data: chartData,
        },
      ],
      graphic: [
        {
          type: 'group',
          left: 'center',
          top: 'center',
          children: [
            {
              type: 'text',
              style: {
                text: formatNumber(totalLines),
                fill: '#e2e8f0',
                fontSize: 22,
                fontWeight: 700,
                fontFamily: 'Inter, system-ui, sans-serif',
                textAlign: 'center',
              },
              left: 'center',
              top: -10,
            },
            {
              type: 'text',
              style: {
                text: 'lines of code',
                fill: '#64748b',
                fontSize: 11,
                fontFamily: 'Inter, system-ui, sans-serif',
                textAlign: 'center',
              },
              left: 'center',
              top: 14,
            },
          ],
        },
      ],
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
    };
  }, [langData, totalLines]);

  // Horizontal Stacked Bar Option
  const barOption = useMemo(() => {
    return {
      ...CHART_THEME,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#64748b' },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
      },
      yAxis: {
        type: 'category',
        data: langData.map((l) => l.name).reverse(),
        axisLabel: { color: '#cbd5e1' },
      },
      series: [
        {
          name: 'Percentage',
          type: 'bar',
          data: langData.map((l) => ({
            value: l.percentage,
            itemStyle: { color: l.color, borderRadius: [0, 6, 6, 0] },
          })).reverse(),
        },
      ],
    };
  }, [langData]);

  return (
    <div
      className={cn(
        'rounded-[20px] border border-white/[0.06] bg-[#111827]/80 p-6 backdrop-blur-xl flex flex-col',
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold tracking-wide text-slate-200">
          Language Distribution
        </h3>
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setViewType('donut')}
            title="Donut Chart"
            className={cn(
              'p-1.5 rounded-lg text-xs transition-colors',
              viewType === 'donut' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
            )}
          >
            <PieChart className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewType('bar')}
            title="Bar Chart"
            className={cn(
              'p-1.5 rounded-lg text-xs transition-colors',
              viewType === 'bar' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
            )}
          >
            <BarChart2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewType('table')}
            title="Data Table"
            className={cn(
              'p-1.5 rounded-lg text-xs transition-colors',
              viewType === 'table' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
            )}
          >
            <Table className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewType === 'donut' && (
        <>
          <ReactECharts
            option={donutOption}
            style={{ height: '260px', width: '100%' }}
            opts={{ renderer: 'canvas' }}
            theme="dark"
          />
          {/* Custom legend */}
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 px-1">
            {langData.map((lang) => (
              <div
                key={lang.name}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: lang.color }}
                  />
                  <span className="text-slate-300">{lang.name}</span>
                </div>
                <span className="font-medium tabular-nums text-slate-400">
                  {lang.percentage}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {viewType === 'bar' && (
        <ReactECharts
          option={barOption}
          style={{ height: '300px', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          theme="dark"
        />
      )}

      {viewType === 'table' && (
        <div className="overflow-x-auto min-h-[260px]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/10 text-slate-400 font-semibold uppercase">
              <tr>
                <th className="py-2.5 px-2">Language</th>
                <th className="py-2.5 px-2">Share</th>
                <th className="py-2.5 px-2">Lines of Code</th>
                <th className="py-2.5 px-2">Repos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {langData.map((lang) => (
                <tr key={lang.name} className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-2 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: lang.color }}
                    />
                    <span className="text-white font-semibold">{lang.name}</span>
                  </td>
                  <td className="py-2.5 px-2 tabular-nums text-cyan-400 font-bold">
                    {lang.percentage}%
                  </td>
                  <td className="py-2.5 px-2 tabular-nums text-slate-400">
                    {formatNumber(lang.linesOfCode)}
                  </td>
                  <td className="py-2.5 px-2 tabular-nums text-slate-400">
                    {lang.repos}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
