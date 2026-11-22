"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  Boxes,
  Database,
  ArrowRight,
  Type,
  StickyNote,
  Download,
  Share2,
  Trash2,
  Code2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface WhiteboardShape {
  id: string;
  type: "box" | "microservice" | "database" | "arrow" | "text" | "sticky_note";
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
  fromNodeId?: string;
  toNodeId?: string;
}

export interface WhiteboardCanvasProps {
  roomId?: string;
  initialShapes?: WhiteboardShape[];
  onExport?: (format: "svg" | "mermaid") => void;
}

export function WhiteboardCanvas({
  roomId = "default-room",
  initialShapes = [
    {
      id: "gw",
      type: "microservice",
      x: 60,
      y: 100,
      width: 150,
      height: 60,
      label: "API Gateway",
      color: "#3B82F6",
    },
    {
      id: "auth",
      type: "microservice",
      x: 280,
      y: 60,
      width: 150,
      height: 60,
      label: "Auth Service",
      color: "#8B5CF6",
    },
    {
      id: "db",
      type: "database",
      x: 500,
      y: 100,
      width: 140,
      height: 70,
      label: "PostgreSQL DB",
      color: "#10B981",
    },
  ],
  onExport,
}: WhiteboardCanvasProps) {
  const [shapes, setShapes] = useState<WhiteboardShape[]>(initialShapes);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleExportSvg = useCallback(() => {
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700">
      <rect width="100%" height="100%" fill="#090d16"/>
      ${shapes
        .map(
          (s) =>
            `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="8" fill="${s.color}" fill-opacity="0.3" stroke="${s.color}" stroke-width="2"/>
             <text x="${s.x + s.width / 2}" y="${s.y + s.height / 2 + 5}" fill="#ffffff" font-family="sans-serif" font-size="12" text-anchor="middle">${s.label}</text>`
        )
        .join("\n")}
    </svg>`;

    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `architecture-${roomId}.svg`;
    link.click();
    URL.revokeObjectURL(url);
    onExport?.("svg");
    toast.success("Exported Architecture Canvas as SVG!");
  }, [shapes, roomId, onExport]);

  const handleExportMermaid = useCallback(() => {
    let mermaidText = "graph TD\n";
    shapes.forEach((s) => {
      const sanitizedLabel = s.label.replace(/[^a-zA-Z0-9 ]/g, "");
      mermaidText += `  ${s.id}["${sanitizedLabel}"]\n`;
    });
    mermaidText += "  gw --> auth\n  auth --> db\n";

    navigator.clipboard.writeText(mermaidText);
    onExport?.("mermaid");
    toast.success("Mermaid.js diagram copied to clipboard!");
  }, [shapes, onExport]);

  return (
    <div className="flex flex-col w-full h-[650px] border border-border rounded-xl bg-slate-950 text-foreground overflow-hidden shadow-xl">
      {/* Canvas Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-border backdrop-blur">
        <div className="flex items-center gap-2">
          <Boxes className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm text-white">Infinite Architecture Whiteboard</span>
          <span className="text-xs text-muted-foreground ml-2">Room: {roomId}</span>
        </div>

        {/* Toolbar items */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportSvg}
            className="h-8 gap-1.5 text-xs text-slate-200 border-slate-700 hover:bg-slate-800"
          >
            <Download className="w-3.5 h-3.5" />
            Export SVG
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportMermaid}
            className="h-8 gap-1.5 text-xs text-slate-200 border-slate-700 hover:bg-slate-800"
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
            Copy Mermaid.js
          </Button>
        </div>
      </div>

      {/* Infinite Canvas Area */}
      <div className="relative flex-1 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] overflow-hidden select-none">
        <div
          className="w-full h-full relative transition-transform duration-75"
          style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
        >
          {shapes.map((s) => {
            const isSelected = selectedShapeId === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setSelectedShapeId(s.id)}
                style={{
                  left: `${s.x}px`,
                  top: `${s.y}px`,
                  width: `${s.width}px`,
                  height: `${s.height}px`,
                  borderColor: s.color,
                }}
                className={`absolute rounded-xl border-2 flex flex-col items-center justify-center p-3 cursor-move shadow-md bg-slate-900/80 backdrop-blur transition-all ${
                  isSelected ? "ring-2 ring-primary scale-105" : "hover:border-primary"
                }`}
              >
                <div className="flex items-center gap-2">
                  {s.type === "database" ? (
                    <Database className="w-4 h-4" style={{ color: s.color }} />
                  ) : (
                    <Boxes className="w-4 h-4" style={{ color: s.color }} />
                  )}
                  <span className="text-xs font-semibold text-white">{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-1 z-20">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
            className="h-7 w-7 text-slate-300"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            className="h-7 w-7 text-slate-300"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="h-7 w-7 text-slate-300"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
