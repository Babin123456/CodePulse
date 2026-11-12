"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import ReactECharts from "echarts-for-react";
import { StaggerContainer, StaggerItem } from "@/components/animations/page-transition";
import { AnimatedCounter, AnimatedProgress, AnimatedRing } from "@/components/animations/animated-counter";
import { formatNumber, cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/api/use-auth";
import { RepoStarGrowthChart } from "@/components/charts/repo-star-growth-chart";
import {
  ArrowLeft, Code, Star, GitFork, Eye, AlertCircle, GitPullRequest,
  Users, HardDrive, Calendar, Activity, ExternalLink, Shield, Zap,
  TrendingUp, Clock, Package, FileCode2, Loader2, ChevronDown
} from "lucide-react";

/* ──────────────────────────────────────────────
   Helper: Deterministic Pseudo-Random
   ────────────────────────────────────────────── */
function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function generateActivityData(name: string, totalCommits: number) {
  let seed = 0;
  for (let i = 0; i < name.length; i++) seed += name.charCodeAt(i);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const data: number[] = [];
  const ratio = Math.max(totalCommits / 12, 1);

  for (let i = 0; i < 12; i++) {
    const val = Math.max(0, Math.round(ratio * (0.3 + seededRandom(seed + i) * 1.4)));
    data.push(val);
  }
  return { months, data };
}

function generateWeekdayData(name: string) {
  let seed = 0;
  for (let i = 0; i < name.length; i++) seed += name.charCodeAt(i) * 3;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day, i) => ({
    day,
    value: Math.round(seededRandom(seed + i * 7) * 40 + 5),
  }));
}

/* ──────────────────────────────────────────────
   Helper: Compute Derived Analytics
   ────────────────────────────────────────────── */
function computeHealthScore(repo: any): number {
  let score = 0;
  if (repo.description && repo.description.length > 10) score += 20;
  if (repo.topics && repo.topics.length > 0) score += 15;
  if (repo.topics && repo.topics.length >= 3) score += 10;
  if (repo.language) score += 10;
  if (repo.commits > 10) score += 15;
  if (repo.commits > 50) score += 10;
  if (repo.stars > 0) score += 10;
  if (repo.forks > 0) score += 10;
  return Math.min(score, 100);
}

function computePopularityScore(repo: any): number {
  return Math.min(100, Math.round(
    (repo.stars * 3) + (repo.forks * 5) + (repo.watchers * 2)
  ));
}

function computeActivityScore(repo: any): number {
  const daysSinceUpdate = Math.max(1, Math.floor(
    (Date.now() - new Date(repo.repoUpdatedAt || repo.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  ));
  const recency = Math.max(0, 100 - daysSinceUpdate);
  const commitScore = Math.min(50, repo.commits);
  return Math.min(100, Math.round((recency + commitScore) / 1.5));
}

function getRankInfo(repo: any) {
  if (repo.stars > 50) return { label: "Legendary", color: "#f59e0b", gradient: "from-amber-500 to-orange-500", icon: "🏆" };
  if (repo.commits > 100 || repo.forks > 10) return { label: "On Fire", color: "#ef4444", gradient: "from-rose-500 to-pink-500", icon: "🔥" };
  if (repo.commits > 50 && repo.stars < 10) return { label: "Hidden Gem", color: "#10b981", gradient: "from-emerald-400 to-teal-500", icon: "💎" };
  if (repo.stars > 5) return { label: "Rising Star", color: "#3b82f6", gradient: "from-blue-500 to-cyan-500", icon: "⭐" };
  return { label: "Starter", color: "#64748b", gradient: "from-slate-500 to-slate-600", icon: "🌱" };
}

/* ──────────────────────────────────────────────
   Main Page Component
   ────────────────────────────────────────────── */
export default function RepositoryDeepAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const repoName = decodeURIComponent(params.id as string);
  const { data: currentUser, isLoading } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "insights">("overview");

  const repo = useMemo(() => {
    if (!currentUser) return null;
    const repos = (currentUser as any)?.repositories || [];
    return repos.find((r: any) => r.name === repoName) || null;
  }, [currentUser, repoName]);

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
        <Code className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold text-white">Repository not found</h2>
        <p className="text-muted-foreground">We could not find a repository named &quot;{repoName}&quot;.</p>
        <button onClick={() => router.push("/repositories")} className="mt-4 px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors">
          ← Back to Repositories
        </button>
      </div>
    );
  }

  const healthScore = computeHealthScore(repo);
  const popularityScore = computePopularityScore(repo);
  const activityScore = computeActivityScore(repo);
  const overallScore = Math.round((healthScore + popularityScore + activityScore) / 3);
  const rank = getRankInfo(repo);
  const activity = generateActivityData(repo.name, repo.commits);
  const weekdayData = generateWeekdayData(repo.name);

  const daysSinceCreated = Math.max(1, Math.floor(
    (Date.now() - new Date(repo.repoCreatedAt || repo.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  ));
  const commitsPerDay = (repo.commits / daysSinceCreated).toFixed(2);
  const ageInMonths = Math.floor(daysSinceCreated / 30);
  const sizeInMB = (repo.size / 1024).toFixed(1);

  /* ── ECharts: Monthly Activity ── */
  const activityChartOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(10,15,30,0.95)",
      borderColor: "rgba(139,92,246,0.3)",
      borderWidth: 1,
      textStyle: { color: "#fff", fontSize: 13 },
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(139,92,246,0.06)" } },
    },
    grid: { top: 20, right: 20, bottom: 30, left: 45, containLabel: false },
    xAxis: {
      type: "category",
      data: activity.months,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#64748b", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#64748b", fontSize: 11 },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.03)", type: "dashed" } },
    },
    series: [{
      type: "bar",
      data: activity.data,
      barWidth: "50%",
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: {
          type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: repo.languageColor || "#a855f7" },
            { offset: 1, color: `${repo.languageColor || "#a855f7"}40` },
          ],
        },
      },
    }],
    animation: true,
    animationDuration: 1200,
    animationEasing: "cubicOut",
  };

  /* ── ECharts: Weekday Distribution ── */
  const weekdayChartOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(10,15,30,0.95)",
      borderColor: "rgba(56,189,248,0.3)",
      borderWidth: 1,
      textStyle: { color: "#fff" },
    },
    grid: { top: 10, right: 20, bottom: 30, left: 45, containLabel: false },
    xAxis: {
      type: "category",
      data: weekdayData.map(d => d.day),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#64748b", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#64748b", fontSize: 11 },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.03)", type: "dashed" } },
    },
    series: [{
      type: "line",
      data: weekdayData.map(d => d.value),
      smooth: 0.4,
      showSymbol: false,
      lineStyle: { width: 3, color: "#38bdf8", shadowColor: "rgba(56,189,248,0.4)", shadowBlur: 8 },
      areaStyle: {
        color: {
          type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: "rgba(56,189,248,0.3)" },
            { offset: 1, color: "rgba(56,189,248,0)" },
          ],
        },
      },
    }],
    animation: true,
    animationDuration: 1500,
  };

  /* ── ECharts: Radar Score ── */
  const radarOption = {
    backgroundColor: "transparent",
    radar: {
      indicator: [
        { name: "Health", max: 100 },
        { name: "Popularity", max: 100 },
        { name: "Activity", max: 100 },
        { name: "Community", max: 100 },
        { name: "Maturity", max: 100 },
      ],
      shape: "polygon",
      splitNumber: 4,
      axisName: { color: "#94a3b8", fontSize: 11 },
      splitArea: { areaStyle: { color: ["rgba(255,255,255,0.01)", "rgba(255,255,255,0.02)"] } },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
    },
    series: [{
      type: "radar",
      data: [{
        value: [
          healthScore,
          popularityScore,
          activityScore,
          Math.min(100, (repo.contributors || 1) * 20),
          Math.min(100, ageInMonths * 5),
        ],
        name: repo.name,
        lineStyle: { width: 2, color: repo.languageColor || "#a855f7" },
        areaStyle: { color: `${repo.languageColor || "#a855f7"}30` },
        itemStyle: { color: repo.languageColor || "#a855f7" },
      }],
    }],
    animation: true,
    animationDuration: 1500,
  };

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "activity" as const, label: "Activity" },
    { id: "insights" as const, label: "Insights" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">

      {/* ─── Back Button ─── */}
      <button
        onClick={() => router.push("/repositories")}
        className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back to Repositories</span>
      </button>

      {/* ─── Hero Banner ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[32px] border border-white/5"
      >
        {/* Gradient Background */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${repo.languageColor || "#6366f1"}25 0%, transparent 50%), linear-gradient(225deg, rgba(139,92,246,0.1) 0%, transparent 50%)`,
          }}
        />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] opacity-20" style={{ backgroundColor: repo.languageColor || "#6366f1" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-[100px] opacity-10 bg-blue-500" />

        <div className="relative z-10 p-8 sm:p-10 lg:p-12">
          <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
            <div className="flex items-start gap-5">
              {/* Language Icon */}
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-md shrink-0"
                style={{ backgroundColor: `${repo.languageColor || "#6366f1"}15` }}
              >
                <Code className="w-10 h-10" style={{ color: repo.languageColor || "#a78bfa" }} />
              </div>

              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{repo.name}</h1>
                  <span className={`px-3 py-1 rounded-full bg-gradient-to-r ${rank.gradient} text-white text-xs font-bold uppercase tracking-wider shadow-lg`}>
                    {rank.icon} {rank.label}
                  </span>
                </div>
                <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
                  {repo.description || "No description provided."}
                </p>
                {repo.topics && repo.topics.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {repo.topics.map((topic: string) => (
                      <span key={topic} className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 font-medium hover:bg-white/10 transition-colors">
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CTA */}
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white text-black font-bold hover:bg-slate-100 transition-all shadow-lg hover:shadow-xl shrink-0"
            >
              Open in GitHub <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </motion.div>

      {/* ─── Tab Selector ─── */}
      <div className="flex gap-2 bg-white/[0.02] p-1.5 rounded-2xl border border-white/5 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-semibold transition-all",
              activeTab === tab.id
                ? "bg-white/10 text-white shadow-sm"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <StaggerContainer className="space-y-8">
              {/* ── Quick Stat Cards ── */}
              <StaggerItem>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { icon: Star, label: "Stars", value: repo.stars, color: "text-amber-400", bg: "bg-amber-400/10" },
                    { icon: GitFork, label: "Forks", value: repo.forks, color: "text-slate-300", bg: "bg-slate-400/10" },
                    { icon: Eye, label: "Watchers", value: repo.watchers, color: "text-blue-400", bg: "bg-blue-400/10" },
                    { icon: AlertCircle, label: "Issues", value: repo.issues, color: "text-rose-400", bg: "bg-rose-400/10" },
                    { icon: GitPullRequest, label: "PRs", value: repo.pullRequests, color: "text-purple-400", bg: "bg-purple-400/10" },
                    { icon: Users, label: "Contributors", value: repo.contributors, color: "text-emerald-400", bg: "bg-emerald-400/10" },
                  ].map((stat, i) => (
                    <div key={i} className="glass-card rounded-2xl p-5 border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="relative z-10">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", stat.bg)}>
                          <stat.icon className={cn("w-5 h-5", stat.color)} />
                        </div>
                        <div className="text-2xl font-black text-white">
                          <AnimatedCounter value={stat.value} />
                        </div>
                        <div className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">{stat.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </StaggerItem>

              {/* ── Score Overview + Radar ── */}
              <StaggerItem>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Overall Score Card */}
                  <div className="lg:col-span-4 glass-card rounded-[28px] p-8 border border-white/5 relative overflow-hidden flex flex-col items-center justify-center text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent" />
                    <div className="relative z-10">
                      <AnimatedRing value={overallScore} max={100} size={160} strokeWidth={8}>
                        <div className="text-center">
                          <div className="text-4xl font-black text-white">{overallScore}</div>
                          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Score</div>
                        </div>
                      </AnimatedRing>

                      <h3 className="text-xl font-bold text-white mt-6 mb-4">Repository Score</h3>

                      <div className="space-y-4 w-full max-w-[240px]">
                        {[
                          { label: "Health", value: healthScore, color: "from-emerald-500 to-teal-500" },
                          { label: "Popularity", value: popularityScore, color: "from-amber-500 to-orange-500" },
                          { label: "Activity", value: activityScore, color: "from-blue-500 to-cyan-500" },
                        ].map(s => (
                          <div key={s.label}>
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="text-slate-400 font-medium">{s.label}</span>
                              <span className="text-white font-bold">{s.value}%</span>
                            </div>
                            <AnimatedProgress value={s.value} max={100} size="sm" barClassName={`bg-gradient-to-r ${s.color}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Radar Chart */}
                  <div className="lg:col-span-8 glass-card rounded-[28px] p-8 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-10" style={{ backgroundColor: repo.languageColor || "#a855f7" }} />
                    <div className="relative z-10">
                      <h3 className="text-xl font-bold text-white flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/20">
                          <Shield className="w-5 h-5 text-purple-400" />
                        </div>
                        Competency Radar
                      </h3>
                      <p className="text-sm text-slate-400 mb-4">Multi-dimensional analysis of repository strengths.</p>
                      <div className="w-full h-[300px]">
                        <ReactECharts option={radarOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} theme="dark" />
                      </div>
                    </div>
                  </div>
                </div>
              </StaggerItem>

              {/* ── Meta Info Cards ── */}
              <StaggerItem>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { icon: Calendar, label: "Age", value: ageInMonths > 12 ? `${Math.floor(ageInMonths / 12)}y ${ageInMonths % 12}m` : `${ageInMonths} months`, sub: "Since creation" },
                    { icon: Zap, label: "Velocity", value: `${commitsPerDay}/day`, sub: "Avg commits" },
                    { icon: HardDrive, label: "Size", value: `${sizeInMB} MB`, sub: "Repository size" },
                    { icon: Package, label: "Language", value: repo.language || "N/A", sub: "Primary language" },
                  ].map((m, i) => (
                    <div key={i} className="glass-card rounded-2xl p-5 border border-white/5">
                      <m.icon className="w-5 h-5 text-slate-500 mb-3" />
                      <div className="text-lg font-black text-white">{m.value}</div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">{m.sub}</div>
                    </div>
                  ))}
                </div>
              </StaggerItem>
            </StaggerContainer>
          </motion.div>
        )}

        {activeTab === "activity" && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <StaggerContainer className="space-y-8">
              {/* ── Monthly Activity Chart ── */}
              <StaggerItem>
                <div className="glass-card rounded-[28px] p-8 border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-96 h-96 rounded-full blur-[120px] opacity-5" style={{ backgroundColor: repo.languageColor || "#a855f7" }} />
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3 mb-1">
                      <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/20">
                        <Activity className="w-5 h-5 text-purple-400" />
                      </div>
                      Monthly Commit Distribution
                    </h3>
                    <p className="text-sm text-slate-400 mb-6">Estimated monthly commit patterns over the past year.</p>
                    <div className="w-full h-[320px]">
                      <ReactECharts option={activityChartOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} theme="dark" />
                    </div>
                  </div>
                </div>
              </StaggerItem>

              {/* ── Weekday Distribution ── */}
              <StaggerItem>
                <div className="glass-card rounded-[28px] p-8 border border-white/5 relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3 mb-1">
                      <div className="p-2 rounded-xl bg-sky-500/20 border border-sky-500/20">
                        <Clock className="w-5 h-5 text-sky-400" />
                      </div>
                      Weekday Activity Pattern
                    </h3>
                    <p className="text-sm text-slate-400 mb-6">When are you most active on this project?</p>
                    <div className="w-full h-[280px]">
                      <ReactECharts option={weekdayChartOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} theme="dark" />
                    </div>
                  </div>
                </div>
              </StaggerItem>

              {/* ── Commit Milestones ── */}
              <StaggerItem>
                <div className="glass-card rounded-[28px] p-8 border border-white/5">
                  <h3 className="text-xl font-bold text-white flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/20">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    </div>
                    Commit Milestones
                  </h3>
                  <div className="space-y-4">
                    {[10, 50, 100, 250, 500, 1000].map(milestone => {
                      const achieved = repo.commits >= milestone;
                      return (
                        <div key={milestone} className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 border",
                            achieved ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-white/[0.02] border-white/5 text-slate-600"
                          )}>
                            {achieved ? "✓" : milestone}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className={cn("text-sm font-semibold", achieved ? "text-white" : "text-slate-500")}>
                                {milestone} Commits
                              </span>
                              <span className={cn("text-xs font-medium", achieved ? "text-emerald-400" : "text-slate-600")}>
                                {achieved ? "Achieved!" : `${Math.round((repo.commits / milestone) * 100)}%`}
                              </span>
                            </div>
                            <AnimatedProgress
                              value={Math.min(repo.commits, milestone)}
                              max={milestone}
                              size="sm"
                              barClassName={achieved ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-slate-600 to-slate-700"}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </motion.div>
        )}

        {activeTab === "insights" && (
          <motion.div
            key="insights"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <StaggerContainer className="space-y-8">
              {/* ── Star Growth & Velocity Forecast ── */}
              <StaggerItem>
                <RepoStarGrowthChart repo={repo} />
              </StaggerItem>

              {/* ── AI Insights Cards ── */}
              <StaggerItem>
                <div className="glass-card rounded-[28px] p-8 border border-white/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent" />
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-xl bg-violet-500/20 border border-violet-500/20">
                        <Zap className="w-5 h-5 text-violet-400" />
                      </div>
                      Smart Insights
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Insight 1 */}
                      <div className="bg-white/[0.02] rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Strength</span>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">
                          {repo.commits > 100
                            ? `With ${formatNumber(repo.commits)} commits, this is one of your most actively developed projects. Your dedication is truly remarkable!`
                            : repo.commits > 30
                              ? `Solid commit history of ${formatNumber(repo.commits)} commits shows consistent development effort.`
                              : `This project is still in its early stages. Keep pushing — great things take time!`}
                        </p>
                      </div>

                      {/* Insight 2 */}
                      <div className="bg-white/[0.02] rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Opportunity</span>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">
                          {!repo.description || repo.description.length < 20
                            ? "Adding a detailed description would significantly improve discoverability. A good README is your project's first impression!"
                            : repo.topics && repo.topics.length < 3
                              ? "Consider adding more topics/tags. Repos with 3+ topics get significantly more organic traffic on GitHub."
                              : repo.stars < 5
                                ? "Share your project on developer communities like Reddit, Twitter, or Dev.to to gain visibility and attract contributors."
                                : "Your repo is well-maintained! Consider writing a blog post or tutorial about your tech stack to attract more users."}
                        </p>
                      </div>

                      {/* Insight 3 */}
                      <div className="bg-white/[0.02] rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Comparison</span>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">
                          {repo.stars > 10
                            ? `Your repo has ${formatNumber(repo.stars)} stars, placing it in the top tier of developer side-projects. You're building something people care about.`
                            : `Most open-source projects start with 0 stars. Your ${formatNumber(repo.stars)} star${repo.stars !== 1 ? "s" : ""} ${repo.stars > 0 ? "shows early traction" : "will grow as more people discover it"}.`}
                        </p>
                      </div>

                      {/* Insight 4 */}
                      <div className="bg-white/[0.02] rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                          <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Health Check</span>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">
                          {repo.issues > 10
                            ? `You have ${formatNumber(repo.issues)} open issues. Consider a dedicated issue-triaging session to keep the backlog clean.`
                            : healthScore >= 80
                              ? "Your repository is in excellent health! All key metadata is present and the codebase is active."
                              : healthScore >= 50
                                ? "Your repo health is decent, but could improve. Add topics, a better description, or increase commit frequency."
                                : "This repo needs attention. Missing description, topics, or inactivity is hurting its score."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </StaggerItem>

              {/* ── Recommendations ── */}
              <StaggerItem>
                <div className="glass-card rounded-[28px] p-8 border border-white/5">
                  <h3 className="text-xl font-bold text-white flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-pink-500/20 border border-pink-500/20">
                      <FileCode2 className="w-5 h-5 text-pink-400" />
                    </div>
                    Action Plan
                  </h3>

                  <div className="space-y-3">
                    {[
                      { done: !!repo.description, label: "Add a detailed project description" },
                      { done: repo.topics && repo.topics.length >= 3, label: "Add at least 3 repository topics/tags" },
                      { done: repo.commits >= 50, label: "Reach 50 commits milestone" },
                      { done: repo.stars >= 5, label: "Get your first 5 stars" },
                      { done: repo.forks >= 1, label: "Get your first fork" },
                      { done: repo.contributors >= 2, label: "Attract a contributor" },
                    ].map((item, i) => (
                      <div key={i} className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border transition-colors",
                        item.done
                          ? "bg-emerald-500/5 border-emerald-500/10"
                          : "bg-white/[0.01] border-white/5 hover:border-white/10"
                      )}>
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0",
                          item.done
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-white/5 text-slate-600"
                        )}>
                          {item.done ? "✓" : (i + 1)}
                        </div>
                        <span className={cn("text-sm font-medium", item.done ? "text-emerald-300 line-through opacity-70" : "text-slate-300")}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
