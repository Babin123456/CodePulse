"use client";

import { useState, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { StaggerContainer, StaggerItem } from "@/components/animations/page-transition";
import { ChallengeCard } from "@/components/cards/challenge-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Flame, Calendar, Trophy, Sparkles, Plus } from "lucide-react";

import { useActiveChallenges } from "@/hooks/api/use-challenges";
import { useCurrentUser } from "@/hooks/api/use-auth";
import {
  getCustomChallenges,
  subscribeToCustomChallenges,
} from "@/lib/custom-challenges";
import { CreateCustomChallengeModal } from "@/components/modals/create-custom-challenge-modal";

const tabs = [
  { id: "all", label: "All", icon: Target },
  { id: "CUSTOM", label: "Custom", icon: Sparkles },
  { id: "DAILY", label: "Daily", icon: Flame },
  { id: "WEEKLY", label: "Weekly", icon: Calendar },
  { id: "MONTHLY", label: "Monthly", icon: Trophy },
  { id: "SEASONAL", label: "Seasonal", icon: Sparkles },
];

export default function ChallengesPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: activeChallengesData, isLoading } = useActiveChallenges();
  const { data: currentUser } = useCurrentUser();
  const currentXp: number = currentUser?.rating?.xp ?? 0;

  const customQuests = useSyncExternalStore(
    subscribeToCustomChallenges,
    getCustomChallenges,
    () => []
  );

  // Map backend format to frontend format temporarily
  const backendChallenges = (activeChallengesData || []).map((c: any) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    type: c.type, // e.g. "DAILY"
    difficulty: c.difficulty.toLowerCase(),
    xpReward: c.xpReward,
    progress: 0,
    target: c.target,
    isCompleted: false,
    expiresAt: c.expiresAt,
    createdAt: c.createdAt,
    icon: c.icon || "Target",
    category: c.category,
    isCustom: false,
  }));

  const allChallenges = [...customQuests, ...backendChallenges];

  const filtered = activeTab === "all"
    ? allChallenges
    : activeTab === "CUSTOM"
    ? allChallenges.filter((c: any) => c.isCustom)
    : allChallenges.filter((c: any) => c.type === activeTab || (c.isCustom && c.type.toUpperCase() === activeTab));

  const active = filtered.filter((c: any) => !c.isCompleted);
  const completed = filtered.filter((c: any) => c.isCompleted);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-white/5 rounded-lg animate-pulse" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-[16px] p-4 text-center space-y-2 animate-pulse">
              <div className="h-7 w-16 mx-auto bg-white/5 rounded" />
              <div className="h-3 w-20 mx-auto bg-white/5 rounded" />
            </div>
          ))}
        </div>

        <div className="h-10 w-80 bg-white/5 rounded-xl animate-pulse" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-[20px] p-5 h-44 animate-pulse space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-white/5 rounded" />
                    <div className="h-3 w-20 bg-white/5 rounded" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-white/5 rounded-full" />
              </div>
              <div className="h-3 w-full bg-white/5 rounded" />
              <div className="h-2 w-full bg-white/5 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Challenges
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete challenges to earn XP and level up
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold transition-all shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Custom Quest</span>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active", value: allChallenges.filter((c: any) => !c.isCompleted).length, color: "text-blue-400" },
          { label: "Completed", value: allChallenges.filter((c: any) => c.isCompleted).length, color: "text-emerald-400" },
          { label: "XP Earned", value: "0", color: "text-amber-400" },
          { label: "Total XP Available", value: allChallenges.reduce((acc: number, c: any) => acc + (c.xpReward || 0), 0), color: "text-purple-400" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-[16px] p-4 text-center"
          >
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList
          className="bg-white/5 border border-white/10 p-1 rounded-xl"
          aria-label="Filter challenges by type"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs gap-1.5"
                aria-label={`${tab.label} challenges`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Challenge results live region */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {active.length} active and {completed.length} completed challenges in the {tabs.find(t => t.id === activeTab)?.label} category.
      </div>

      {/* Active challenges */}
      {active.length > 0 && (
        <section aria-label={`Active ${tabs.find(t => t.id === activeTab)?.label} challenges`}>
          <h2 className="text-lg font-semibold mb-3">Active Challenges</h2>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {active.map((challenge) => (
              <StaggerItem key={challenge.id}>
                <ChallengeCard challenge={challenge} currentXp={currentXp} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section aria-label={`Completed ${tabs.find(t => t.id === activeTab)?.label} challenges`}>
          <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Completed</h2>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completed.map((challenge) => (
              <StaggerItem key={challenge.id}>
                <ChallengeCard challenge={challenge} currentXp={currentXp} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      )}

      {active.length === 0 && completed.length === 0 && (
        <div
          role="status"
          aria-label="No challenges available"
          className="glass-card rounded-[20px] p-12 text-center border border-white/5 space-y-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-muted-foreground">
            <Target className="w-6 h-6" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold">No challenges found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            There are no challenges under the &quot;{tabs.find(t => t.id === activeTab)?.label}&quot; category at this moment. Check back soon!
          </p>
        </div>
      )}

      <CreateCustomChallengeModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}
