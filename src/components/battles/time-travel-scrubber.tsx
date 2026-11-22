'use client';

import React, { useState } from 'react';
import { History, Play, Pause, FastForward } from 'lucide-react';

interface TimeTravelScrubberProps {
  eventsCount?: number;
  onTimeTravel?: (seqIndex: number) => void;
  className?: string;
}

export const TimeTravelScrubber: React.FC<TimeTravelScrubberProps> = ({
  eventsCount = 50,
  onTimeTravel,
  className = '',
}) => {
  const [currentIndex, setCurrentIndex] = useState(eventsCount);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentIndex(val);
    onTimeTravel?.(val);
  };

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-md p-4 shadow-xl space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Event Store Time-Travel Scrubber
          </span>
        </div>
        <span className="text-xs font-mono text-indigo-300">
          State at Event #{currentIndex} of {eventsCount}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={eventsCount}
        value={currentIndex}
        onChange={handleSeek}
        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
      />
    </div>
  );
};
