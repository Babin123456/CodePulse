"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Flame,
  GitPullRequest,
  Eye,
  Target,
  Zap,
  Calendar,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  calculateXPForDifficulty,
  createCustomChallengeObject,
  saveCustomChallenge,
  validateCustomQuestInput,
  type CustomChallenge,
  type MetricType,
  type QuestDifficulty,
  type QuestDurationDays,
  type ValidationErrors,
} from "@/lib/custom-challenges";

interface CreateCustomChallengeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuestCreated?: (quest: CustomChallenge) => void;
}

const METRICS: { type: MetricType; label: string; icon: React.ElementType }[] = [
  { type: "Commits", label: "Commits", icon: Flame },
  { type: "PRs", label: "Pull Requests", icon: GitPullRequest },
  { type: "Code Reviews", label: "Code Reviews", icon: Eye },
  { type: "Stars", label: "Stars Earned", icon: Target },
];

const DURATIONS: { days: QuestDurationDays; label: string }[] = [
  { days: 3, label: "3 Days" },
  { days: 7, label: "7 Days" },
  { days: 14, label: "14 Days" },
];

const DIFFICULTIES: {
  level: QuestDifficulty;
  label: string;
  desc: string;
  color: string;
}[] = [
  {
    level: "easy",
    label: "Easy",
    desc: "Light challenge",
    color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  },
  {
    level: "medium",
    label: "Medium",
    desc: "Standard sprint",
    color: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  },
  {
    level: "hard",
    label: "Hard",
    desc: "Intensive push",
    color: "border-purple-500/30 text-purple-400 bg-purple-500/10",
  },
];

export function CreateCustomChallengeModal({
  open,
  onOpenChange,
  onQuestCreated,
}: CreateCustomChallengeModalProps) {
  const [title, setTitle] = useState("");
  const [metricType, setMetricType] = useState<MetricType>("Commits");
  const [target, setTarget] = useState<number>(10);
  const [durationDays, setDurationDays] = useState<QuestDurationDays>(7);
  const [difficulty, setDifficulty] = useState<QuestDifficulty>("medium");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculatedXP = calculateXPForDifficulty(difficulty);

  const handleReset = () => {
    setTitle("");
    setMetricType("Commits");
    setTarget(10);
    setDurationDays(7);
    setDifficulty("medium");
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const input = {
      title,
      metricType,
      target: Number(target),
      durationDays,
      difficulty,
    };

    const validation = validateCustomQuestInput(input);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setIsSubmitting(true);
      const quest = createCustomChallengeObject(input);
      saveCustomChallenge(quest);

      toast.success("Custom quest created successfully.");
      onQuestCreated?.(quest);
      handleReset();
      onOpenChange(false);
    } catch {
      toast.error("Failed to create quest. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) handleReset();
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-[#0d1117] border-white/10 text-slate-100 p-6 rounded-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <DialogTitle className="text-lg font-semibold text-white">
              Create Custom Quest
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-400">
            Define your personal coding sprint goal and track milestone progress.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <label
              htmlFor="quest-title"
              className="text-xs font-medium text-slate-300"
            >
              Quest Title
            </label>
            <input
              id="quest-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              placeholder="e.g. Hackathon Sprint or Weekend PR Blitz"
              className={cn(
                "w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border text-sm text-white placeholder:text-slate-500 focus:outline-none transition-colors",
                errors.title
                  ? "border-red-500/50 focus:border-red-500"
                  : "border-white/10 focus:border-primary/50"
              )}
            />
            {errors.title && (
              <p className="text-xs text-red-400">{errors.title}</p>
            )}
          </div>

          {/* Metric Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Metric Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {METRICS.map((metric) => {
                const Icon = metric.icon;
                const isSelected = metricType === metric.type;
                return (
                  <button
                    key={metric.type}
                    type="button"
                    onClick={() => {
                      setMetricType(metric.type);
                      if (errors.metricType)
                        setErrors((prev) => ({ ...prev, metricType: undefined }));
                    }}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer",
                      isSelected
                        ? "bg-primary/15 border-primary/40 text-primary ring-1 ring-primary/20"
                        : "bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{metric.label}</span>
                  </button>
                );
              })}
            </div>
            {errors.metricType && (
              <p className="text-xs text-red-400">{errors.metricType}</p>
            )}
          </div>

          {/* Target Count & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Target Count */}
            <div className="space-y-1.5">
              <label
                htmlFor="quest-target"
                className="text-xs font-medium text-slate-300"
              >
                Target Count (1 - 100)
              </label>
              <input
                id="quest-target"
                type="number"
                min={1}
                max={100}
                value={target || ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setTarget(isNaN(val) ? 0 : val);
                  if (errors.target)
                    setErrors((prev) => ({ ...prev, target: undefined }));
                }}
                className={cn(
                  "w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border text-sm text-white placeholder:text-slate-500 focus:outline-none transition-colors",
                  errors.target
                    ? "border-red-500/50 focus:border-red-500"
                    : "border-white/10 focus:border-primary/50"
                )}
              />
              {errors.target && (
                <p className="text-xs text-red-400">{errors.target}</p>
              )}
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Duration
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {DURATIONS.map((dur) => (
                  <button
                    key={dur.days}
                    type="button"
                    onClick={() => {
                      setDurationDays(dur.days);
                      if (errors.durationDays)
                        setErrors((prev) => ({ ...prev, durationDays: undefined }));
                    }}
                    className={cn(
                      "px-2 py-2.5 rounded-xl border text-xs font-medium text-center transition-all cursor-pointer",
                      durationDays === dur.days
                        ? "bg-primary/15 border-primary/40 text-primary ring-1 ring-primary/20"
                        : "bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                    )}
                  >
                    {dur.label}
                  </button>
                ))}
              </div>
              {errors.durationDays && (
                <p className="text-xs text-red-400">{errors.durationDays}</p>
              )}
            </div>
          </div>

          {/* Difficulty & Auto-Calculated XP */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">
                Difficulty
              </label>
              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                Reward: {calculatedXP} XP
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map((diff) => {
                const isSelected = difficulty === diff.level;
                return (
                  <button
                    key={diff.level}
                    type="button"
                    onClick={() => {
                      setDifficulty(diff.level);
                      if (errors.difficulty)
                        setErrors((prev) => ({ ...prev, difficulty: undefined }));
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer",
                      isSelected
                        ? diff.color + " ring-1 ring-white/20 font-semibold"
                        : "bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                    )}
                  >
                    <span className="text-xs capitalize">{diff.label}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      {diff.desc}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.difficulty && (
              <p className="text-xs text-red-400">{errors.difficulty}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-9 px-4 font-semibold"
            >
              {isSubmitting ? "Creating..." : "Create Quest"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
