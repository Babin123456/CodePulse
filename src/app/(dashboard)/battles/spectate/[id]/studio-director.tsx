'use client';

import React, { useState, useEffect } from 'react';
import { Camera, Eye, Zap, Flame, Sliders } from 'lucide-react';
import { evaluateDirectorFocus, DirectorTelemetry } from '@/lib/director-ai';

interface StudioDirectorProps {
  battleId: string;
  initialPlayers?: DirectorTelemetry[];
  className?: string;
}

export const StudioDirector: React.FC<StudioDirectorProps> = ({
  battleId,
  initialPlayers = [
    {
      userId: 'p1',
      username: 'CodeNinja',
      cpm: 280,
      testCasesPassed: 4,
      totalTestCases: 5,
      timeRemainingSeconds: 24,
      recentErrorCount: 0,
    },
    {
      userId: 'p2',
      username: 'AlgoMaster',
      cpm: 190,
      testCasesPassed: 3,
      totalTestCases: 5,
      timeRemainingSeconds: 24,
      recentErrorCount: 1,
    },
  ],
  className = '',
}) => {
  const [players, setPlayers] = useState<DirectorTelemetry[]>(initialPlayers);
  const [manualOverride, setManualOverride] = useState<string | undefined>(undefined);
  const [decision, setDecision] = useState(() => evaluateDirectorFocus(initialPlayers));

  useEffect(() => {
    const res = evaluateDirectorFocus(players, manualOverride);
    setDecision(res);
  }, [players, manualOverride]);

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-md p-6 shadow-2xl space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-white">Esports Broadcast Director AI</h3>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
            Automated Switching
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setManualOverride(undefined)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              !manualOverride
                ? 'bg-indigo-600 text-white'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Auto Director
          </button>
        </div>
      </div>

      {/* Director Live Focus Status */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/20">
            <Flame className="w-5 h-5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Active Camera Focus</div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>{players.find((p) => p.userId === decision.focusedUserId)?.username || 'None'}</span>
              <span className="text-xs font-normal text-indigo-300">({decision.focusReason})</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Hype Intensity</div>
          <div className="text-base font-bold text-amber-400">{decision.hypeScore}%</div>
        </div>
      </div>

      {/* Manual Switcher Controls */}
      <div className="space-y-2">
        <span className="text-xs text-slate-400 font-medium">Manual Camera Overrides:</span>
        <div className="grid grid-cols-2 gap-2">
          {players.map((p) => (
            <button
              key={p.userId}
              onClick={() => setManualOverride(p.userId)}
              className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                decision.focusedUserId === p.userId
                  ? 'border-indigo-500/50 bg-indigo-500/10 text-white'
                  : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.04] text-slate-400'
              }`}
            >
              <div>
                <div className="font-semibold text-xs text-white">{p.username}</div>
                <div className="text-[11px] text-slate-400">{p.cpm} CPM • Tests: {p.testCasesPassed}/{p.totalTestCases}</div>
              </div>
              <Eye className="w-4 h-4 text-indigo-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
