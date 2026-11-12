"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Code, Star, GitFork, Search, SortAsc,
  ExternalLink, Calendar, Users, LayoutGrid, List, Activity, Sparkles, Pin, Share2, Scan,
  Filter, X, RotateCcw
} from "lucide-react";
import { useCurrentUser } from "@/hooks/api/use-auth";
import { Loader2 } from "lucide-react";
import { RepoQuickView } from "@/components/modals/repo-quick-view";
import { CopyCloneCommand } from "@/components/repositories/copy-clone-command";

const sortOptions = [
  { id: "stars", label: "Highest Stars" },
  { id: "forks", label: "Most Forks" },
  { id: "updated", label: "Recently Updated" },
  { id: "commits", label: "Most Commits" },
];

const starFilterOptions = [
  { value: 0, label: "All Stars" },
  { value: 10, label: "> 10 ★" },
  { value: 50, label: "> 50 ★" },
  { value: 100, label: "> 100 ★" },
];

export default function RepositoriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("stars");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [repoType, setRepoType] = useState<"all" | "sources" | "forks">("all");
  const [minStars, setMinStars] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [pinnedRepoIds, setPinnedRepoIds] = useState<string[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<any | null>(null);
  const router = useRouter();

  const { data: currentUser, isLoading } = useCurrentUser();

  // Load Pinned from Local Storage
  useEffect(() => {
    const saved = localStorage.getItem("pinnedRepos");
    if (saved) {
      try { setPinnedRepoIds(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const repos = useMemo(() => {
    return (currentUser as any)?.repositories || [];
  }, [currentUser]);

  const languages = useMemo(() => {
    const langs = new Set<string>();
    repos.forEach((r: any) => {
      if (r.language) langs.add(r.language);
    });
    return ["All", ...Array.from(langs)];
  }, [repos]);

  const repoCounts = useMemo(() => {
    let sources = 0;
    let forks = 0;
    repos.forEach((r: any) => {
      if (Boolean(r.fork || r.isFork)) {
        forks++;
      } else {
        sources++;
      }
    });
    return {
      all: repos.length,
      sources,
      forks,
    };
  }, [repos]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedLanguage !== "All") count++;
    if (repoType !== "all") count++;
    if (minStars > 0) count++;
    return count;
  }, [searchQuery, selectedLanguage, repoType, minStars]);

  const handleClearAllFilters = () => {
    setSearchQuery("");
    setSelectedLanguage("All");
    setRepoType("all");
    setMinStars(0);
  };

  const filteredAndSortedRepos = useMemo(() => {
    let result = [...repos];

    // 1. Search Query filter (name or description)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((r: any) =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q))
      );
    }

    // 2. Language filter
    if (selectedLanguage !== "All") {
      result = result.filter((r: any) => r.language === selectedLanguage);
    }

    // 3. Repository Type filter (All | Sources | Forks)
    if (repoType === "sources") {
      result = result.filter((r: any) => !Boolean(r.fork || r.isFork));
    } else if (repoType === "forks") {
      result = result.filter((r: any) => Boolean(r.fork || r.isFork));
    }

    // 4. Minimum Stars filter
    if (minStars > 0) {
      result = result.filter((r: any) => (Number(r.stars) || 0) >= minStars);
    }

    // 5. Sorting
    result.sort((a: any, b: any) => {
      switch (sortBy) {
        case "stars":
          return (b.stars || 0) - (a.stars || 0);
        case "forks":
          return (b.forks || 0) - (a.forks || 0);
        case "commits":
          return (b.commits || 0) - (a.commits || 0);
        case "updated":
          return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [repos, searchQuery, selectedLanguage, repoType, minStars, sortBy]);

  const { pinnedRepos, unpinnedRepos } = useMemo(() => {
    return {
      pinnedRepos: filteredAndSortedRepos.filter(r => pinnedRepoIds.includes(r.id)),
      unpinnedRepos: filteredAndSortedRepos.filter(r => !pinnedRepoIds.includes(r.id)),
    };
  }, [filteredAndSortedRepos, pinnedRepoIds]);

  const totalStars = repos.reduce((sum: number, r: any) => sum + (r.stars || 0), 0);

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedRepoIds(prev => {
      const newPinned = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id].slice(0, 3);
      localStorage.setItem("pinnedRepos", JSON.stringify(newPinned));
      return newPinned;
    });
  };

  const handleShare = (repo: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `Check out my repository ${repo.name}! It has ${repo.stars} ⭐ and ${repo.forks} forks.`;
    const url = repo.url;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const getRankBadge = (r: any) => {
    if (r.stars > 50) return { label: "Legendary", color: "from-amber-400 to-orange-500", shadow: "shadow-amber-500/50" };
    if (r.commits > 100 || r.forks > 10) return { label: "On Fire", color: "from-rose-500 to-pink-500", shadow: "shadow-rose-500/50" };
    if (r.commits > 50 && r.stars < 10) return { label: "Hidden Gem", color: "from-emerald-400 to-teal-500", shadow: "shadow-emerald-500/50" };
    return null;
  };

  const calculateHealthScore = (r: any) => {
    let score = 0;
    if (r.description) score += 30;
    if (r.topics && r.topics.length > 0) score += 30;
    if (r.language) score += 20;
    if (r.commits > 10) score += 20;
    return score;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        <p className="text-sm text-slate-400">Loading repositories...</p>
      </div>
    );
  }

  const renderRepoCard = (repo: any) => {
    const isPinned = pinnedRepoIds.includes(repo.id);
    const badge = getRankBadge(repo);
    const health = calculateHealthScore(repo);
    const isFork = Boolean(repo.fork || repo.isFork);
    
    let healthColor = "text-emerald-400";
    if (health < 50) healthColor = "text-rose-400";
    else if (health < 80) healthColor = "text-amber-400";

    return (
      <motion.div
        key={repo.id}
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        whileHover={{ y: -4, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setSelectedRepo(repo)}
        className={cn(
          "group relative overflow-hidden glass-card rounded-[24px] border border-white/5 transition-all duration-500 cursor-pointer",
          "hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-white/10",
          isPinned ? "bg-white/[0.03] border-white/15" : "",
          viewMode === "list" ? "p-5 sm:p-6 flex flex-col sm:flex-row gap-6 sm:items-center" : "p-6 sm:p-8 flex flex-col h-full"
        )}
        style={{ "--repo-color": repo.languageColor || "rgba(255,255,255,0.1)" } as React.CSSProperties}
      >
        {/* Dynamic Hover Glow */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"
          style={{ background: `radial-gradient(circle at top right, var(--repo-color), transparent 70%)` }}
        />

        {badge && viewMode === "grid" && (
          <div className={`absolute top-4 right-4 px-2.5 py-1 rounded-full bg-gradient-to-r ${badge.color} text-white text-[10px] font-bold uppercase tracking-wider ${badge.shadow} shadow-[0_0_10px] z-10`}>
            {badge.label}
          </div>
        )}

        <div className={cn("flex-1", viewMode === "grid" && "flex flex-col h-full")}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 transition-colors shrink-0"
                style={{ backgroundColor: `${repo.languageColor || '#fff'}15` }}
              >
                <Code className="w-5 h-5" style={{ color: repo.languageColor || "#fff" }} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors flex items-center gap-2">
                  {repo.name}
                  {isFork && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground border border-white/5">
                      <GitFork className="w-2.5 h-2.5" /> Fork
                    </span>
                  )}
                </h3>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Updated {new Date(repo.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  <span className="hidden sm:inline text-white/20">•</span>
                  <span className={cn("hidden sm:flex items-center gap-1 font-semibold", healthColor)}>
                    Health: {health}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className={cn(
            "text-sm text-slate-300 leading-relaxed",
            viewMode === "grid" ? "mb-6 line-clamp-2 flex-1 mt-2" : "mb-4 max-w-2xl"
          )}>
            {repo.description || "No description provided for this repository."}
          </p>

          {repo.topics && repo.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {repo.topics.slice(0, viewMode === "grid" ? 3 : 6).map((topic: string) => (
                <span
                  key={topic}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-slate-300 font-medium"
                >
                  {topic}
                </span>
              ))}
              {repo.topics.length > (viewMode === "grid" ? 3 : 6) && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-muted-foreground">
                  +{repo.topics.length - (viewMode === "grid" ? 3 : 6)}
                </span>
              )}
            </div>
          )}
        </div>

        <div className={cn(
          "flex flex-wrap items-center justify-between gap-y-2 shrink-0",
          viewMode === "grid" ? "pt-4 border-t border-white/5 mt-auto" : "pl-6 border-l border-white/5 gap-6"
        )}>
          <div className="flex items-center gap-4 text-sm">
            {repo.language && (
              <span className="flex items-center gap-2 font-medium">
                <span className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: repo.languageColor }} />
                <span className="text-slate-200">{repo.language}</span>
              </span>
            )}
            <span className="flex items-center gap-1.5 text-amber-400 font-medium bg-amber-400/10 px-2 py-1 rounded-md">
              <Star className="w-4 h-4 fill-amber-400/20" /> {formatNumber(repo.stars)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); router.push(`/repositories/${encodeURIComponent(repo.name)}`); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-violet-500/20 to-blue-500/20 text-violet-300 border border-violet-500/20 hover:from-violet-500/30 hover:to-blue-500/30 transition-all cursor-pointer"
              title="Deep Analysis"
            >
              <Scan className="w-3.5 h-3.5" /> Analyze
            </button>
            <button 
              onClick={(e) => handleShare(repo, e)}
              className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Share Repo"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {repo.fullName && <CopyCloneCommand fullName={repo.fullName} />}
            <button 
              onClick={(e) => togglePin(repo.id, e)}
              className={cn("p-2 rounded-lg transition-colors cursor-pointer", isPinned ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-white hover:bg-white/10")}
              title={isPinned ? "Unpin Repo" : "Pin Repo"}
            >
              <Pin className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-white/5 p-8 sm:p-10">
        <div className="absolute top-0 right-0 p-12 opacity-20 pointer-events-none">
          <Sparkles className="w-32 h-32 text-primary animate-pulse" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 flex items-center gap-3 mb-3">
              <Code className="w-8 h-8 text-primary" />
              Repository Hub
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl">
              Explore, filter, and analyze your entire codebase. You have <span className="text-white font-semibold">{repos.length}</span> public repositories generating <span className="text-amber-400 font-semibold">{formatNumber(totalStars)}</span> stars in total.
            </p>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col gap-4 glass-card p-4 rounded-2xl border border-white/5">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/20 border border-white/10 text-white rounded-xl pl-11 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-black/40 transition-all placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-white cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            {/* Minimum Stars Filter */}
            <div className="relative shrink-0 w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Star className="w-4 h-4 text-amber-400" />
              </div>
              <select
                aria-label="Filter by minimum stars"
                value={minStars}
                onChange={(e) => setMinStars(Number(e.target.value))}
                className="w-full sm:w-auto appearance-none bg-black/20 border border-white/10 text-white rounded-xl pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 hover:bg-black/40 transition-all cursor-pointer font-medium"
              >
                {starFilterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="relative shrink-0 w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <SortAsc className="w-4 h-4 text-muted-foreground" />
              </div>
              <select
                aria-label="Sort repositories"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-auto appearance-none bg-black/20 border border-white/10 text-white rounded-xl pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 hover:bg-black/40 transition-all cursor-pointer font-medium"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.id} value={opt.id} className="bg-slate-900 text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* View Toggles */}
            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                className={cn(
                  "p-2 rounded-lg transition-all cursor-pointer",
                  viewMode === "grid" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                aria-label="List view"
                className={cn(
                  "p-2 rounded-lg transition-all cursor-pointer",
                  viewMode === "list" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Filter Row: Type Pills & Active Filter Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/5">
          {/* Repository Type Pills: All | Sources (Originals) | Forks */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1 hidden sm:inline">
              Type:
            </span>
            <button
              onClick={() => setRepoType("all")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border cursor-pointer",
                repoType === "all"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-black/20 border-white/5 text-muted-foreground hover:text-white hover:bg-white/10"
              )}
            >
              All
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px]",
                repoType === "all" ? "bg-white/20 text-white" : "bg-white/5 text-slate-400"
              )}>
                {repoCounts.all}
              </span>
            </button>

            <button
              onClick={() => setRepoType("sources")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border cursor-pointer",
                repoType === "sources"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-black/20 border-white/5 text-muted-foreground hover:text-white hover:bg-white/10"
              )}
            >
              Sources (Originals)
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px]",
                repoType === "sources" ? "bg-white/20 text-white" : "bg-white/5 text-slate-400"
              )}>
                {repoCounts.sources}
              </span>
            </button>

            <button
              onClick={() => setRepoType("forks")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border cursor-pointer",
                repoType === "forks"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-black/20 border-white/5 text-muted-foreground hover:text-white hover:bg-white/10"
              )}
            >
              <GitFork className="w-3 h-3" />
              Forks
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px]",
                repoType === "forks" ? "bg-white/20 text-white" : "bg-white/5 text-slate-400"
              )}>
                {repoCounts.forks}
              </span>
            </button>
          </div>

          {/* Active Filter Badge & Clear All Filters Button */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 shrink-0 animate-in fade-in duration-200">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
                <Filter className="w-3 h-3" />
                {activeFilterCount} {activeFilterCount === 1 ? "active" : "active"}
              </span>
              <button
                onClick={handleClearAllFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Applied Filters Chips (if any active) */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-muted-foreground font-medium">Applied filters:</span>
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-slate-200">
              Search: &ldquo;{searchQuery}&rdquo;
              <button onClick={() => setSearchQuery("")} className="hover:text-white text-muted-foreground ml-1 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {repoType !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-slate-200">
              Type: {repoType === "sources" ? "Sources (Originals)" : "Forks"}
              <button onClick={() => setRepoType("all")} className="hover:text-white text-muted-foreground ml-1 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedLanguage !== "All" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-slate-200">
              Language: {selectedLanguage}
              <button onClick={() => setSelectedLanguage("All")} className="hover:text-white text-muted-foreground ml-1 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {minStars > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-slate-200">
              Stars: &gt; {minStars} ★
              <button onClick={() => setMinStars(0)} className="hover:text-white text-muted-foreground ml-1 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={handleClearAllFilters}
            className="text-primary hover:underline ml-1 font-medium cursor-pointer"
          >
            Reset all
          </button>
        </div>
      )}

      {/* Language filter - Scrollable horizontal */}
      <div className="flex overflow-x-auto pb-2 scrollbar-none fade-edges">
        <div className="flex gap-2 px-1">
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap border cursor-pointer",
                selectedLanguage === lang
                  ? "bg-primary/20 text-primary border-primary/30 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                  : "bg-white/5 text-muted-foreground border-transparent hover:text-white hover:bg-white/10"
              )}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Repository Grid / List */}
      {filteredAndSortedRepos.length > 0 && (
        <div className="space-y-12">
          {pinnedRepos.length > 0 && (
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2 mb-6">
                <Pin className="w-5 h-5 text-primary" /> Pinned Repositories ({pinnedRepos.length})
              </h2>
              <div 
                className={cn("grid gap-5", viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}
              >
                <AnimatePresence mode="popLayout">
                  {pinnedRepos.map(renderRepoCard)}
                </AnimatePresence>
              </div>
            </div>
          )}

          <div>
            {pinnedRepos.length > 0 && unpinnedRepos.length > 0 && (
              <h2 className="text-xl font-black text-white flex items-center gap-2 mb-6 mt-4">
                All Repositories ({unpinnedRepos.length})
              </h2>
            )}
            <div 
              className={cn("grid gap-5", viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}
            >
              <AnimatePresence mode="popLayout">
                {unpinnedRepos.map(renderRepoCard)}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredAndSortedRepos.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="glass-card rounded-[32px] p-12 sm:p-16 text-center max-w-2xl mx-auto border-dashed border-2 border-white/10"
        >
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 text-muted-foreground">
            <Filter className="w-10 h-10 text-primary/70" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No repositories found</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm leading-relaxed">
            {activeFilterCount > 0
              ? `We couldn't find any repositories matching your ${activeFilterCount} active filter${activeFilterCount > 1 ? "s" : ""}. Try adjusting your search or clearing filters.`
              : "No repositories found for this account."}
          </p>

          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
              {searchQuery && (
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                  Search: &ldquo;{searchQuery}&rdquo;
                </span>
              )}
              {repoType !== "all" && (
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                  Type: {repoType === "sources" ? "Sources (Originals)" : "Forks"}
                </span>
              )}
              {selectedLanguage !== "All" && (
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                  Language: {selectedLanguage}
                </span>
              )}
              {minStars > 0 && (
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                  Stars: &gt; {minStars} ★
                </span>
              )}
            </div>
          )}

          {activeFilterCount > 0 && (
            <button 
              onClick={handleClearAllFilters}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Clear All Filters
            </button>
          )}
        </motion.div>
      )}

      {/* Quick View Modal */}
      <RepoQuickView 
        repo={selectedRepo} 
        isOpen={!!selectedRepo} 
        onClose={() => setSelectedRepo(null)} 
      />
    </div>
  );
}
