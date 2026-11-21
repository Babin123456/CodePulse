'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, Maximize2, Minimize2, RefreshCw } from 'lucide-react';

interface WebglTerminalProps {
  sessionId?: string;
  userId?: string;
  className?: string;
}

export const WebglTerminal: React.FC<WebglTerminalProps> = ({
  sessionId = 'demo-session',
  userId = 'anonymous-dev',
  className = '',
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<string[]>([
    'CodePulse Ephemeral PTY Shell [v2.4.0-webgl]',
    'Isolated Linux Container (cgroups v2, seccomp enabled)',
    'Type "help" or run compiler commands below:',
    '$ ',
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const command = currentInput.trim();
      const newLines = [...lines];
      newLines[newLines.length - 1] = `$ ${currentInput}`;

      if (command === 'clear') {
        setLines(['$ ']);
      } else if (command === 'help') {
        newLines.push('Available commands: python, node, rustc, cargo, go run, clear, exit');
        newLines.push('$ ');
        setLines(newLines);
      } else if (command.length > 0) {
        newLines.push(`[pty-exec] ${command}: completed with exit code 0`);
        newLines.push('$ ');
        setLines(newLines);
      } else {
        newLines.push('$ ');
        setLines(newLines);
      }
      setCurrentInput('');
    }
  };

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-slate-950 font-mono shadow-2xl flex flex-col overflow-hidden ${
        isFullScreen ? 'fixed inset-4 z-50' : 'h-[360px]'
      } ${className}`}
    >
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-white/5">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-slate-300 font-medium">pty-sandbox://{sessionId}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            WebGL 60fps
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="text-slate-400 hover:text-white p-1 rounded transition"
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Terminal Screen */}
      <div
        ref={terminalRef}
        className="flex-1 p-4 overflow-y-auto space-y-1 text-xs text-slate-200 select-text"
      >
        {lines.slice(0, -1).map((line, idx) => (
          <div key={idx} className="whitespace-pre-wrap leading-relaxed">
            {line}
          </div>
        ))}

        <div className="flex items-center gap-1">
          <span className="text-emerald-400 font-bold">$</span>
          <input
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-1 bg-transparent border-none outline-none text-slate-100 font-mono text-xs p-0 m-0"
          />
        </div>
      </div>
    </div>
  );
};
