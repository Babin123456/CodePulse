"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { BattleSetup } from "@/components/battles/battle-setup";
import { BattleIntro } from "@/components/battles/battle-intro";
import { BattleRounds } from "@/components/battles/battle-rounds";
import { BattleReport } from "@/components/battles/battle-report";
import { BattleMatchmakingSkeleton } from "@/components/battles/battle-skeleton";
import { BattleHistoryList, type HistoricalBattle } from "@/components/battles/battle-history-list";
import { useCurrentUser } from "@/hooks/api/use-auth";

type BattlePhase = "SETUP" | "INTRO" | "ROUNDS" | "REPORT";

export default function BattlesPage() {
  const { data: currentUser } = useCurrentUser();
  const [phase, setPhase] = useState<BattlePhase>("SETUP");
  const [ghostBattleData, setGhostBattleData] = useState<{ p1: any, p2: any, battleType: string } | null>(null);
  const [setupUsernames, setSetupUsernames] = useState<{p1: string, p2: string, battleType: string} | null>(null);
  const [initialP1, setInitialP1] = useState("");
  const [initialP2, setInitialP2] = useState("");

  const [isIntroFinished, setIsIntroFinished] = useState(false);
  const [battleHistory, setBattleHistory] = useState<HistoricalBattle[]>([]);

  // Load history from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("devbattle_battle_history");
        if (saved) {
          setBattleHistory(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Failed to load battle history:", e);
      }
    }
  }, []);

  const saveBattleToHistory = (p1: any, p2: any, battleType: string) => {
    try {
      const calc = (s: any) =>
        (s?.totalCommits || 0) * 1 +
        (s?.totalPRs || 0) * 5 +
        (s?.totalStars || 0) * 10 +
        (s?.followers || 0) * 2 +
        (s?.streak || 0) * 5;

      const p1Score = p1?.score || calc(p1?.stats) || 85;
      const p2Score = p2?.score || calc(p2?.stats) || 70;
      const winner = p1Score > p2Score ? "p1" : p1Score < p2Score ? "p2" : "draw";
      const xpChange = Math.abs(Math.round((p1Score - p2Score) * 0.15)) + 15;

      const newRecord: HistoricalBattle = {
        id: `battle-${Date.now()}`,
        player1: p1,
        player2: p2,
        battleType,
        winner,
        p1Score,
        p2Score,
        xpChange,
        createdAt: new Date().toISOString(),
      };

      setBattleHistory((prev) => {
        const updated = [newRecord, ...prev.filter((b) => b.id !== newRecord.id)].slice(0, 20);
        if (typeof window !== "undefined") {
          localStorage.setItem("devbattle_battle_history", JSON.stringify(updated));
        }
        return updated;
      });
    } catch (e) {
      console.error("Error saving battle history:", e);
    }
  };

  // Read URL query parameters (e.g. /battles?p2=<username>)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const p2 = params.get("p2") || params.get("opponent") || params.get("vs");
      const p1 = params.get("p1") || currentUser?.username || "code-with-abhi-i5";
      if (p2) {
        setInitialP2(p2);
      }
      if (p1) {
        setInitialP1(p1);
      }
    }
  }, [currentUser]);

  const startGhostBattle = async (p1: string, p2: string, battleType: string) => {
    setSetupUsernames({ p1, p2, battleType });
    setIsIntroFinished(false);
    setPhase("INTRO");
    
    try {
      const [res1, res2] = await Promise.all([
        fetch(`/api/github/developer?username=${p1}`),
        fetch(`/api/github/developer?username=${p2}`)
      ]);

      if (!res1.ok || !res2.ok) {
        throw new Error("Could not find one or both GitHub users.");
      }

      const data1 = await res1.json();
      const data2 = await res2.json();

      setGhostBattleData({ p1: data1, p2: data2, battleType });
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate battle.");
      setPhase("SETUP");
    }
  };

  // Deep-linking / Quick Battle trigger from Command Palette or URL params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const opponent = params.get("p2") || params.get("opponent") || params.get("vs");
      const p1 = params.get("p1") || currentUser?.username || "code-with-abhi-i5";
      const battleType = params.get("type") || "Overall Battle";

      if (opponent) {
        startGhostBattle(p1, opponent, battleType);
      }
    }
  }, [currentUser]);

  const handleIntroComplete = () => {
    setIsIntroFinished(true);
  };

  // Transition to ROUNDS only when BOTH intro animation finished AND data loaded
  useEffect(() => {
    if (phase === "INTRO" && isIntroFinished && ghostBattleData) {
      setPhase("ROUNDS");
    }
  }, [phase, isIntroFinished, ghostBattleData]);

  return (
    <div className="w-full relative min-h-[calc(100vh-80px)]">
      <AnimatePresence mode="wait">
        
        {phase === "SETUP" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <BattleSetup
              onStart={startGhostBattle}
              initialPlayer1={initialP1}
              initialPlayer2={initialP2}
            />

            <BattleHistoryList
              battles={battleHistory}
              onReplay={(battle) => {
                setGhostBattleData({
                  p1: battle.player1,
                  p2: battle.player2,
                  battleType: battle.battleType,
                });
                setPhase("REPORT");
              }}
              onStartNew={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </motion.div>
        )}

        {phase === "INTRO" && setupUsernames && !isIntroFinished && (
          <BattleIntro 
            key="intro"
            p1Username={setupUsernames.p1}
            p2Username={setupUsernames.p2}
            onIntroComplete={handleIntroComplete}
          />
        )}

        {phase === "INTRO" && setupUsernames && isIntroFinished && !ghostBattleData && (
          <motion.div
            key="matchmaking-skeleton"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="pt-6"
          >
            <BattleMatchmakingSkeleton
              p1Username={setupUsernames.p1}
              p2Username={setupUsernames.p2}
              battleType={setupUsernames.battleType}
            />
          </motion.div>
        )}

        {phase === "ROUNDS" && ghostBattleData && (
          <motion.div
            key="rounds"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -50 }}
          >
            <BattleRounds 
              player1={ghostBattleData.p1} 
              player2={ghostBattleData.p2} 
              battleType={ghostBattleData.battleType}
              onComplete={() => {
                saveBattleToHistory(ghostBattleData.p1, ghostBattleData.p2, ghostBattleData.battleType);
                setPhase("REPORT");
              }} 
            />
          </motion.div>
        )}

        {phase === "REPORT" && ghostBattleData && (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-4"
          >
            <BattleReport 
              player1={ghostBattleData.p1}
              player2={ghostBattleData.p2}
              battleType={ghostBattleData.battleType}
              onRematch={() => {
                setGhostBattleData(null);
                setSetupUsernames(null);
                setPhase("SETUP");
              }}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

