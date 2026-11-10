"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Trophy, Swords, Flame, Sparkles, Clock, ExternalLink } from "lucide-react";

export interface FeedItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    name?: string | null;
    avatar?: string | null;
  };
}

interface FeedItemCardProps {
  item: FeedItem;
}

export function FeedItemCard({ item }: FeedItemCardProps) {
  const [reactions, setReactions] = useState<{ clap: number; fire: number; rocket: number }>({
    clap: Math.floor(Math.random() * 4),
    fire: Math.floor(Math.random() * 6),
    rocket: Math.floor(Math.random() * 3),
  });

  const [userReacted, setUserReacted] = useState<Record<string, boolean>>({});

  const handleReact = (type: "clap" | "fire" | "rocket") => {
    if (userReacted[type]) {
      setReactions((prev) => ({ ...prev, [type]: prev[type] - 1 }));
      setUserReacted((prev) => ({ ...prev, [type]: false }));
    } else {
      setReactions((prev) => ({ ...prev, [type]: prev[type] + 1 }));
      setUserReacted((prev) => ({ ...prev, [type]: true }));
    }
  };

  const getEventIcon = () => {
    switch (item.type) {
      case "LEVEL_UP":
      case "ACHIEVEMENT":
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case "BATTLE_VICTORY":
        return <Swords className="w-4 h-4 text-purple-400" />;
      case "STREAK_MILESTONE":
        return <Flame className="w-4 h-4 text-orange-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-sky-400" />;
    }
  };

  const formattedDate = new Date(item.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all shadow-lg space-y-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${item.user.username}`}>
            <img
              src={item.user.avatar || `https://github.com/${item.user.username}.png`}
              alt={item.user.username}
              className="w-11 h-11 rounded-xl object-cover border border-white/10 hover:border-primary transition-colors cursor-pointer"
            />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/profile/${item.user.username}`}
                className="font-bold text-white text-sm hover:text-primary transition-colors"
              >
                {item.user.name || item.user.username}
              </Link>
              <span className="text-xs text-muted-foreground font-mono">@{item.user.username}</span>
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" /> {formattedDate}
            </div>
          </div>
        </div>

        <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          {getEventIcon()}
        </div>
      </div>

      <div className="pl-14 space-y-1">
        <h4 className="text-sm font-semibold text-white leading-snug">{item.title}</h4>
        {item.description && (
          <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>
        )}
      </div>

      {/* Interactive Reactions */}
      <div className="pl-14 pt-2 border-t border-white/[0.04] flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleReact("clap")}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            userReacted.clap
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
              : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white"
          }`}
        >
          <span>👏</span>
          <span>{reactions.clap}</span>
        </button>

        <button
          type="button"
          onClick={() => handleReact("fire")}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            userReacted.fire
              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
              : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white"
          }`}
        >
          <span>🔥</span>
          <span>{reactions.fire}</span>
        </button>

        <button
          type="button"
          onClick={() => handleReact("rocket")}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            userReacted.rocket
              ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
              : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white"
          }`}
        >
          <span>🚀</span>
          <span>{reactions.rocket}</span>
        </button>
      </div>
    </motion.div>
  );
}
