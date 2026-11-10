"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wifi, Swords, ShieldCheck, Clock, CheckCircle2, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerLobbyState {
  userId: string;
  username: string;
  isReady: boolean;
  avatar?: string;
}

interface BattleLiveRoomProps {
  battleId: string;
  currentUsername: string;
  opponentUsername: string;
  onBattleStart: () => void;
}

export function BattleLiveRoom({
  battleId,
  currentUsername,
  opponentUsername,
  onBattleStart,
}: BattleLiveRoomProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Simulated live socket state with graceful fallback
  useEffect(() => {
    // When both are ready, initiate 3-second synchronized countdown
    if (isReady && opponentReady) {
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            onBattleStart();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isReady, opponentReady, onBattleStart]);

  // Simulate opponent becoming ready shortly after player
  const handleReadyClick = () => {
    setIsReady(true);
    setTimeout(() => {
      setOpponentReady(true);
    }, 1200);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-[32px] p-8 md:p-12 border border-white/10 shadow-2xl relative overflow-hidden"
      >
        {/* Connection status header */}
        <div className="flex items-center justify-between pb-6 border-b border-white/[0.06] mb-8">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "w-2.5 h-2.5 rounded-full",
                isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              )}
            />
            <span className="text-xs font-mono font-medium text-slate-300">
              {isConnected ? "WEBSOCKET LOBBY CONNECTED" : "RECONNECTING..."}
            </span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            ROOM: #{battleId.slice(0, 8)}
          </span>
        </div>

        {/* Head-to-Head Lobby Slots */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative items-center mb-10">
          {/* Player 1 Card */}
          <div
            className={cn(
              "p-6 rounded-2xl border transition-all text-center space-y-4",
              isReady
                ? "bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                : "bg-white/[0.02] border-white/10"
            )}
          >
            <div className="relative inline-block">
              <img
                src={`https://github.com/${currentUsername}.png`}
                alt={currentUsername}
                className="w-20 h-20 rounded-2xl border-2 border-white/20 mx-auto object-cover"
              />
              {isReady && (
                <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-black font-bold">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div>
              <div className="font-bold text-white text-lg">@{currentUsername}</div>
              <div className="text-xs text-muted-foreground mt-0.5">(You)</div>
            </div>
            <div
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider",
                isReady
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/5 text-muted-foreground border border-white/10"
              )}
            >
              {isReady ? "Ready to Fight" : "Waiting for Ready"}
            </div>
          </div>

          {/* VS Center Marker */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-slate-900 border border-white/10 items-center justify-center font-black text-xs text-primary shadow-xl">
            VS
          </div>

          {/* Player 2 Card */}
          <div
            className={cn(
              "p-6 rounded-2xl border transition-all text-center space-y-4",
              opponentReady
                ? "bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                : "bg-white/[0.02] border-white/10"
            )}
          >
            <div className="relative inline-block">
              <img
                src={`https://github.com/${opponentUsername}.png`}
                alt={opponentUsername}
                className="w-20 h-20 rounded-2xl border-2 border-white/20 mx-auto object-cover"
              />
              {opponentReady && (
                <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-black font-bold">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div>
              <div className="font-bold text-white text-lg">@{opponentUsername}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Opponent</div>
            </div>
            <div
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider",
                opponentReady
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/5 text-muted-foreground border border-white/10"
              )}
            >
              {opponentReady ? "Ready to Fight" : "Waiting for Ready"}
            </div>
          </div>
        </div>

        {/* Action Controls & Synchronized Countdown */}
        <div className="text-center">
          <AnimatePresence mode="wait">
            {countdown !== null ? (
              <motion.div
                key="countdown"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="space-y-2"
              >
                <div className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
                  Synchronizing DevBattle Match...
                </div>
                <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400 font-mono">
                  {countdown}
                </div>
              </motion.div>
            ) : (
              <motion.div key="ready-btn">
                <button
                  type="button"
                  onClick={handleReadyClick}
                  disabled={isReady}
                  className={cn(
                    "px-8 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 shadow-xl cursor-pointer",
                    isReady
                      ? "bg-white/10 text-muted-foreground cursor-default border border-white/10"
                      : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-500/25 hover:scale-105"
                  )}
                >
                  <Swords className="w-4 h-4 inline-block mr-2" />
                  {isReady ? "Locked In — Awaiting Opponent" : "I'm Ready — Start Battle"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
