"use client";

import React, { useState, useCallback } from "react";
import {
  Trello,
  Plus,
  MoveRight,
  MoreVertical,
  AlertCircle,
  Clock,
  CheckCircle2,
  Users,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export interface KanbanTask {
  id: string;
  title: string;
  assignee: string;
  priority: "high" | "medium" | "low";
  points: number;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  tasks: KanbanTask[];
}

export interface WarRoomKanbanProps {
  warRoomId?: string;
  initialColumns?: KanbanColumn[];
  onTaskMove?: (taskId: string, targetColId: string) => void;
}

export function WarRoomKanban({
  warRoomId = "raid-war-room-1",
  initialColumns = [
    {
      id: "backlog",
      title: "Tactical Backlog",
      color: "#94A3B8",
      tasks: [
        { id: "t1", title: "Patch memory leak in Redis proxy", assignee: "Alex", priority: "high", points: 8 },
        { id: "t2", title: "Benchmark Groth16 circuit verify", assignee: "Sarah", priority: "medium", points: 5 },
      ],
    },
    {
      id: "in_progress",
      title: "Active Deployment",
      color: "#3B82F6",
      tasks: [
        { id: "t3", title: "Hot-reload etcd cluster configuration", assignee: "You", priority: "high", points: 10 },
      ],
    },
    {
      id: "review",
      title: "Peer Verification",
      color: "#F59E0B",
      tasks: [
        { id: "t4", title: "eBPF socket trace latency regression check", assignee: "Elena", priority: "medium", points: 5 },
      ],
    },
    {
      id: "done",
      title: "Resolved / Shipped",
      color: "#10B981",
      tasks: [
        { id: "t5", title: "Zero-copy streaming pipeline integration", assignee: "Chen", priority: "low", points: 3 },
      ],
    },
  ],
  onTaskMove,
}: WarRoomKanbanProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns);

  const moveTask = useCallback(
    (taskId: string, direction: "next" | "prev") => {
      setColumns((prevCols) => {
        let foundTask: KanbanTask | null = null;
        let fromColIndex = -1;

        prevCols.forEach((col, idx) => {
          const t = col.tasks.find((item) => item.id === taskId);
          if (t) {
            foundTask = t;
            fromColIndex = idx;
          }
        });

        if (!foundTask || fromColIndex === -1) return prevCols;

        const targetColIndex = direction === "next" ? fromColIndex + 1 : fromColIndex - 1;
        if (targetColIndex < 0 || targetColIndex >= prevCols.length) return prevCols;

        const updated = prevCols.map((col, idx) => {
          if (idx === fromColIndex) {
            return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) };
          }
          if (idx === targetColIndex) {
            return { ...col, tasks: [...col.tasks, foundTask!] };
          }
          return col;
        });

        onTaskMove?.(taskId, updated[targetColIndex].id);
        toast.success(`Task shifted to ${updated[targetColIndex].title}`);
        return updated;
      });
    },
    [onTaskMove]
  );

  return (
    <div className="flex flex-col w-full border border-border rounded-xl bg-card overflow-hidden shadow-xl">
      {/* Kanban Header */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-3">
          <Trello className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-base text-foreground">War Room Incident & Sprint Kanban</h2>
          <Badge variant="outline" className="text-xs font-mono">
            Room: {warRoomId}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync Connected
          </span>
        </div>
      </div>

      {/* Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-background/50">
        {columns.map((col, colIdx) => (
          <div
            key={col.id}
            className="flex flex-col rounded-xl border border-border bg-card/80 p-3 shadow-sm min-h-[450px]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <span style={{ backgroundColor: col.color }} className="w-2.5 h-2.5 rounded-full" />
                <h3 className="font-semibold text-sm text-foreground">{col.title}</h3>
              </div>
              <Badge variant="secondary" className="text-xs">
                {col.tasks.length}
              </Badge>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto">
              {col.tasks.map((task) => (
                <Card
                  key={task.id}
                  className="bg-card border-border hover:border-primary/50 transition-all shadow-sm"
                >
                  <CardContent className="p-3.5 space-y-2.5">
                    <p className="text-xs font-medium text-foreground leading-snug">{task.title}</p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-primary" />
                        {task.assignee}
                      </span>
                      <div className="flex items-center gap-1">
                        {colIdx > 0 && (
                          <button
                            onClick={() => moveTask(task.id, "prev")}
                            className="p-1 hover:text-foreground text-muted-foreground"
                            title="Move to previous column"
                          >
                            ←
                          </button>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                          {task.points} pts
                        </span>
                        {colIdx < columns.length - 1 && (
                          <button
                            onClick={() => moveTask(task.id, "next")}
                            className="p-1 hover:text-foreground text-muted-foreground"
                            title="Move to next column"
                          >
                            →
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {col.tasks.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 border border-dashed border-border/60 rounded-lg text-xs text-muted-foreground">
                  No active cards
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
