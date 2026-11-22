"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Users,
  Compass,
  Sliders,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

export interface SpatialParticipant {
  id: string;
  name: string;
  avatar: string;
  x: number; // -100 to 100 pan
  y: number; // -100 to 100 distance
  isSpeaking: boolean;
  volume: number;
}

export interface SpatialAudioRoomProps {
  roomId?: string;
  initialParticipants?: SpatialParticipant[];
}

export function SpatialAudioRoom({
  roomId = "war-room-alpha",
  initialParticipants = [
    { id: "p1", name: "Alex (Captain)", avatar: "https://github.com/identicons/alex.png", x: -40, y: 30, isSpeaking: true, volume: 85 },
    { id: "p2", name: "Sarah (Backend)", avatar: "https://github.com/identicons/sarah.png", x: 45, y: -20, isSpeaking: false, volume: 70 },
    { id: "p3", name: "Chen (DevOps)", avatar: "https://github.com/identicons/chen.png", x: 0, y: 60, isSpeaking: false, volume: 90 },
  ],
}: SpatialAudioRoomProps) {
  const [participants, setParticipants] = useState<SpatialParticipant[]>(initialParticipants);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isDeafened, setIsDeafened] = useState<boolean>(false);
  const [selectedParticipant, setSelectedParticipant] = useState<SpatialParticipant | null>(null);

  // Simulated Voice Activity Detection (VAD) loop
  useEffect(() => {
    const interval = setInterval(() => {
      setParticipants((prev) =>
        prev.map((p) => {
          if (p.id === "p1") {
            return { ...p, isSpeaking: Math.random() > 0.4 };
          }
          if (p.id === "p2") {
            return { ...p, isSpeaking: Math.random() > 0.7 };
          }
          return p;
        })
      );
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const handleUpdatePosition = (id: string, x: number, y: number) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, x, y } : p))
    );
  };

  return (
    <div className="flex flex-col border border-border rounded-xl bg-card overflow-hidden shadow-xl w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-3">
          <Radio className="w-5 h-5 text-primary animate-pulse" />
          <h2 className="font-bold text-base text-foreground">3D Spatial Audio & VAD War Room</h2>
          <Badge variant="outline" className="text-xs font-mono">
            {roomId}
          </Badge>
        </div>

        {/* Audio Mute Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isMicMuted ? "destructive" : "outline"}
            onClick={() => {
              setIsMicMuted(!isMicMuted);
              toast.info(isMicMuted ? "Microphone Unmuted" : "Microphone Muted");
            }}
            className="h-8 gap-1.5 text-xs"
          >
            {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            {isMicMuted ? "Muted" : "Mute Mic"}
          </Button>

          <Button
            size="sm"
            variant={isDeafened ? "destructive" : "outline"}
            onClick={() => {
              setIsDeafened(!isDeafened);
              toast.info(isDeafened ? "Audio Restored" : "Deafened");
            }}
            className="h-8 gap-1.5 text-xs"
          >
            {isDeafened ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            {isDeafened ? "Deafened" : "Deafen"}
          </Button>
        </div>
      </div>

      {/* 2D/3D Soundstage Layout Area */}
      <div className="relative p-8 bg-slate-950 flex items-center justify-center min-h-[380px] overflow-hidden">
        {/* Radar concentric rings */}
        <div className="absolute w-72 h-72 rounded-full border border-slate-800/80 pointer-events-none" />
        <div className="absolute w-48 h-48 rounded-full border border-slate-800/60 pointer-events-none" />
        <div className="absolute w-24 h-24 rounded-full border border-slate-800/40 pointer-events-none" />

        {/* Central Listener Avatar (You) */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-primary shadow-[0_0_20px_rgba(59,130,246,0.4)]">
            <Compass className="w-6 h-6 animate-spin-slow" />
          </div>
          <span className="mt-1 text-xs font-bold text-white">Listener (You)</span>
        </div>

        {/* Remote Spatial Participants */}
        {participants.map((p) => {
          const leftPercent = 50 + p.x * 0.4;
          const topPercent = 50 - p.y * 0.4;

          return (
            <div
              key={p.id}
              onClick={() => setSelectedParticipant(p)}
              style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer flex flex-col items-center group z-20"
            >
              <div
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                  p.isSpeaking
                    ? "border-emerald-400 ring-4 ring-emerald-500/30 scale-110 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    : "border-slate-700 bg-slate-900"
                }`}
              >
                <img src={p.avatar} alt={p.name} className="w-full h-full rounded-full" />
              </div>
              <div className="mt-1 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-[10px] text-slate-200 whitespace-nowrap">
                {p.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Participant Panner Controls */}
      {selectedParticipant && (
        <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <Sliders className="w-4 h-4 text-primary" />
            <div>
              <span className="font-semibold text-foreground">{selectedParticipant.name}</span>
              <p className="text-[11px] text-muted-foreground">
                Stereo Pan: {selectedParticipant.x > 0 ? `R +${selectedParticipant.x}` : `L ${selectedParticipant.x}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-60">
            <span className="text-[11px] text-muted-foreground">Vol</span>
            <Slider
              value={[selectedParticipant.volume]}
              max={100}
              step={1}
              onValueChange={([val]) => {
                setParticipants((prev) =>
                  prev.map((p) => (p.id === selectedParticipant.id ? { ...p, volume: val } : p))
                );
              }}
            />
            <span className="text-[11px] font-mono text-muted-foreground w-6">
              {selectedParticipant.volume}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
