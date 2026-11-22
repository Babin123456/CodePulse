"use client";

import React, { useState } from "react";
import {
  Bot,
  Send,
  Sparkles,
  Code2,
  Bookmark,
  ChevronRight,
  Maximize2,
  X,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export interface TutorMessage {
  id: string;
  sender: "tutor" | "user";
  text: string;
  highlightAnchor?: {
    lineStart: number;
    lineEnd: number;
    codeSnippet: string;
  };
  timestamp: string;
}

export interface AiTutorDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  onHighlightLine?: (lineStart: number, lineEnd: number) => void;
}

export function AiTutorDrawer({
  isOpen = true,
  onClose,
  onHighlightLine,
}: AiTutorDrawerProps) {
  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      id: "m1",
      sender: "tutor",
      text: "Hello! I am your AI Code Tutor. I noticed an opportunity to optimize your two-pointer partition in line 14 to avoid O(N^2) worst-case time complexity.",
      highlightAnchor: {
        lineStart: 12,
        lineEnd: 16,
        codeSnippet: "for (let i = 0; i < n; i++) {\n  for (let j = i + 1; j < n; j++) { ... }",
      },
      timestamp: "18:42",
    },
  ]);
  const [input, setInput] = useState<string>("");

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: TutorMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Automated tutor response
    setTimeout(() => {
      const tutorReply: TutorMessage = {
        id: `t-${Date.now()}`,
        sender: "tutor",
        text: "Great question! Using a sliding window or hash map here reduces space complexity to O(1) while guaranteeing O(N) linear time.",
        highlightAnchor: {
          lineStart: 14,
          lineEnd: 15,
          codeSnippet: "const seen = new Map();",
        },
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, tutorReply]);
    }, 700);
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col w-full max-w-md h-[550px] border border-border rounded-xl bg-card overflow-hidden shadow-2xl">
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-sm text-foreground">AI Code Tutor Assistant</h3>
          <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
            Streaming
          </Badge>
        </div>

        {onClose && (
          <Button size="icon" variant="ghost" onClick={onClose} className="h-7 w-7">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Message Chat History */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-background/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                msg.sender === "user"
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-muted/60 text-foreground border border-border rounded-bl-none shadow-sm"
              }`}
            >
              <p>{msg.text}</p>

              {msg.highlightAnchor && (
                <div
                  onClick={() => {
                    onHighlightLine?.(
                      msg.highlightAnchor!.lineStart,
                      msg.highlightAnchor!.lineEnd
                    );
                    toast.info(
                      `Jumped to Lines ${msg.highlightAnchor!.lineStart}-${msg.highlightAnchor!.lineEnd}`
                    );
                  }}
                  className="mt-2.5 p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px] cursor-pointer hover:border-primary transition-colors group"
                >
                  <div className="flex items-center justify-between text-muted-foreground text-[10px] mb-1">
                    <span className="flex items-center gap-1 text-primary">
                      <Code2 className="w-3 h-3" />
                      Lines {msg.highlightAnchor.lineStart}-{msg.highlightAnchor.lineEnd}
                    </span>
                    <span className="group-hover:text-primary transition-colors">Click to inspect</span>
                  </div>
                  <pre className="text-white/90 truncate">{msg.highlightAnchor.codeSnippet}</pre>
                </div>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}
      </div>

      {/* Input Composer */}
      <div className="p-3 bg-muted/20 border-t border-border flex items-center gap-2">
        <Input
          placeholder="Ask a question about the code..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="h-9 text-xs bg-background"
        />
        <Button size="icon" onClick={handleSend} className="h-9 w-9 shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
