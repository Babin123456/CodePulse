'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, EyeOff, Shuffle, Clock, Zap } from 'lucide-react';

export type PowerUp = 'SYNTAX_SCRAMBLE' | 'SCREEN_FOG' | 'VARIABLE_INVERT' | 'KEY_DELAY';

interface PowerUpDockProps {
  onCastPowerUp?: (powerUp: PowerUp) => void;
  className?: string;
}

export const PowerUpDock: React.FC<PowerUpDockProps> = ({ onCastPowerUp, className = '' }) => {
  const [activeCooldowns, setActiveCooldowns] = useState<Record<string, number>>({});

  const powerUps: Array<{ id: PowerUp; name: string; icon: any; color: string; desc: string }> = [
    {
      id: 'SYNTAX_SCRAMBLE',
      name: 'Syntax Scramble',
      icon: Shuffle,
      color: 'from-amber-500 to-orange-500',
      desc: 'Temporarily swaps bracket pairs in enemy editor',
    },
    {
      id: 'SCREEN_FOG',
      name: 'Screen Fog',
      icon: EyeOff,
      color: 'from-purple-500 to-indigo-500',
      desc: 'Blur opponent editor code for 5 seconds',
    },
    {
      id: 'VARIABLE_INVERT',
      name: 'Variable Invert',
      icon: Sparkles,
      color: 'from-pink-500 to-rose-500',
      desc: 'Alters variable color highlighting',
    },
  ];

  const handleCast = (id: PowerUp) => {
    if (activeCooldowns[id]) return;
    setActiveCooldowns((prev) => ({ ...prev, [id]: 30 }));
    onCastPowerUp?.(id);

    const interval = setInterval(() => {
      setActiveCooldowns((prev) => {
        const remaining = (prev[id] || 0) - 1;
        if (remaining <= 0) {
          clearInterval(interval);
          const next = { ...prev };
          delete next[id];
          return next;
        }
        return { ...prev, [id]: remaining };
      });
    }, 1000);
  };

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-md p-4 shadow-xl flex items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-amber-400" />
        <span className="text-xs font-bold text-white uppercase tracking-wider">Battle Power-Ups</span>
      </div>

      <div className="flex items-center gap-3">
        {powerUps.map((p) => {
          const Icon = p.icon;
          const cooldown = activeCooldowns[p.id];
          const isOnCooldown = Boolean(cooldown);

          return (
            <button
              key={p.id}
              onClick={() => handleCast(p.id)}
              disabled={isOnCooldown}
              title={`${p.name}: ${p.desc}`}
              className={`relative px-3 py-2 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.08] transition flex items-center gap-2 text-xs text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <div className={`p-1.5 rounded-lg bg-gradient-to-br ${p.color}`}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span>{p.name}</span>
              {isOnCooldown && (
                <span className="text-[10px] text-amber-400 font-mono font-bold">({cooldown}s)</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
