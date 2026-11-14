"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Trophy, Flame, Code2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DeveloperReplayModal } from "@/components/modals/developer-replay-modal";

interface GithubWrappedBannerProps {
  stats: any;
  languages: any[];
}

export function GithubWrappedBanner({ stats, languages }: GithubWrappedBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isReplayOpen, setIsReplayOpen] = useState(false);

  // Generate dynamic insights
  const topLanguage = languages.length > 0 ? languages.reduce((prev, current) => (prev.count > current.count) ? prev : current) : null;
  const activeDays = Array.isArray(stats.commitActivity) ? stats.commitActivity.length : 0;
  
  const insights = [
    {
      id: 1,
      icon: <Code2 className="w-8 h-8 text-cyan-400" />,
      title: "Language Master",
      text: topLanguage 
        ? `You wrote a massive amount of code in ${topLanguage.name} this year. True dedication!`
        : "You explored multiple languages and expanded your stack this year.",
      color: "from-cyan-500/20 to-blue-500/5",
      accent: "text-cyan-400"
    },
    {
      id: 2,
      icon: <Flame className="w-8 h-8 text-amber-400" />,
      title: "Unstoppable Momentum",
      text: `You pushed through with an incredible ${stats.streak || 0}-day commit streak.`,
      color: "from-amber-500/20 to-orange-500/5",
      accent: "text-amber-400"
    },
    {
      id: 3,
      icon: <Trophy className="w-8 h-8 text-purple-400" />,
      title: "Consistent Contributor",
      text: `You were active for ${activeDays} days, contributing ${stats.totalCommits || 0} commits to the open source world.`,
      color: "from-purple-500/20 to-pink-500/5",
      accent: "text-purple-400"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % insights.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [insights.length]);

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-black/40 backdrop-blur-xl min-h-[220px] flex items-center p-8 sm:p-12 group">
      {/* Background Animated Gradient Glow */}
      <div className="absolute inset-0 opacity-30 transition-all duration-1000 ease-in-out" 
        style={{
          background: `radial-gradient(circle at 80% 50%, var(--glow-color) 0%, transparent 50%)`,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className={cn("absolute inset-0 bg-gradient-to-r", insights[currentIndex].color)}
          />
        </AnimatePresence>
      </div>

      <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity duration-700">
        <Sparkles className="w-32 h-32 text-white animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/5 mb-6 text-xs font-medium text-slate-300">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Your Year in Code</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-4"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                {insights[currentIndex].icon}
              </div>
              <h2 className={cn("text-2xl sm:text-3xl font-black tracking-tight", insights[currentIndex].accent)}>
                {insights[currentIndex].title}
              </h2>
            </div>
            
            <p className="text-lg sm:text-xl text-slate-300 leading-relaxed font-medium">
              {insights[currentIndex].text}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Progress Indicators and Replay Button */}
        <div className="absolute bottom-6 left-8 sm:left-12 right-8 flex items-center justify-between">
          <div className="flex gap-2">
            {insights.map((_, idx) => (
              <div 
                key={idx} 
                className="h-1 rounded-full bg-white/10 overflow-hidden"
                style={{ width: currentIndex === idx ? '32px' : '12px', transition: 'width 0.3s ease' }}
              >
                {currentIndex === idx && (
                  <motion.div
                    className="h-full bg-white"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 6, ease: "linear" }}
                  />
                )}
              </div>
            ))}
          </div>

          <Button
            size="sm"
            onClick={() => setIsReplayOpen(true)}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-md transition-all shadow-md"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Play Replay Story</span>
          </Button>
        </div>
      </div>

      {/* Fullscreen Interactive Story Replay Modal */}
      <DeveloperReplayModal
        isOpen={isReplayOpen}
        onClose={() => setIsReplayOpen(false)}
        stats={stats}
        languages={languages}
      />
    </div>
  );
}
