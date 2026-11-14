"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trophy,
  Flame,
  Code2,
  GitCommit,
  Share2,
  Check,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DeveloperReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: any;
  languages: any[];
}

export function DeveloperReplayModal({
  isOpen,
  onClose,
  stats,
  languages,
}: DeveloperReplayModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [copied, setCopied] = useState(false);

  const topLanguage =
    languages && languages.length > 0
      ? languages.reduce((prev, curr) => (prev.count > curr.count ? prev : curr))
      : null;

  const totalCommits = stats?.totalCommits || 0;
  const streak = stats?.streak || 0;
  const activeDays = Array.isArray(stats?.commitActivity)
    ? stats.commitActivity.length
    : 0;

  const slides = [
    {
      id: "intro",
      badge: "2026 Developer Replay",
      title: "Your Year in Code",
      subtitle: "A journey of commits, breakthroughs, and digital craft.",
      highlight: `${totalCommits.toLocaleString()} Total Commits`,
      detail: `You stayed committed across ${activeDays} active days. Every push made a ripple in the open source ecosystem.`,
      icon: <GitCommit className="w-12 h-12 text-blue-400" />,
      bgGradient: "from-blue-600/30 via-indigo-900/40 to-slate-950",
      accent: "text-blue-400",
      accentBorder: "border-blue-500/30",
    },
    {
      id: "languages",
      badge: "Language Mastery",
      title: topLanguage ? `${topLanguage.name} Specialist` : "Polyglot Pioneer",
      subtitle: "Mastering the syntax that powers the modern web.",
      highlight: topLanguage
        ? `${topLanguage.name} • ${topLanguage.count || 0} repositories`
        : "Versatile across languages",
      detail: topLanguage
        ? `You dominated in ${topLanguage.name}, crafting scalable solutions and pushing language frontiers.`
        : "You explored diverse technologies and expanded your developer stack.",
      icon: <Code2 className="w-12 h-12 text-cyan-400" />,
      bgGradient: "from-cyan-600/30 via-teal-900/40 to-slate-950",
      accent: "text-cyan-400",
      accentBorder: "border-cyan-500/30",
    },
    {
      id: "streak",
      badge: "Unstoppable Momentum",
      title: `${streak} Days on Fire`,
      subtitle: "Relentless discipline. Unwavering focus.",
      highlight: `${streak} Consecutive Days`,
      detail:
        streak > 0
          ? `You built a monumental streak of ${streak} days, outlasting distractions and shipping code like clockwork.`
          : "Consistency is your superpower. Your dedication keeps the momentum going every single week.",
      icon: <Flame className="w-12 h-12 text-amber-400" />,
      bgGradient: "from-amber-600/30 via-orange-900/40 to-slate-950",
      accent: "text-amber-400",
      accentBorder: "border-amber-500/30",
    },
    {
      id: "summary",
      badge: "Developer Rank & Tier",
      title: "Hall of Fame Contributor",
      subtitle: "You've earned your place among elite builders.",
      highlight: "Top Tier Performer",
      detail: `Armed with ${totalCommits} commits and top-notch code velocity, you are ready to conquer new battle leagues.`,
      icon: <Trophy className="w-12 h-12 text-purple-400" />,
      bgGradient: "from-purple-600/30 via-pink-900/40 to-slate-950",
      accent: "text-purple-400",
      accentBorder: "border-purple-500/30",
    },
  ];

  // Auto-progress slides every 6 seconds if modal is open
  useEffect(() => {
    if (!isOpen) {
      setCurrentSlide(0);
      return;
    }
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev < slides.length - 1 ? prev + 1 : prev));
    }, 6000);
    return () => clearInterval(timer);
  }, [isOpen, slides.length, currentSlide]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, slides.length, onClose]);

  const handleShare = () => {
    const text = `Check out my 2026 Developer Replay on CodePulse! Total Commits: ${totalCommits}, Peak Streak: ${streak} days! 🚀`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  const current = slides[currentSlide];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Developer Replay Modal"
    >
      <div className="relative w-full max-w-lg aspect-[9/16] sm:max-h-[680px] rounded-3xl overflow-hidden border border-white/15 shadow-2xl flex flex-col justify-between p-6 sm:p-8 bg-slate-950 text-white select-none">
        {/* Story Progress Bar */}
        <div className="flex gap-1.5 w-full z-20">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden cursor-pointer"
              onClick={() => setCurrentSlide(idx)}
            >
              <div
                className={cn(
                  "h-full bg-white transition-all duration-300",
                  idx < currentSlide && "w-full",
                  idx === currentSlide && "w-full animate-[progress_6s_linear]",
                  idx > currentSlide && "w-0"
                )}
              />
            </div>
          ))}
        </div>

        {/* Top Header controls */}
        <div className="flex items-center justify-between z-20 mt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{current.badge}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close replay"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Background Glow */}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-b opacity-80 pointer-events-none transition-colors duration-700",
            current.bgGradient
          )}
        />

        {/* Slide Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-2 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col items-center space-y-5"
            >
              <div
                className={cn(
                  "p-5 rounded-3xl bg-slate-900/80 border shadow-xl flex items-center justify-center",
                  current.accentBorder
                )}
              >
                {current.icon}
              </div>

              <div className="space-y-2">
                <span className={cn("text-xs font-bold uppercase tracking-widest", current.accent)}>
                  {current.subtitle}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                  {current.title}
                </h2>
              </div>

              <div className="px-5 py-2.5 rounded-2xl bg-white/10 backdrop-blur border border-white/10 text-lg font-black text-white">
                {current.highlight}
              </div>

              <p className="text-sm sm:text-base text-slate-300 max-w-xs leading-relaxed">
                {current.detail}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation & Sharing footer */}
        <div className="relative z-20 flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={currentSlide === 0}
              onClick={() => setCurrentSlide((prev) => Math.max(prev - 1, 0))}
              aria-label="Previous slide"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={currentSlide === slides.length - 1}
              onClick={() => setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1))}
              aria-label="Next slide"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <Button
            onClick={handleShare}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-lg"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Share Replay</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
