"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Shield,
  Skull,
  Swords,
  Trophy,
  Users,
  Clock,
  Flame,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export type RaidPhaseObjective =
  | "SYNTAX_AND_LINT"
  | "ALGORITHMIC_OPTIMIZATION"
  | "CONCURRENCY_DEADLOCK_PATCH";

export interface RaidSquadMember {
  userId: string;
  username: string;
  role: string;
  totalDamage: number;
  shieldDamage: number;
  isMvp?: boolean;
}

export interface RaidBossViewModel {
  raidId: string;
  bossName: string;
  bossTitle: string;
  status: "ACTIVE" | "VICTORY" | "WIPED";
  maxHp: number;
  currentHp: number;
  maxShield: number;
  currentShield: number;
  currentPhase: 1 | 2 | 3;
  remainingSeconds: number;
  combatLog: string;
  squad: RaidSquadMember[];
}

const PHASE_METADATA: Record<
  1 | 2 | 3,
  {
    title: string;
    objective: RaidPhaseObjective;
    badge: string;
    prompt: string;
    starterCode: string;
  }
> = {
  1: {
    title: "Phase I: Shatter the Syntax & Lint Aegis",
    objective: "SYNTAX_AND_LINT",
    badge: "Shield Break",
    prompt:
      "Fix leaked closure bindings and strict TypeScript syntax defects to shatter the 250,000-point boss shield.",
    starterCode: `export function allocateBuffer(items: string[]): string[] {\n  return items.map((item) => item.trim());\n}`,
  },
  2: {
    title: "Phase II: Collapse Asymptotic Complexity to O(N)",
    objective: "ALGORITHMIC_OPTIMIZATION",
    badge: "Core Damage",
    prompt:
      "Replace the O(N^2) nested scan with a single-pass O(N) Set/Map lookup to cleave the boss core HP.",
    starterCode: `export function countUniquePairs(nums: number[]): number {\n  const seen = new Set<number>(nums);\n  return seen.size;\n}`,
  },
  3: {
    title: "Phase III: Patch Concurrency Deadlocks Before Enrage",
    objective: "CONCURRENCY_DEADLOCK_PATCH",
    badge: "Enraged Finale",
    prompt:
      "Enforce canonical resource lock ordering to prevent AB-BA thread deadlocks before the wipe timer expires.",
    starterCode: `export async function safeTransfer(firstId: string, secondId: string) {\n  const ordered = [firstId, secondId].sort();\n  return ordered;\n}`,
  },
};

export default function CooperativeRaidBossPage() {
  const params = useParams<{ id?: string }>();
  const raidId = params?.id ?? "hydra-raid-01";

  const [raid, setRaid] = useState<RaidBossViewModel>({
    raidId,
    bossName: "The Memory Leak Hydra",
    bossTitle: "Colossal Heap Devourer • 4-Player Co-Op Raid",
    status: "ACTIVE",
    maxHp: 1_000_000,
    currentHp: 1_000_000,
    maxShield: 250_000,
    currentShield: 250_000,
    currentPhase: 1,
    remainingSeconds: 420,
    combatLog:
      "4-Player Raid Squad synchronized! Shatter The Memory Leak Hydra's shield in Phase I.",
    squad: [
      {
        userId: "u-1",
        username: "Itssonia7",
        role: "ARCHITECT",
        totalDamage: 0,
        shieldDamage: 0,
      },
      {
        userId: "u-2",
        username: "arjun_dev",
        role: "OPTIMIZER",
        totalDamage: 0,
        shieldDamage: 0,
      },
      {
        userId: "u-3",
        username: "meera_codes",
        role: "CONCURRENCY GUARD",
        totalDamage: 0,
        shieldDamage: 0,
      },
      {
        userId: "u-4",
        username: "rohan_sys",
        role: "LINT STRIKER",
        totalDamage: 0,
        shieldDamage: 0,
      },
    ],
  });

  const [codeDraft, setCodeDraft] = useState<string>(PHASE_METADATA[1].starterCode);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  useEffect(() => {
    setCodeDraft(PHASE_METADATA[raid.currentPhase].starterCode);
  }, [raid.currentPhase]);

  useEffect(() => {
    if (raid.status !== "ACTIVE") return;
    const interval = setInterval(() => {
      setRaid((prev) => {
        if (prev.status !== "ACTIVE") return prev;
        const nextSec = Math.max(0, prev.remainingSeconds - 1);
        return {
          ...prev,
          remainingSeconds: nextSec,
          status: nextSec === 0 ? "WIPED" : "ACTIVE",
          combatLog:
            nextSec === 0
              ? `ENRAGED WIPE! ${prev.bossName} overwhelmed the squad as the timer hit 0:00.`
              : prev.combatLog,
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [raid.status]);

  const handleExecuteRefactorStrike = () => {
    if (raid.status !== "ACTIVE") return;
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 380);

    setRaid((prev) => {
      if (prev.status !== "ACTIVE") return prev;

      if (prev.currentPhase === 1) {
        const shieldHit = Math.min(prev.currentShield, 250_000);
        const nextShield = prev.currentShield - shieldHit;
        const nextPhase: 1 | 2 | 3 = nextShield === 0 ? 2 : 1;
        return {
          ...prev,
          currentShield: nextShield,
          currentPhase: nextPhase,
          combatLog:
            nextPhase === 2
              ? "SHIELD SHATTERED! Itssonia7 broke the syntax barrier — Phase II unlocked!"
              : `Itssonia7 dealt ${shieldHit.toLocaleString()} shield damage!`,
          squad: prev.squad.map((m) =>
            m.userId === "u-1"
              ? { ...m, shieldDamage: m.shieldDamage + shieldHit }
              : m
          ),
        };
      }

      if (prev.currentPhase === 2) {
        const dmg = Math.min(prev.currentHp, 650_000);
        const nextHp = prev.currentHp - dmg;
        const nextPhase: 1 | 2 | 3 = nextHp <= prev.maxHp * 0.35 ? 3 : 2;
        return {
          ...prev,
          currentHp: nextHp,
          currentPhase: nextPhase,
          combatLog:
            "CRITICAL O(N) REFACTOR! 650,000 core damage dealt — The Memory Leak Hydra enters Phase III ENRAGE!",
          squad: prev.squad.map((m) =>
            m.userId === "u-1" ? { ...m, totalDamage: m.totalDamage + dmg } : m
          ),
        };
      }

      const lethal = prev.currentHp;
      const updatedSquad = prev.squad.map((m) =>
        m.userId === "u-1"
          ? { ...m, totalDamage: m.totalDamage + lethal, isMvp: true }
          : m
      );
      return {
        ...prev,
        currentHp: 0,
        status: "VICTORY",
        combatLog:
          "BOSS DEFEATED! Concurrency deadlock patched — Most Valuable Programmer (MVP) awarded to Itssonia7!",
        squad: updatedSquad,
      };
    });
  };

  const hpPct = Math.max(0, Math.round((raid.currentHp / raid.maxHp) * 100));
  const shieldPct = Math.max(
    0,
    Math.round((raid.currentShield / raid.maxShield) * 100)
  );
  const mins = Math.floor(raid.remainingSeconds / 60);
  const secs = String(raid.remainingSeconds % 60).padStart(2, "0");
  const activePhaseMeta = PHASE_METADATA[raid.currentPhase];

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6 text-zinc-100">
      {/* Boss Header & Animated Health / Shield Bars */}
      <section
        data-testid="raid-boss-header"
        className={`rounded-2xl border border-rose-500/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-rose-950/30 p-6 shadow-xl transition-transform ${
          isShaking ? "animate-bounce" : ""
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
              <Skull className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {raid.bossName}
                </h1>
                <span className="rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold text-rose-300">
                  Phase {raid.currentPhase} / 3
                </span>
              </div>
              <p className="text-xs text-zinc-400">{raid.bossTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-2">
            <Clock className="h-4 w-4 text-amber-400" />
            <div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-400">
                Enrage Wipe Timer
              </div>
              <div
                data-testid="raid-enrage-timer"
                className="font-mono text-lg font-bold text-amber-300"
              >
                {mins}:{secs}
              </div>
            </div>
          </div>
        </div>

        {/* Shield Bar */}
        <div className="mt-5 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-cyan-300">
              <Shield className="h-3.5 w-3.5" />
              Syntax & Lint Aegis Shield
            </span>
            <span data-testid="raid-shield-readout" className="font-mono text-cyan-200">
              {raid.currentShield.toLocaleString()} / {raid.maxShield.toLocaleString()} ({shieldPct}%)
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-cyan-400 transition-all duration-300"
              style={{ width: `${shieldPct}%` }}
            />
          </div>
        </div>

        {/* Boss Core HP Bar */}
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-rose-300">
              <Flame className="h-3.5 w-3.5" />
              Boss Core Integrity HP
            </span>
            <span data-testid="raid-hp-readout" className="font-mono text-rose-200">
              {raid.currentHp.toLocaleString()} / {raid.maxHp.toLocaleString()} ({hpPct}%)
            </span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-rose-600 to-amber-500 transition-all duration-300"
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>

        {/* Boss Spell Casting Bar */}
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
              Boss Spell: Recursive Stack Overflow
            </span>
            <span className="font-mono text-amber-300">Casting... (62%)</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-amber-500 transition-all duration-300 animate-pulse"
              style={{ width: "62%" }}
            />
          </div>
        </div>

        <p
          data-testid="raid-combat-log"
          className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-300"
        >
          {raid.combatLog}
        </p>
      </section>

      {/* Main Arena Grid: Refactoring Editor + 4-Player Co-Op Squad */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">
                {activePhaseMeta.title}
              </h2>
              <p className="text-xs text-zinc-400">{activePhaseMeta.prompt}</p>
            </div>
            <span className="rounded-md bg-indigo-500/20 px-2.5 py-1 text-xs font-medium text-indigo-300">
              {activePhaseMeta.badge}
            </span>
          </div>

          <textarea
            aria-label="Raid Refactoring Patch Editor"
            value={codeDraft}
            onChange={(e) => setCodeDraft(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 font-mono text-xs text-emerald-300 focus:border-indigo-500 focus:outline-none"
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              Objective: <strong className="text-zinc-200">{activePhaseMeta.objective}</strong>
            </span>
            <button
              type="button"
              onClick={handleExecuteRefactorStrike}
              disabled={raid.status !== "ACTIVE"}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
            >
              <Swords className="h-4 w-4" />
              {raid.status === "VICTORY"
                ? "Boss Defeated!"
                : "Execute Refactor Strike"}
            </button>
          </div>
        </section>

        {/* 4-Player Co-Op Squad Contributions */}
        <aside className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-indigo-400" />
              4-Player Raid Squad
            </h2>
            <span className="text-xs text-zinc-400">{raid.squad.length}/4 Online</span>
          </div>

          <div className="space-y-2.5">
            {raid.squad.map((member) => (
              <div
                key={member.userId}
                className="rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    @{member.username}
                  </span>
                  {member.isMvp ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      <Trophy className="h-3 w-3" /> MVP
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-400">{member.role}</span>
                  )}
                </div>
                <div className="mt-1.5 flex justify-between font-mono text-[11px] text-zinc-400">
                  <span>Shield: {member.shieldDamage.toLocaleString()}</span>
                  <span>HP DMG: {member.totalDamage.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          {raid.status === "VICTORY" && (
            <div
              data-testid="raid-victory-banner"
              className="mt-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-200"
            >
              <div className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Raid Victory • Bonus Loot Distributed
              </div>
            </div>
          )}

          {raid.status === "WIPED" && (
            <div
              data-testid="raid-wipe-banner"
              className="mt-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200"
            >
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                Enraged Wipe • Boss Survived
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
