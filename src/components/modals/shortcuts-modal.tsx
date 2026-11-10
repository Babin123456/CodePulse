"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Keyboard, X, Command, Compass, Layout, Sliders } from "lucide-react";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  title: string;
  icon: any;
  shortcuts: ShortcutItem[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: "Navigation",
    icon: Compass,
    shortcuts: [
      { keys: ["Ctrl / ⌘", "K"], description: "Open Command Palette" },
      { keys: ["G", "then", "D"], description: "Navigate to Dashboard" },
      { keys: ["G", "then", "A"], description: "Navigate to Analytics" },
      { keys: ["G", "then", "L"], description: "Navigate to Leaderboard" },
      { keys: ["G", "then", "B"], description: "Navigate to Battles" },
      { keys: ["G", "then", "S"], description: "Navigate to Settings" },
    ],
  },
  {
    title: "Interface & Controls",
    icon: Layout,
    shortcuts: [
      { keys: ["Ctrl / ⌘", "B"], description: "Toggle Desktop Sidebar collapse" },
      { keys: ["Ctrl / ⌘", "Shift", "L"], description: "Toggle Dark / Light theme" },
      { keys: ["Alt", "S"], description: "Swap developers in Compare view" },
    ],
  },
  {
    title: "General & Help",
    icon: Sliders,
    shortcuts: [
      { keys: ["?"], description: "Show this Keyboard Shortcuts Guide" },
      { keys: ["Esc"], description: "Close active modal, drawer, or palette" },
    ],
  },
];

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl bg-[#09090b] border border-white/10 shadow-2xl overflow-hidden relative"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-modal-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="shortcuts-modal-title" className="text-lg font-bold text-white">
                    Keyboard Shortcuts
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Power-user navigation and interface commands
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close shortcuts guide"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content List */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6 custom-scrollbar">
              {SHORTCUT_CATEGORIES.map((category) => {
                const Icon = category.icon;
                return (
                  <div key={category.title} className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                      <Icon className="w-3.5 h-3.5" />
                      {category.title}
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
                      {category.shortcuts.map((sc, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-4 py-3 text-sm"
                        >
                          <span className="text-slate-300 font-medium">
                            {sc.description}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {sc.keys.map((k, kIdx) => (
                              <kbd
                                key={kIdx}
                                className="px-2 py-1 rounded-lg border border-white/15 bg-white/[0.05] text-[11px] font-mono font-semibold text-slate-200 shadow-sm"
                              >
                                {k}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer tip */}
            <div className="p-4 border-t border-white/[0.06] bg-white/[0.02] flex items-center justify-between text-xs text-muted-foreground">
              <span>Press <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 font-mono text-[10px]">?</kbd> anytime to open this cheatsheet</span>
              <span>Press <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 font-mono text-[10px]">Esc</kbd> to dismiss</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
