'use client';

import React, { useState } from 'react';
import { Play, Pause, RotateCcw, FastForward, Download } from 'lucide-react';

interface ReplayScrubberProps {
  totalDurationMs?: number;
  currentTimestampMs?: number;
  onSeek?: (timestampMs: number) => void;
  onSpeedChange?: (speed: number) => void;
  className?: string;
}

export const ReplayScrubber: React.FC<ReplayScrubberProps> = ({
  totalDurationMs = 120000,
  currentTimestampMs = 0,
  onSeek,
  onSpeedChange,
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [currentProgress, setCurrentProgress] = useState(currentTimestampMs);

  const playbackSpeeds = [0.5, 1, 2, 4, 8];

  const handleSpeedSelect = (s: number) => {
    setSpeed(s);
    onSpeedChange?.(s);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentProgress(val);
    onSeek?.(val);
  };

  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-md p-4 shadow-xl space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shadow"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <span className="text-xs font-mono text-slate-300">
            {formatTime(currentProgress)} / {formatTime(totalDurationMs)}
          </span>
        </div>

        {/* Speed Controls (0.5x, 1x, 2x, 4x, 8x) */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
          {playbackSpeeds.map((s) => (
            <button
              key={s}
              onClick={() => handleSpeedSelect(s)}
              className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition ${
                speed === s
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Scrubber Timeline */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={totalDurationMs}
          value={currentProgress}
          onChange={handleSliderChange}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>
    </div>
  );
};
