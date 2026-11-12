"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useInView } from "react-intersection-observer";
import { useLeaderboardInfinite, useUserProfileSearch } from "@/hooks/api/use-leaderboard";
import { useCurrentUser } from "@/hooks/api/use-auth";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Search,
  Loader2,
  Users,
  Flag,
  Globe,
  Star,
  GitFork,
  BookOpen,
  Clock,
  Swords,
  BarChart3,
  ExternalLink,
  X,
} from "lucide-react";
import { LeaderboardRowSkeleton, LeaderboardTableSkeleton } from "@/components/leaderboard/leaderboard-skeleton";

const GithubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className}>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
);
import { cn } from "@/lib/utils";

type LeaderboardCategory = "global" | "india" | "friends";

const CATEGORY_META: Record<
  LeaderboardCategory,
  { title: string; description: string; icon: any }
> = {
  global: {
    title: "Global Developer Rankings",
    description: "Discover top developers, innovators, and open source contributors worldwide.",
    icon: Globe,
  },
  india: {
    title: "India Rankings",
    description: "Top open-source contributors and active developers across India.",
    icon: Flag,
  },
  friends: {
    title: "Friends Rankings",
    description: "Compete with your GitHub network and see who ranks at the top.",
    icon: Users,
  },
};

export default function LeaderboardPage() {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<LeaderboardCategory>("global");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  
  // Infinite Scroll Hook
  const { ref, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    isLoading
  } = useLeaderboardInfinite(activeTab);

  // Search User Hook
  const { data: searchedUser, isLoading: isSearchLoading } = useUserProfileSearch(debouncedSearch);

  // Handle Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load more on scroll
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  // Flatten infinite pages
  const users = data?.pages.flatMap(page => page.data) || [];
  
  // Decide what to display
  const displayUsers = debouncedSearch && searchedUser 
    ? [searchedUser] 
    : debouncedSearch && !searchedUser && !isSearchLoading 
    ? [] 
    : users;

  const ActiveIcon = CATEGORY_META[activeTab].icon;

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5 py-6 px-2 -mx-2">
        <div className="flex flex-col gap-6 max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                <ActiveIcon className="w-8 h-8 text-primary" />
                {CATEGORY_META[activeTab].title}
              </h1>
              <p className="text-muted-foreground mt-2">
                {CATEGORY_META[activeTab].description}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search username..."
                  value={searchQuery}
                  aria-label="Search developer by GitHub username"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 w-full sm:w-64 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val as LeaderboardCategory);
              setSearchQuery("");
            }}
            aria-label="Filter leaderboard category"
          >
            <TabsList className="bg-white/[0.03] border border-white/5 p-1 rounded-2xl h-auto gap-1">
              <TabsTrigger
                value="global"
                className="rounded-xl px-4 py-2 text-xs font-semibold gap-2 data-active:bg-primary data-active:text-white transition-all cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                <span>Global</span>
              </TabsTrigger>
              <TabsTrigger
                value="india"
                className="rounded-xl px-4 py-2 text-xs font-semibold gap-2 data-active:bg-primary data-active:text-white transition-all cursor-pointer"
              >
                <Flag className="w-4 h-4" />
                <span>India</span>
              </TabsTrigger>
              <TabsTrigger
                value="friends"
                className="rounded-xl px-4 py-2 text-xs font-semibold gap-2 data-active:bg-primary data-active:text-white transition-all cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Friends</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        {(isLoading || isSearchLoading) ? (
          <LeaderboardTableSkeleton count={8} />
        ) : displayUsers.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
            <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-1">No Developers Found</h3>
            <p className="text-muted-foreground text-sm">
              {searchQuery ? "Try a different GitHub username." : "No one here yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {displayUsers.map((user: any, index: number) => {
                // If it's a search result, don't show rank (or calculate it). Otherwise, index + 1
                const rank = searchQuery ? "-" : index + 1;
                
                return (
                  <motion.div
                    key={user.id || user.githubId}
                    layout
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index < 10 ? index * 0.05 : 0 }}
                    onClick={() => setSelectedUser(user)}
                    className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all cursor-pointer overflow-hidden relative"
                  >
                    {/* Rank Badge */}
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="w-12 flex justify-center">
                        {rank === 1 ? (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 flex items-center justify-center text-black font-bold shadow-[0_0_15px_rgba(253,224,71,0.5)]">1</div>
                        ) : rank === 2 ? (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-black font-bold shadow-[0_0_15px_rgba(209,213,219,0.3)]">2</div>
                        ) : rank === 3 ? (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-bold shadow-[0_0_15px_rgba(180,83,9,0.3)]">3</div>
                        ) : (
                          <div className="text-lg font-mono text-muted-foreground font-medium">{rank}</div>
                        )}
                      </div>

                      {/* Avatar */}
                      <img 
                        src={user.avatarUrl || `https://github.com/${user.username}.png`} 
                        alt={user.username}
                        className="w-12 h-12 rounded-full object-cover border border-white/10 group-hover:border-primary/50 transition-colors"
                      />
                      
                      {/* Name & Country */}
                      <div className="flex-1 min-w-[150px]">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white truncate max-w-[150px]">
                            {user.name || user.username}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="truncate">@{user.username}</span>
                          {user.country && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[100px]">{user.country}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-4 flex-1 mt-4 sm:mt-0 items-center justify-items-center sm:justify-items-end text-sm">
                      <div className="flex flex-col items-center sm:items-end">
                        <span className="text-muted-foreground text-xs flex items-center gap-1"><BookOpen className="w-3 h-3"/> Repos</span>
                        <span className="font-medium font-mono">{user.publicRepos?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex flex-col items-center sm:items-end">
                        <span className="text-muted-foreground text-xs flex items-center gap-1"><Users className="w-3 h-3"/> Followers</span>
                        <span className="font-medium font-mono">{user.followers?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex flex-col items-center sm:items-end">
                        <span className="text-muted-foreground text-xs flex items-center gap-1 text-yellow-500/80"><Star className="w-3 h-3"/> Stars</span>
                        <span className="font-medium font-mono text-yellow-500/90">{user.totalStars?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex flex-col items-center sm:items-end">
                        <span className="text-muted-foreground text-xs flex items-center gap-1 text-primary/80">Language</span>
                        <span className="font-medium truncate max-w-[80px]">{user.primaryLanguage || 'Unknown'}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {/* Infinite Scroll Trigger with Coordinated Skeleton State */}
            {!searchQuery && hasNextPage && (
              <div ref={ref} className="pt-3 pb-6">
                {isFetchingNextPage ? (
                  <div className="space-y-3" role="status" aria-label="Loading more developers">
                    <LeaderboardRowSkeleton />
                    <LeaderboardRowSkeleton />
                    <LeaderboardRowSkeleton />
                  </div>
                ) : (
                  <div className="h-8" />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profile Modal with Quick Action Triggers */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#09090b] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative"
          >
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 relative">
              <div className="absolute -bottom-12 left-6">
                <img 
                  src={(selectedUser as any).avatarUrl || `https://github.com/${(selectedUser as any).username}.png`} 
                  alt={(selectedUser as any).username}
                  className="w-24 h-24 rounded-2xl border-4 border-[#09090b] bg-background object-cover"
                />
              </div>
            </div>
            
            <div className="pt-16 p-6">
              <h2 className="text-2xl font-bold">{(selectedUser as any).name || (selectedUser as any).username}</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                  <GithubIcon className="w-4 h-4" /> @{(selectedUser as any).username}
                </p>
                <a
                  href={`https://github.com/${(selectedUser as any).username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open GitHub profile for @${(selectedUser as any).username} in a new tab`}
                  className="text-muted-foreground/60 hover:text-white transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {(selectedUser as any).bio && (
                <p className="mt-4 text-sm leading-relaxed text-white/80">{(selectedUser as any).bio}</p>
              )}

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="glass-card p-4 rounded-xl border border-white/5">
                  <div className="text-xs text-muted-foreground mb-1">Company</div>
                  <div className="font-medium truncate">{(selectedUser as any).company || 'Independent'}</div>
                </div>
                <div className="glass-card p-4 rounded-xl border border-white/5">
                  <div className="text-xs text-muted-foreground mb-1">Location</div>
                  <div className="font-medium truncate">{(selectedUser as any).location || 'World'}</div>
                </div>
              </div>

              <div className="flex gap-4 mt-6 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="font-bold">{(selectedUser as any).totalStars?.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Stars</span>
                </div>
                <div className="flex items-center gap-2">
                  <GitFork className="w-4 h-4 text-emerald-500" />
                  <span className="font-bold">{(selectedUser as any).totalForks?.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Forks</span>
                </div>
              </div>
              
              {/* Quick Action Triggers: Challenge & Compare */}
              {(() => {
                const currentUsername = (currentUser?.username || "code-with-abhi-i5").toLowerCase();
                const targetUsername = ((selectedUser as any)?.username || "").toLowerCase();
                const isCurrentUser = targetUsername === currentUsername;

                if (isCurrentUser) {
                  return (
                    <div className="mt-6 py-2.5 px-4 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-medium text-center">
                      This is your profile
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                    <button
                      type="button"
                      id="challenge-developer-btn"
                      onClick={() => {
                        const target = (selectedUser as any).username;
                        setSelectedUser(null);
                        router.push(`/battles?p2=${encodeURIComponent(target)}`);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-500/10 cursor-pointer"
                    >
                      <Swords className="w-4 h-4" />
                      Challenge to Battle
                    </button>

                    <button
                      type="button"
                      id="compare-developer-btn"
                      onClick={() => {
                        const target = (selectedUser as any).username;
                        const me = currentUser?.username || "code-with-abhi-i5";
                        setSelectedUser(null);
                        router.push(
                          `/compare?user1=${encodeURIComponent(me)}&user2=${encodeURIComponent(target)}&dev1=${encodeURIComponent(me)}&dev2=${encodeURIComponent(target)}`
                        );
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-all cursor-pointer"
                    >
                      <BarChart3 className="w-4 h-4 text-blue-400" />
                      Compare with Me
                    </button>
                  </div>
                );
              })()}

              <div className="mt-4 flex justify-end">
                <a 
                  href={`https://github.com/${(selectedUser as any).username}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`View GitHub profile for ${(selectedUser as any).username} in a new tab`}
                  className="px-4 py-2 bg-white/10 text-white hover:bg-white/15 font-medium rounded-lg transition-colors text-xs flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <GithubIcon className="w-3.5 h-3.5" />
                  View GitHub Profile
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
