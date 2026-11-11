"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Package, PackageOpen, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Challenge } from "@/types";

// ===========================
// Constants
// ===========================

const CONFETTI_COLORS = ["#fbbf24", "#f59e0b", "#34d399", "#10b981"];
const CHEST_OPEN_DELAY_MS = 450;
const COUNT_UP_DURATION_MS = 1400;

// ===========================
// Helpers
// ===========================

/** Counts from `from` to `to`. With `animate` false it is simply `to`. */
function useCountUp(from: number, to: number, animate: boolean) {
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (!animate) return;

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / COUNT_UP_DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, from, to]);

  return animate ? value : to;
}

/** Golden and emerald stars. Loaded on demand so it never runs during server rendering. */
async function fireConfetti() {
  try {
    const { default: confetti } = await import("canvas-confetti");
    const base = {
      spread: 360,
      ticks: 70,
      gravity: 0.6,
      decay: 0.94,
      startVelocity: 30,
      colors: CONFETTI_COLORS,
      shapes: ["star" as const],
      zIndex: 100,
      disableForReducedMotion: true,
    };

    confetti({ ...base, particleCount: 40, scalar: 1.2, origin: { x: 0.5, y: 0.4 } });
    window.setTimeout(() => {
      confetti({ ...base, particleCount: 25, scalar: 0.8, origin: { x: 0.5, y: 0.4 } });
    }, 180);
  } catch {
    // The canvas can be unavailable (very old browsers, blocked contexts).
    // The celebration still works without the confetti.
  }
}

// ===========================
// Types
// ===========================

interface ClaimRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: Pick<Challenge, "title" | "xpReward">;
  /** The user's XP before this reward is added. */
  previousXp: number;
}

// ===========================
// Celebration (mounted only while the dialog is open, so it starts fresh each time)
// ===========================

function RewardCelebration({
  onClose,
  challenge,
  previousXp,
}: Omit<ClaimRewardModalProps, "isOpen">) {
  const reduceMotion = useReducedMotion() ?? false;
  const newXp = previousXp + challenge.xpReward;
  const [chestOpened, setChestOpened] = useState(false);
  const chestOpen = reduceMotion || chestOpened;
  const displayedXp = useCountUp(previousXp, newXp, !reduceMotion);

  useEffect(() => {
    if (reduceMotion) return;

    const timer = window.setTimeout(() => {
      setChestOpened(true);
      void fireConfetti();
    }, CHEST_OPEN_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

  const ChestIcon = chestOpen ? PackageOpen : Package;

  return (
    <>
      <DialogHeader className="items-center text-center">
        <motion.div
          animate={
            chestOpened && !reduceMotion
              ? { scale: [1, 1.25, 1], rotate: [0, -6, 6, 0] }
              : { scale: 1, rotate: 0 }
          }
          transition={{ duration: 0.5 }}
          className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-3xl border border-amber-400/30 bg-amber-400/10 shadow-[0_0_40px_-8px_rgba(251,191,36,0.6)]"
        >
          <ChestIcon className="h-12 w-12 text-amber-300" aria-hidden="true" />
        </motion.div>

        <DialogTitle className="mt-4 text-xl font-bold">
          Reward claimed!
        </DialogTitle>
        <DialogDescription className="text-slate-400">
          You completed &quot;{challenge.title}&quot;.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-4 py-1.5 text-sm font-bold text-amber-400">
          <Zap className="h-4 w-4" aria-hidden="true" />+{challenge.xpReward} XP
        </div>

        <p className="text-xs uppercase tracking-wider text-slate-500">
          Total XP
        </p>
        <p
          aria-hidden="true"
          className="text-4xl font-extrabold tabular-nums text-emerald-300"
        >
          {displayedXp.toLocaleString()}
        </p>
        <p className="sr-only" role="status">
          Total XP went from {previousXp.toLocaleString()} to{" "}
          {newXp.toLocaleString()}.
        </p>
      </div>

      <Button
        onClick={onClose}
        className="w-full bg-gradient-to-r from-amber-500 to-emerald-500 font-semibold text-black hover:from-amber-400 hover:to-emerald-400"
      >
        Awesome!
      </Button>
    </>
  );
}

// ===========================
// Component
// ===========================

export function ClaimRewardModal({
  isOpen,
  onClose,
  challenge,
  previousXp,
}: ClaimRewardModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-[28px] sm:max-w-md border border-white/10 bg-[#0B0F19]/95 p-8 text-center text-white shadow-2xl backdrop-blur-xl">
        <RewardCelebration
          onClose={onClose}
          challenge={challenge}
          previousXp={previousXp}
        />
      </DialogContent>
    </Dialog>
  );
}
