"use client";

import { motion } from "motion/react";
import Link from "next/link";
import {
  ArrowRight,
  Play,
  Sparkles,
  ChevronRight,
  Trophy,
  Zap,
  TrendingUp,
} from "lucide-react";
import { GithubIcon } from "@/components/icons/github";

// Deterministic heatmap data to avoid hydration mismatch
const HEATMAP_DATA = [
  [0, 1, 2, 3, 1, 0, 2], [1, 3, 1, 2, 0, 1, 3], [2, 0, 3, 1, 2, 3, 0],
  [0, 2, 1, 3, 3, 1, 2], [3, 1, 0, 2, 1, 0, 3], [1, 0, 2, 0, 3, 2, 1],
  [2, 3, 1, 3, 0, 1, 0], [0, 1, 3, 2, 2, 3, 1], [3, 2, 0, 1, 1, 0, 2],
  [1, 0, 2, 3, 0, 2, 3], [0, 3, 1, 0, 2, 1, 0], [2, 1, 3, 2, 3, 0, 1],
  [3, 0, 0, 1, 1, 3, 2], [1, 2, 3, 0, 2, 1, 3], [0, 1, 2, 3, 0, 2, 1],
  [2, 3, 0, 1, 3, 0, 2], [1, 0, 3, 2, 1, 3, 0], [3, 2, 1, 0, 0, 1, 3],
  [0, 1, 2, 3, 2, 0, 1], [2, 3, 0, 1, 3, 2, 0],
];

const INTENSITY_COLORS = [
  "rgba(56, 189, 248, 0.06)",
  "rgba(56, 189, 248, 0.15)",
  "rgba(56, 189, 248, 0.35)",
  "rgba(56, 189, 248, 0.65)",
];

const CHART_DOTS: [number, number][] = [[60, 65], [120, 40], [180, 55], [240, 25], [300, 35], [360, 15]];

export function Hero3D() {
  return (
    <section
      aria-label="Hero Overview"
      className="relative min-h-screen flex items-center pt-16 overflow-hidden"
      style={{
        background: "transparent",
      }}
    >
      {/* CSS Keyframe Animations */}
      <style>{`
        @keyframes hero-float {
          0%, 100% { transform: rotateX(8deg) rotateY(-12deg) translateY(0px) scale(1); }
          25% { transform: rotateX(10deg) rotateY(-10deg) translateY(-10px) scale(1.005); }
          50% { transform: rotateX(12deg) rotateY(-7deg) translateY(-20px) scale(1.01); }
          75% { transform: rotateX(9deg) rotateY(-11deg) translateY(-8px) scale(1.003); }
        }
        @keyframes hero-float-card {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(14px) scale(1.02); }
        }
        @keyframes hero-float-reverse {
          0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
          50% { transform: translateY(-18px) rotate(3deg) scale(1.03); }
        }
        @keyframes hero-float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-6px) rotate(-1deg); }
          50% { transform: translateY(-14px) rotate(-3deg); }
          75% { transform: translateY(-4px) rotate(-1deg); }
        }
        @keyframes hero-float-gentle {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
          25% { transform: translateY(-12px) translateX(8px) rotate(1deg); }
          50% { transform: translateY(2px) translateX(4px) rotate(0deg); }
          75% { transform: translateY(8px) translateX(-5px) rotate(-1deg); }
        }
        @keyframes hero-glow-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        @keyframes hero-line-draw {
          from { stroke-dashoffset: 600; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes hero-bar-1 {
          0%, 100% { height: 40%; } 25% { height: 70%; } 50% { height: 30%; } 75% { height: 55%; }
        }
        @keyframes hero-bar-2 {
          0%, 100% { height: 65%; } 25% { height: 40%; } 50% { height: 85%; } 75% { height: 50%; }
        }
        @keyframes hero-bar-3 {
          0%, 100% { height: 45%; } 25% { height: 75%; } 50% { height: 35%; } 75% { height: 60%; }
        }
        @keyframes hero-bar-4 {
          0%, 100% { height: 80%; } 25% { height: 50%; } 50% { height: 90%; } 75% { height: 45%; }
        }
        @keyframes hero-bar-5 {
          0%, 100% { height: 55%; } 25% { height: 80%; } 50% { height: 40%; } 75% { height: 70%; }
        }
        @keyframes hero-bar-6 {
          0%, 100% { height: 70%; } 25% { height: 45%; } 50% { height: 85%; } 75% { height: 55%; }
        }
        @keyframes hero-bar-7 {
          0%, 100% { height: 90%; } 25% { height: 60%; } 50% { height: 75%; } 75% { height: 95%; }
        }
        @keyframes hero-donut-spin {
          from { transform: rotate(-90deg); }
          to { transform: rotate(270deg); }
        }
        @keyframes hero-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes hero-stat-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); }
          50% { transform: scale(1.03); box-shadow: 0 0 20px 2px rgba(56, 189, 248, 0.15); }
        }
        @keyframes hero-heatmap-wave {
          0%, 100% { transform: scaleY(1); opacity: 1; }
          50% { transform: scaleY(1.4); opacity: 0.8; }
        }
        @keyframes hero-particle-float {
          0% { transform: translateY(0) translateX(0) scale(0); opacity: 0; }
          10% { opacity: 1; transform: scale(1); }
          90% { opacity: 0.6; }
          100% { transform: translateY(-800px) translateX(100px) scale(0.3); opacity: 0; }
        }
        @keyframes hero-border-glow {
          0%, 100% { border-color: rgba(56, 189, 248, 0.1); box-shadow: 0 25px 60px rgba(0,0,0,0.5), 0 0 20px rgba(56,189,248,0.05); }
          50% { border-color: rgba(56, 189, 248, 0.3); box-shadow: 0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(56,189,248,0.15); }
        }
        @keyframes hero-chart-dot-pulse {
          0%, 100% { r: 3; opacity: 0.8; }
          50% { r: 5; opacity: 1; }
        }
        @keyframes hero-trend-arrow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes hero-scan-line {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { top: 100%; opacity: 0; }
        }
        .hero-dashboard { animation: hero-float 7s ease-in-out infinite; }
        .hero-card-1 { animation: hero-float-card 5s ease-in-out infinite; animation-delay: 0.5s; }
        .hero-card-2 { animation: hero-float-reverse 6s ease-in-out infinite; animation-delay: 1s; }
        .hero-card-3 { animation: hero-float-slow 8s ease-in-out infinite; animation-delay: 1.5s; }
        .hero-card-4 { animation: hero-float-gentle 7s ease-in-out infinite; animation-delay: 2s; }
        .hero-glow { animation: hero-glow-pulse 4s ease-in-out infinite; }
        .hero-chart-line { animation: hero-line-draw 2s ease-out forwards; stroke-dasharray: 600; stroke-dashoffset: 600; animation-delay: 1s; }
        .hero-bar-1 { animation: hero-bar-1 3s ease-in-out infinite; }
        .hero-bar-2 { animation: hero-bar-2 3.5s ease-in-out infinite; animation-delay: 0.2s; }
        .hero-bar-3 { animation: hero-bar-3 2.8s ease-in-out infinite; animation-delay: 0.4s; }
        .hero-bar-4 { animation: hero-bar-4 3.2s ease-in-out infinite; animation-delay: 0.6s; }
        .hero-bar-5 { animation: hero-bar-5 3.7s ease-in-out infinite; animation-delay: 0.3s; }
        .hero-bar-6 { animation: hero-bar-6 2.9s ease-in-out infinite; animation-delay: 0.5s; }
        .hero-bar-7 { animation: hero-bar-7 3.4s ease-in-out infinite; animation-delay: 0.7s; }
        .hero-donut-ring { animation: hero-donut-spin 8s linear infinite; }
        .hero-shimmer { background: linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.08) 50%, transparent 100%); background-size: 200% 100%; animation: hero-shimmer 3s ease-in-out infinite; }
        .hero-stat-pulse { animation: hero-stat-pulse 4s ease-in-out infinite; }
        .hero-border-glow { animation: hero-border-glow 5s ease-in-out infinite; }
        .hero-chart-dot { animation: hero-chart-dot-pulse 2s ease-in-out infinite; }
        .hero-trend-arrow { animation: hero-trend-arrow 1.5s ease-in-out infinite; }
        .hero-scan-line { animation: hero-scan-line 4s linear infinite; }
        .hero-particle { animation: hero-particle-float linear infinite; }
      `}</style>

      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-1/4 right-1/3 w-[500px] h-[500px] rounded-full blur-[180px] hero-glow"
          style={{ background: "rgba(56, 189, 248, 0.08)" }}
        />
        <div
          className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] rounded-full blur-[160px] hero-glow"
          style={{ background: "rgba(14, 165, 233, 0.06)", animationDelay: "2s" }}
        />
        <div
          className="absolute top-2/3 right-1/4 w-[300px] h-[300px] rounded-full blur-[120px] hero-glow"
          style={{ background: "rgba(56, 189, 248, 0.05)", animationDelay: "3s" }}
        />
      </div>

      {/* Grid overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(56,189,248,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-sky-400 rounded-full hero-particle"
            style={{
              left: `${((i * 37 + 17) % 96) + 2}%`,
              bottom: "-20px",
              animationDuration: `${5 + ((i * 7) % 10)}s`,
              animationDelay: `${((i * 1.3) % 5).toFixed(2)}s`,
              boxShadow: "0 0 10px 2px rgba(56, 189, 248, 0.6)",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
        {/* Left - Text Content */}
        <div className="order-2 lg:order-1">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm mb-8"
            style={{
              background: "rgba(56, 189, 248, 0.08)",
              border: "1px solid rgba(56, 189, 248, 0.2)",
              color: "rgba(56, 189, 248, 0.9)",
            }}
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>Now tracking 250,000+ developers worldwide</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-tight mb-6"
          >
            Your GitHub,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
              Gamified
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-slate-400 max-w-lg mb-10"
          >
            Track your coding journey with beautiful analytics. Compete with
            developers worldwide. Earn achievements and climb the leaderboard.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-start gap-4"
          >
            <Link
              href="/dashboard"
              aria-label="Start with GitHub - Track and gamify your coding journey"
              className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]"
            >
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-semibold text-lg transition-shadow"
                style={{
                  background: "linear-gradient(135deg, #0ea5e9, #3b82f6)",
                  boxShadow: "0 8px 32px rgba(14, 165, 233, 0.3)",
                }}
              >
                <GithubIcon className="w-5 h-5" aria-hidden="true" />
                Start with GitHub
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </motion.div>
            </Link>
            <Link
              href="/dashboard"
              aria-label="View interactive demo of developer analytics"
              className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]"
            >
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-lg transition-colors text-slate-200 hover:text-white"
                style={{
                  background: "rgba(56, 189, 248, 0.08)",
                  border: "1px solid rgba(56, 189, 248, 0.2)",
                }}
              >
                <Play className="w-5 h-5" aria-hidden="true" />
                View Demo
              </motion.div>
            </Link>
          </motion.div>
        </div>

        {/* Right - 3D Analytics Dashboard */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            delay: 0.5,
            type: "spring",
            stiffness: 80,
            damping: 20,
          }}
          className="order-1 lg:order-2 relative"
          style={{ perspective: "1200px" }}
          aria-hidden="true"
          role="presentation"
        >
          {/* ====== Main Dashboard Card (3D Tilted + Floating) ====== */}
          <div
            className="hero-dashboard relative"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div
              className="relative rounded-2xl p-6 backdrop-blur-xl overflow-hidden hero-border-glow"
              style={{
                background:
                  "linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85))",
                border: "1px solid rgba(56, 189, 248, 0.15)",
                boxShadow:
                  "0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(56, 189, 248, 0.08), inset 0 1px 0 rgba(56, 189, 248, 0.1)",
              }}
            >
              {/* Scanline effect */}
              <div className="absolute left-0 right-0 h-24 hero-scan-line pointer-events-none -z-10" style={{ background: "linear-gradient(to bottom, transparent, rgba(56, 189, 248, 0.05), transparent)" }} />
              {/* Window controls */}
              <div className="flex items-center justify-between mb-5" aria-hidden="true">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color: "rgba(56, 189, 248, 0.6)" }}
                >
                  CodePulse Analytics
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: "Total Commits", value: "12,847", trend: "+23%" },
                  { label: "Pull Requests", value: "834", trend: "+12%" },
                  { label: "Current Streak", value: "47 days", trend: "🔥" },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-3 hero-stat-pulse"
                    style={{
                      background: "rgba(56, 189, 248, 0.05)",
                      border: "1px solid rgba(56, 189, 248, 0.1)",
                      animationDelay: `${i * 1.5}s`,
                    }}
                  >
                    <div className="text-[10px] text-slate-500 mb-1">
                      {stat.label}
                    </div>
                    <div className="text-sm font-bold text-white">
                      {stat.value}
                    </div>
                    <div className="text-[10px] text-emerald-400 mt-0.5 hero-trend-arrow inline-block" style={{ animationDelay: `${i * 0.2}s` }}>
                      {stat.trend}
                    </div>
                  </div>
                ))}
              </div>

              {/* Line Chart */}
              <div
                className="rounded-xl p-4 mb-4"
                style={{
                  background: "rgba(56, 189, 248, 0.03)",
                  border: "1px solid rgba(56, 189, 248, 0.08)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400">
                    Contribution Activity
                  </span>
                  <span className="text-[10px] text-sky-400">
                    Last 6 months
                  </span>
                </div>
                <svg viewBox="0 0 400 100" className="w-full h-20">
                  <defs>
                    <linearGradient
                      id="hero-chart-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="rgba(56, 189, 248, 0.3)"
                      />
                      <stop
                        offset="100%"
                        stopColor="rgba(56, 189, 248, 0)"
                      />
                    </linearGradient>
                    <linearGradient
                      id="hero-chart-line"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#0ea5e9" />
                      <stop offset="100%" stopColor="#38bdf8" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 80 Q 30 60, 60 65 T 120 40 T 180 55 T 240 25 T 300 35 T 360 15 L 400 20 L 400 100 L 0 100 Z"
                    fill="url(#hero-chart-fill)"
                  />
                  <path
                    d="M 0 80 Q 30 60, 60 65 T 120 40 T 180 55 T 240 25 T 300 35 T 360 15 L 400 20"
                    fill="none"
                    stroke="url(#hero-chart-line)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="hero-chart-line"
                  />
                  {CHART_DOTS.map(([cx, cy], i) => (
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r="3"
                      fill="#38bdf8"
                      opacity="0.8"
                      className="hero-chart-dot"
                      style={{ animationDelay: `${i * 0.3}s` }}
                    />
                  ))}
                </svg>
              </div>

              {/* Contribution Heatmap */}
              <div>
                <div className="text-xs font-medium text-slate-400 mb-2">
                  Contribution Heatmap
                </div>
                <div className="flex gap-[3px]">
                  {HEATMAP_DATA.map((col, colIdx) => (
                    <div key={colIdx} className="flex flex-col gap-[3px]">
                      {col.map((intensity, rowIdx) => (
                        <div
                          key={rowIdx}
                          className="w-[10px] h-[10px] rounded-[2px] hero-heatmap-wave"
                          style={{
                            background: INTENSITY_COLORS[intensity],
                            animationDelay: `${(colIdx + rowIdx) * 0.05}s`,
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ====== Floating Card: Bar Chart ====== */}
          <div
            className="absolute -left-8 top-[20%] hero-card-1 hidden md:block"
          >
            <div
              className="rounded-xl p-4"
              style={{
                background:
                  "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.92))",
                border: "1px solid rgba(56, 189, 248, 0.15)",
                boxShadow:
                  "0 15px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(56, 189, 248, 0.06)",
              }}
            >
              <div className="text-[10px] text-slate-500 mb-2">
                Weekly Stats
              </div>
              <div className="flex items-end gap-1.5 h-16">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <div
                    key={n}
                    className={`w-4 rounded-t hero-bar-${n}`}
                    style={{
                      background:
                        "linear-gradient(to top, rgba(14, 165, 233, 0.4), rgba(56, 189, 248, 0.8))",
                      boxShadow: "0 0 8px rgba(56, 189, 248, 0.2)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ====== Floating Card: Donut Chart ====== */}
          <div
            className="absolute -right-4 top-0 hero-card-2 hidden md:block"
          >
            <div
              className="rounded-xl p-4"
              style={{
                background:
                  "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.92))",
                border: "1px solid rgba(56, 189, 248, 0.15)",
                boxShadow:
                  "0 15px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(56, 189, 248, 0.05)",
              }}
            >
              <svg width="60" height="60" viewBox="0 0 60 60" className="hero-donut-ring">
                <circle
                  cx="30"
                  cy="30"
                  r="22"
                  fill="none"
                  stroke="rgba(56, 189, 248, 0.1)"
                  strokeWidth="6"
                />
                <circle
                  cx="30"
                  cy="30"
                  r="22"
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth="6"
                  strokeDasharray="90 138.2"
                  strokeLinecap="round"
                  transform="rotate(-90 30 30)"
                />
                <circle
                  cx="30"
                  cy="30"
                  r="22"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="6"
                  strokeDasharray="35 138.2"
                  strokeDashoffset="-90"
                  strokeLinecap="round"
                  transform="rotate(-90 30 30)"
                />
              </svg>
              <div className="text-center mt-1">
                <div className="text-xs font-bold text-white">65%</div>
                <div className="text-[9px] text-slate-500">Score</div>
              </div>
            </div>
          </div>

          {/* ====== Floating Badge: Rank ====== */}
          <div
            className="absolute -right-2 bottom-[25%] hero-card-3 hidden md:block"
          >
            <div
              className="rounded-full px-4 py-2.5 flex items-center gap-2"
              style={{
                background:
                  "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.92))",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                boxShadow:
                  "0 10px 30px rgba(0, 0, 0, 0.3), 0 0 15px rgba(56, 189, 248, 0.08)",
              }}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white">Rank #42</span>
              <Trophy className="w-3 h-3 text-amber-400" />
            </div>
          </div>

          {/* ====== Floating Card: Achievement ====== */}
          <div
            className="absolute left-4 -bottom-4 hero-card-4 hidden md:block"
          >
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{
                background:
                  "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.92))",
                border: "1px solid rgba(56, 189, 248, 0.15)",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
              }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500">
                  Achievement Unlocked
                </div>
                <div className="text-xs font-bold text-white">
                  100 Day Streak! 🎉
                </div>
              </div>
            </div>
          </div>

          {/* ====== Floating Card: Trending ====== */}
          <div
            className="absolute -left-12 bottom-[10%] hero-card-2 hidden lg:block"
            style={{ animationDelay: "3s" }}
          >
            <div
              className="rounded-xl px-3 py-2 flex items-center gap-2"
              style={{
                background:
                  "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.92))",
                border: "1px solid rgba(56, 189, 248, 0.15)",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
              }}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-semibold text-white">
                +2,341 commits
              </span>
            </div>
          </div>

          {/* Glow behind dashboard */}
          <div
            className="absolute inset-0 -z-10 rounded-3xl blur-3xl"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(56, 189, 248, 0.1), transparent 70%)",
            }}
          />
        </motion.div>
      </div>
    </section>
  );
}
