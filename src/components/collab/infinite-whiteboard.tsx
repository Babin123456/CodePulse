'use client';

import React, { useState, useRef } from 'react';
import { Square, Circle, ArrowRight, Download, MousePointer, ZoomIn, ZoomOut } from 'lucide-react';

export interface CanvasShape {
  id: string;
  type: 'rectangle' | 'circle' | 'arrow';
  x: number;
  y: number;
  label: string;
}

export const InfiniteWhiteboard: React.FC<{ roomId?: string; className?: string }> = ({
  roomId = 'main-war-room',
  className = '',
}) => {
  const [shapes, setShapes] = useState<CanvasShape[]>([
    { id: '1', type: 'rectangle', x: 80, y: 80, label: 'API Gateway (NestJS)' },
    { id: '2', type: 'circle', x: 320, y: 80, label: 'Redis Cluster' },
    { id: '3', type: 'rectangle', x: 200, y: 220, label: 'PostgreSQL DB' },
  ]);
  const [zoom, setZoom] = useState(1);
  const [selectedTool, setSelectedTool] = useState<'select' | 'rectangle' | 'circle'>('select');

  const addShape = (type: 'rectangle' | 'circle') => {
    const newShape: CanvasShape = {
      id: String(Date.now()),
      type,
      x: 150 + Math.random() * 50,
      y: 150 + Math.random() * 50,
      label: type === 'rectangle' ? 'Microservice' : 'Cache',
    };
    setShapes([...shapes, newShape]);
  };

  const exportSvg = () => {
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">${shapes
      .map(
        (s) =>
          `<rect x="${s.x}" y="${s.y}" width="120" height="60" rx="8" fill="#1e293b" stroke="#6366f1" stroke-width="2"/><text x="${s.x + 10}" y="${s.y + 35}" fill="#ffffff" font-family="sans-serif" font-size="12">${s.label}</text>`,
      )
      .join('')}</svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whiteboard-${roomId}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-slate-950 flex flex-col overflow-hidden shadow-2xl relative h-[500px] ${className}`}
    >
      {/* Whiteboard Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/90 border border-white/10 backdrop-blur-md shadow-xl">
        <button
          onClick={() => setSelectedTool('select')}
          className={`p-2 rounded-lg text-xs transition ${
            selectedTool === 'select' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <MousePointer className="w-4 h-4" />
        </button>
        <button
          onClick={() => addShape('rectangle')}
          className="p-2 rounded-lg text-xs text-slate-400 hover:text-white transition"
        >
          <Square className="w-4 h-4" />
        </button>
        <button
          onClick={() => addShape('circle')}
          className="p-2 rounded-lg text-xs text-slate-400 hover:text-white transition"
        >
          <Circle className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-white/10 mx-1" />
        <button
          onClick={() => setZoom(Math.min(2, zoom + 0.1))}
          className="p-2 rounded-lg text-xs text-slate-400 hover:text-white"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
          className="p-2 rounded-lg text-xs text-slate-400 hover:text-white"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-white/10 mx-1" />
        <button
          onClick={exportSvg}
          className="p-2 rounded-lg text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
        >
          <Download className="w-4 h-4" />
          <span>Export SVG</span>
        </button>
      </div>

      {/* Infinite Grid Plane */}
      <div
        className="flex-1 w-full h-full relative overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]"
        style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}
      >
        {shapes.map((s) => (
          <div
            key={s.id}
            style={{ left: s.x, top: s.y }}
            className={`absolute px-4 py-3 rounded-xl border border-indigo-500/30 bg-slate-900/90 text-white text-xs font-semibold shadow-lg cursor-move select-none flex items-center justify-center ${
              s.type === 'circle' ? 'rounded-full w-24 h-24 text-center' : 'min-w-[120px]'
            }`}
          >
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
};
