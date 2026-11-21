"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Layout, Monitor, Play, Lock, LucideUnlock, Video, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  studioDirector,
  type PlayerId,
} from "@/lib/battle-director";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";

interface PlayerSpectatorView {
  id: PlayerId;
  username: string;
  avatar: string;
  telemetry: {
    apm: number;
    burstApm: number;
    testProgress: { passed: number; total: number };
    failingTests: number;
    syntaxErrors: number;
    lastEvent: string | null;
  };
}

interface SpectatorMultiViewProps {
  battleId: string;
  player1: PlayerSpectatorView;
  player2: PlayerSpectatorView;
  layout?: "split" | "pip-p1" | "pip-p2" | "auto";
}

const LAYOUTS: { value: "split" | "pip-p1" | "pip-p2"; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "split", label: "Split Screen", icon: Layout },
  { value: "pip-p1", label: "PiP: Player 1", icon: Camera },
  { value: "pip-p2", label: "PiP: Player 2", icon: Camera },
];

export function SpectatorMultiView({
  player1,
  player2,
  layout: layoutProp = "auto",
}: SpectatorMultiViewProps) {
  const [layout, setLayout] = useState<"split" | "pip-p1" | "pip-p2">(
    layoutProp === "auto" ? "split" : layoutProp,
  );
  const [isCaster, setIsCaster] = useState(false);

  // Global hotkey listeners for caster director: '1' -> P1, '2' -> P2, 's' -> Split
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "1") {
        setLayout("pip-p1");
      } else if (e.key === "2") {
        setLayout("pip-p2");
      } else if (e.key.toLowerCase() === "s") {
        setLayout("split");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const activeFocus = studioDirector.getFocus();
  const directorMode = studioDirector.getMode();
  const casterLock = studioDirector.getCasterLock();

  const effectiveLayout =
    layoutProp === "auto"
      ? (activeFocus === "p1" ? "pip-p1" : activeFocus === "p2" ? "pip-p2" : "split")
      : layout;

  const handleSetLayout = useCallback(
    (next: "split" | "pip-p1" | "pip-p2") => {
      setLayout(next);
      if (isCaster) {
        studioDirector.setCasterOverride(null);
      }
    },
    [isCaster],
  );

  const handleLock = useCallback((player: PlayerId | null) => {
    studioDirector.setCasterOverride(player);
    setIsCaster(player !== null);
    if (player) {
      setLayout(player === "p1" ? "pip-p1" : "pip-p2");
    }
  }, []);

  const getPlayerView = (id: PlayerId) =>
    id === "p1" ? player1 : player2;

  const progressPercent = (p: PlayerSpectatorView) => {
    if (p.telemetry.testProgress.total === 0) return 0;
    return Math.round(
      (p.telemetry.testProgress.passed / p.telemetry.testProgress.total) * 100,
    );
  };

  const isFocused = (id: PlayerId) => activeFocus === id;
  const isPipMain = effectiveLayout === `pip-${"p1"}` ? "p1" : effectiveLayout === `pip-${"p2"}` ? "p2" : null;

  return (
    <div className="w-full max-w-6xl mx-auto h-full flex flex-col gap-6">
      {/* Director status bar */}
      <Card className="border border-primary/20 bg-primary/5">
        <CardHeader className="flex flex-row items-center justify-between gap-2 p-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Virtual Director <span className="text-xs font-normal text-muted-foreground ml-1">NSoC&apos;26</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={directorMode === "ai" ? "default" : "outline"}
              className="text-xs px-2 py-1"
            >
              {directorMode === "ai" ? "AI Director" : "Caster Override"}
            </Badge>
            <Badge
              variant={activeFocus === "balanced" ? "secondary" : "default"}
              className="text-xs px-2 py-1"
            >
              Focus: {activeFocus === "balanced" ? "Balanced" : `Player ${activeFocus === "p1" ? "1" : "2"}`}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Multi-view arena */}
      <div
        className={cn(
          "relative h-[640px] rounded-[32px] border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden shadow-2xl transition-all duration-300",
          effectiveLayout === "split" ? "grid grid-cols-2" : "",
        )}
      >
        {effectiveLayout === "split" ? (
          <>
            <PlayerPane
              player={player1}
              isFocused={isFocused("p1")}
              isMain={true}
              progressPercent={progressPercent(player1)}
            />
            <PlayerPane
              player={player2}
              isFocused={isFocused("p2")}
              isMain={true}
              progressPercent={progressPercent(player2)}
            />
          </>
        ) : (
          <>
            {isPipMain === "p1" || isPipMain === "p2" ? (
              <>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "absolute inset-0 z-10 flex items-center justify-center bg-black/60",
                    isPipMain === "p1" ? "" : "",
                  )}
                >
                  <PlayerPane
                    player={getPlayerView(isPipMain!)}
                    isFocused={isFocused(isPipMain!)}
                    isMain={true}
                    progressPercent={progressPercent(getPlayerView(isPipMain!))}
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 0.85 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.3 }}
                  className="absolute bottom-6 right-6 z-20 w-80 h-60 rounded-[20px] border-2 border-white/20 bg-black/40 backdrop-blur overflow-hidden shadow-xl"
                >
                  <PlayerPane
                    player={getPlayerView(isPipMain === "p1" ? "p2" : "p1")}
                    isFocused={isFocused(isPipMain === "p1" ? "p2" : "p1")}
                    isMain={false}
                    progressPercent={progressPercent(getPlayerView(isPipMain === "p1" ? "p2" : "p1"))}
                    pip
                  />
                </motion.div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Video className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Waiting for battle to commence</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Caster controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Layout</span>
          <ToggleGroup
            value={[layout]}
            onValueChange={(vals) => {
              const v = vals?.[0];
              if (v) handleSetLayout(v as "split" | "pip-p1" | "pip-p2");
            }}
            className="bg-black/30 border border-white/10 backdrop-blur-sm"
          >
            {LAYOUTS.map((l) => (
              <ToggleGroupItem
                key={l.value}
                value={l.value}
                className="text-xs px-2 py-1.5"
              >
                <l.icon className="w-3 h-3 mr-1" /> {l.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <Separator orientation="vertical" className="h-4 mx-2" />

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Caster</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleLock("p1")}
            disabled={directorMode === "caster_override" && casterLock === "p1"}
            className={cn("text-xs px-2 py-1.5", casterLock === "p1" && "bg-primary text-primary-foreground")}
          >
            <Lock className="w-3 h-3 mr-1" /> Lock P1
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleLock("p2")}
            disabled={directorMode === "caster_override" && casterLock === "p2"}
            className={cn("text-xs px-2 py-1.5", casterLock === "p2" && "bg-primary text-primary-foreground")}
          >
            <Lock className="w-3 h-3 mr-1" /> Lock P2
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleLock(null)}
            disabled={directorMode === "ai"}
            className="text-xs px-2 py-1.5"
          >
            <LucideUnlock className="w-3 h-3 mr-1" /> Release to AI
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {directorMode === "caster_override" && casterLock && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
          >
            <Card className="border border-primary bg-primary/90 text-primary-foreground">
              <CardContent className="p-3 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Caster override locked on Player {casterLock === "p1" ? "1" : "2"} — AI director paused
                </span>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlayerPane({
  player,
  isFocused,
  isMain,
  progressPercent,
  pip = false,
}: {
  player: PlayerSpectatorView;
  isFocused: boolean;
  isMain: boolean;
  progressPercent: number;
  pip?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: pip ? 0.9 : 1 }}
      animate={{
        opacity: 1,
        scale: pip ? 0.85 : 1,
        rotate: pip ? -2 : 0,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "relative flex flex-col h-full overflow-hidden",
        pip ? "p-3" : "p-6",
        isFocused && "ring-2 ring-primary ring-offset-1 ring-offset-black/40 shadow-[0_0_40px_rgba(99,102,241,0.35)]",
        !isMain && "opacity-70",
      )}
    >
      <div className={cn("flex items-center justify-between mb-2", pip ? "mb-1" : "mb-4")}>
        <div className="flex items-center gap-2">
          <img
            src={player.avatar}
            alt={player.username}
            className={cn("rounded-full border border-white/20", pip ? "w-8 h-8" : "w-12 h-12")}
          />
          <div>
            <div className={cn("font-bold", pip ? "text-xs" : "text-sm")}>{player.username}</div>
            <div className={cn("text-[10px] text-muted-foreground", pip ? "" : "mt-0.5")}>
              APM {player.telemetry.apm} · Burst {player.telemetry.burstApm}
            </div>
          </div>
        </div>
        {player.telemetry.lastEvent && (
          <Badge variant="destructive" className="text-[10px] px-2 py-1">
            {player.telemetry.lastEvent.replace(/_/g, " ").toUpperCase()}
          </Badge>
        )}
      </div>

      <div className={cn("flex-1 relative", pip ? "h-20" : "h-full")}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn("text-center", pip ? "text-xs" : "text-lg")}>
            <Play className={cn("mb-2 block mx-auto", pip ? "w-4 h-4" : "w-6 h-6")} />
            <div className={cn("font-mono text-muted-foreground", pip ? "text-[10px]" : "text-sm")}>
              Live Feed
            </div>
          </div>
        </div>
      </div>

      <div className={cn("mt-3", pip ? "mt-1" : "mt-6")}>
        <div className="flex items-center justify-between mb-1">
          <span className={cn("text-[10px] font-medium text-muted-foreground", pip ? "" : "text-sm")}>
            Test Progress
          </span>
          <span className={cn("text-[10px] font-mono font-bold", pip ? "text-[10px]" : "text-xs")}>
            {player.telemetry.testProgress.passed}/{player.telemetry.testProgress.total}
          </span>
        </div>
        <Progress
          value={progressPercent}
          className={cn(pip ? "h-1.5" : "h-3")}
        />
        <div className={cn("flex justify-between mt-1", pip ? "mt-0.5" : "mt-1")}>
          <span className={cn("text-[10px] text-muted-foreground", pip ? "" : "text-xs")}>
            Passed {player.telemetry.testProgress.passed}
          </span>
          <span className={cn("text-[10px] text-destructive font-medium", pip ? "" : "text-xs")}>
            Failing {player.telemetry.failingTests}
          </span>
          <span className={cn("text-[10px] text-muted-foreground", pip ? "" : "text-xs")}>
            Syntax Errors {player.telemetry.syntaxErrors}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
