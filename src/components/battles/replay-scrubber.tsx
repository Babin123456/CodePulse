"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  FastForward,
  History,
  Code2,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface KeystrokeDelta {
  timestampMs: number;
  type: "insert" | "delete" | "replace";
  position: number;
  text: string;
  author: string;
}

export interface ReplayScrubberProps {
  battleId?: string;
  deltas?: KeystrokeDelta[];
  initialCode?: string;
  onCodeScrub?: (reconstructedCode: string, stepIndex: number) => void;
}

export function ReplayScrubber({
  battleId = "battle-xyz",
  initialCode = "function solve() {\n",
  deltas = [
    { timestampMs: 120, type: "insert", position: 19, text: "  let maxVal = 0;\n", author: "P1" },
    { timestampMs: 450, type: "insert", position: 37, text: "  for (let num of arr) {\n", author: "P1" },
    { timestampMs: 820, type: "insert", position: 62, text: "    if (num > maxVal) maxVal = num;\n", author: "P1" },
    { timestampMs: 1150, type: "insert", position: 98, text: "  }\n  return maxVal;\n}\n", author: "P1" },
  ],
  onCodeScrub,
}: ReplayScrubberProps) {
  const [currentStep, setCurrentStep] = useState<number>(deltas.length);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Reconstruct code at currentStep
  const reconstructedCode = useMemo(() => {
    let result = initialCode;
    for (let i = 0; i < currentStep; i++) {
      const delta = deltas[i];
      if (delta.type === "insert") {
        result += delta.text;
      }
    }
    return result;
  }, [initialCode, deltas, currentStep]);

  useEffect(() => {
    onCodeScrub?.(reconstructedCode, currentStep);
  }, [reconstructedCode, currentStep, onCodeScrub]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= deltas.length) {
          setIsPlaying(false);
          toast.info("Replay playback reached the end");
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, deltas.length]);

  return (
    <div className="flex flex-col border border-border rounded-xl bg-card overflow-hidden shadow-lg w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">Keystroke Delta Replay Scrubber</span>
          <Badge variant="outline" className="text-xs font-mono ml-2">
            Step {currentStep}/{deltas.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPlaybackSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}
            className="h-7 text-xs font-mono"
          >
            <FastForward className="w-3 h-3 mr-1" />
            {playbackSpeed}x
          </Button>
        </div>
      </div>

      {/* Code Display Area */}
      <div className="p-4 bg-slate-950 font-mono text-xs text-slate-100 min-h-[220px] max-h-[350px] overflow-auto">
        <pre className="whitespace-pre-wrap leading-5">{reconstructedCode}</pre>
      </div>

      {/* Scrubber Controls */}
      <div className="p-4 bg-muted/20 border-t border-border flex flex-col gap-3">
        {/* Progress Slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-8">0</span>
          <Slider
            value={[currentStep]}
            max={deltas.length}
            step={1}
            onValueChange={([val]) => setCurrentStep(val)}
            className="flex-1 cursor-pointer"
          />
          <span className="text-xs text-muted-foreground w-8 text-right">{deltas.length}</span>
        </div>

        {/* Media Buttons */}
        <div className="flex items-center justify-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setCurrentStep(0)}
            className="h-8 w-8"
            title="Jump to Start"
          >
            <SkipBack className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="default"
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-8 px-4 gap-1.5 bg-primary hover:bg-primary/90"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            {isPlaying ? "Pause" : "Play"}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setCurrentStep(deltas.length)}
            className="h-8 w-8"
            title="Jump to End"
          >
            <SkipForward className="w-4 h-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setCurrentStep(0);
              setIsPlaying(false);
            }}
            className="h-8 w-8"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
