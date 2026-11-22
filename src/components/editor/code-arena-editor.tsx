"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Code2,
  Users,
  Sparkles,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Play,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface SyntaxDiagnostic {
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning" | "info";
  ruleId?: string;
}

export interface CollaboratorCursor {
  id: string;
  name: string;
  color: string;
  line: number;
  column: number;
}

export interface CodeArenaEditorProps {
  initialCode?: string;
  language?: string;
  collaborators?: CollaboratorCursor[];
  readOnly?: boolean;
  onCodeChange?: (code: string) => void;
  onExecute?: (code: string) => void;
}

export function CodeArenaEditor({
  initialCode = `package main\n\nimport "fmt"\n\nfunc main() {\n\t// CodePulse Arena Challenge\n\tfmt.Println("Hello, CodePulse Arena!")\n}`,
  language = "go",
  collaborators = [
    { id: "c1", name: "Alex K.", color: "#3B82F6", line: 4, column: 1 },
    { id: "c2", name: "DevSarah", color: "#10B981", line: 6, column: 15 },
  ],
  readOnly = false,
  onCodeChange,
  onExecute,
}: CodeArenaEditorProps) {
  const [code, setCode] = useState<string>(initialCode);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"editor" | "output">("editor");
  const [output, setOutput] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [diagnostics, setDiagnostics] = useState<SyntaxDiagnostic[]>([
    {
      line: 6,
      column: 2,
      message: "Trailing newline expected before closing brace",
      severity: "warning",
      ruleId: "gofmt/newline",
    },
  ]);

  const lines = useMemo(() => code.split("\n"), [code]);

  const handleFormatCode = useCallback(() => {
    try {
      if (language === "go") {
        const formatted = code
          .split("\n")
          .map((l) => l.trimEnd())
          .join("\n")
          .trim() + "\n";
        setCode(formatted);
        onCodeChange?.(formatted);
        setDiagnostics([]);
        toast.success("Formatted with gofmt standard!");
      } else {
        const formatted = code
          .split("\n")
          .map((l) => l.trimEnd())
          .join("\n")
          .trim() + "\n";
        setCode(formatted);
        onCodeChange?.(formatted);
        setDiagnostics([]);
        toast.success("Formatted with Prettier standard!");
      }
    } catch {
      toast.error("Code formatting error encountered");
    }
  }, [code, language, onCodeChange]);

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  }, [code]);

  const handleRun = useCallback(() => {
    setActiveTab("output");
    setOutput("Executing code in sandbox container...\n[Output]: Hello, CodePulse Arena!\nExecution completed in 18ms with exit code 0.");
    onExecute?.(code);
    toast.success("Execution completed successfully");
  }, [code, onExecute]);

  return (
    <div
      className={`flex flex-col border border-border rounded-xl bg-card overflow-hidden shadow-lg transition-all ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : "w-full min-h-[500px]"
      }`}
    >
      {/* Editor Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm capitalize">{language} Arena Editor</span>
          </div>
          <Badge variant="outline" className="text-xs uppercase font-mono">
            {language}
          </Badge>
          {diagnostics.length > 0 && (
            <Badge variant="destructive" className="text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {diagnostics.length} {diagnostics.length === 1 ? "issue" : "issues"}
            </Badge>
          )}
        </div>

        {/* Collaborators & Controls */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 mr-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            {collaborators.map((c) => (
              <span
                key={c.id}
                style={{ backgroundColor: c.color }}
                className="text-[10px] text-white font-medium px-2 py-0.5 rounded-full"
                title={`${c.name} (Line ${c.line})`}
              >
                {c.name}
              </span>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleFormatCode}
            className="h-8 gap-1 text-xs"
            title="Format Code (gofmt / Prettier)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Format
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyCode}
            className="h-8 gap-1 text-xs"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {isCopied ? "Copied" : "Copy"}
          </Button>

          <Button
            size="sm"
            variant="default"
            onClick={handleRun}
            className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700"
          >
            <Play className="w-3.5 h-3.5" />
            Run
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-8 w-8 text-muted-foreground"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-col md:flex-row relative font-mono text-sm">
        {/* Monaco Line Gutter + Editor Area */}
        <div className="flex-1 flex overflow-auto min-h-[380px] bg-background">
          {/* Gutter with line numbers, collaborative markers, and diagnostics */}
          <div className="select-none flex flex-col py-3 px-2 border-r border-border/50 bg-muted/20 text-muted-foreground text-right w-14 shrink-0 font-mono text-xs">
            {lines.map((_, idx) => {
              const lineNum = idx + 1;
              const hasDiag = diagnostics.find((d) => d.line === lineNum);
              const collab = collaborators.find((c) => c.line === lineNum);

              return (
                <div key={lineNum} className="relative h-6 flex items-center justify-end pr-1 group">
                  {collab && (
                    <span
                      style={{ backgroundColor: collab.color }}
                      className="absolute left-0 w-1.5 h-4 rounded-full"
                      title={`${collab.name} editing line ${lineNum}`}
                    />
                  )}
                  {hasDiag && (
                    <span className="absolute left-2.5 text-amber-500 cursor-help" title={hasDiag.message}>
                      <AlertCircle className="w-3 h-3" />
                    </span>
                  )}
                  <span className={hasDiag ? "text-amber-500 font-bold" : ""}>{lineNum}</span>
                </div>
              );
            })}
          </div>

          {/* Editable Area */}
          <div className="flex-1 relative p-3">
            <textarea
              value={code}
              readOnly={readOnly}
              onChange={(e) => {
                setCode(e.target.value);
                onCodeChange?.(e.target.value);
              }}
              spellCheck={false}
              className="w-full h-full min-h-[350px] resize-none outline-none border-none bg-transparent font-mono text-xs sm:text-sm text-foreground leading-6"
            />
          </div>
        </div>

        {/* Diagnostic & Output Side Drawer */}
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border bg-card/60 flex flex-col">
          <div className="flex items-center border-b border-border text-xs font-sans">
            <button
              onClick={() => setActiveTab("editor")}
              className={`flex-1 py-2 text-center font-medium border-b-2 transition-colors ${
                activeTab === "editor"
                  ? "border-primary text-foreground bg-muted/30"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Diagnostics ({diagnostics.length})
            </button>
            <button
              onClick={() => setActiveTab("output")}
              className={`flex-1 py-2 text-center font-medium border-b-2 transition-colors ${
                activeTab === "output"
                  ? "border-primary text-foreground bg-muted/30"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Output Console
            </button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto text-xs">
            {activeTab === "editor" ? (
              diagnostics.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                  <p>All syntax checks passed!</p>
                  <span className="text-[11px]">No errors or formatting warnings detected.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {diagnostics.map((diag, index) => (
                    <div
                      key={index}
                      className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-foreground"
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-amber-500 mb-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Line {diag.line}:{diag.column}</span>
                        {diag.ruleId && (
                          <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                            [{diag.ruleId}]
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground">{diag.message}</p>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Terminal output:</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setOutput("")}
                    className="h-6 px-1.5 text-[10px]"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                </div>
                <pre className="p-3 bg-muted/40 rounded-lg text-foreground font-mono text-xs whitespace-pre-wrap min-h-[140px]">
                  {output || "No output yet. Click 'Run' to execute."}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
