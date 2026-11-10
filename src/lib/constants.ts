export const APP_NAME = "DevBattle";
export const APP_DESCRIPTION = "The Ultimate GitHub Developer Analytics, Comparison & Gamification Platform";
export const APP_URL = "https://devbattle.dev";

export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  Python: "#3776ab",
  Rust: "#dea584",
  Go: "#00add8",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Ruby: "#cc342d",
  PHP: "#4f5d95",
  Swift: "#ffac45",
  Kotlin: "#a97bff",
  Dart: "#00b4ab",
  Scala: "#c22d40",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Elixir: "#6e4a7e",
  Haskell: "#5e5086",
  Lua: "#000080",
  R: "#198ce7",
  MATLAB: "#e16737",
  Jupyter: "#f37626",
  Markdown: "#083fa1",
};

export const TIER_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  Bronze: { bg: "from-amber-700 to-amber-900", text: "text-amber-400", glow: "shadow-amber-500/20" },
  Silver: { bg: "from-gray-400 to-gray-600", text: "text-gray-300", glow: "shadow-gray-400/20" },
  Gold: { bg: "from-yellow-400 to-yellow-600", text: "text-yellow-400", glow: "shadow-yellow-500/30" },
  Platinum: { bg: "from-cyan-400 to-cyan-600", text: "text-cyan-400", glow: "shadow-cyan-500/30" },
  Diamond: { bg: "from-blue-400 to-indigo-500", text: "text-blue-400", glow: "shadow-blue-500/30" },
  Master: { bg: "from-purple-500 to-pink-500", text: "text-purple-400", glow: "shadow-purple-500/30" },
  Grandmaster: {
    bg: "from-red-500 via-purple-500 to-blue-500",
    text: "text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-purple-400 to-blue-400",
    glow: "shadow-purple-500/40",
  },
};

export const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  easy: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Easy" },
  medium: { bg: "bg-amber-500/10", text: "text-amber-400", label: "Medium" },
  hard: { bg: "bg-red-500/10", text: "text-red-400", label: "Hard" },
  legendary: { bg: "bg-purple-500/10", text: "text-purple-400", label: "Legendary" },
};

export const RARITY_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  common: {
    bg: "bg-gray-500/10",
    border: "border-gray-500/30",
    text: "text-gray-400",
    glow: "",
  },
  rare: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400",
    glow: "shadow-blue-500/10",
  },
  epic: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    text: "text-purple-400",
    glow: "shadow-purple-500/20",
  },
  legendary: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    glow: "shadow-amber-500/20",
  },
};

export const NAV_ITEMS = [
  {
    group: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
      { title: "Analytics", href: "/analytics", icon: "BarChart3" },
      { title: "Repositories", href: "/repositories", icon: "GitBranch" },
    ],
  },
  {
    group: "Compete",
    items: [
      { title: "Compare", href: "/compare", icon: "GitCompareArrows" },
      { title: "Battles", href: "/battles", icon: "Swords" },
      { title: "Leaderboard", href: "/leaderboard", icon: "Trophy" },
      { title: "Challenges", href: "/challenges", icon: "Target" },
      { title: "Achievements", href: "/achievements", icon: "Award" },
    ],
  },
  {
    group: "Social",
    items: [
      { title: "Feed", href: "/feed", icon: "Zap" },
      { title: "Profile", href: "/profile", icon: "User" },
    ],
  },
];

export const CHART_THEME = {
  backgroundColor: "transparent",
  textStyle: { color: "#94a3b8", fontFamily: "Inter, system-ui, sans-serif" },
  title: { textStyle: { color: "#e2e8f0" } },
  legend: { textStyle: { color: "#94a3b8" } },
  tooltip: {
    backgroundColor: "#1e293b",
    borderColor: "rgba(255,255,255,0.1)",
    textStyle: { color: "#e2e8f0" },
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
    axisTick: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
    axisLabel: { color: "#64748b" },
    splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
  },
  valueAxis: {
    axisLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
    axisTick: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
    axisLabel: { color: "#64748b" },
    splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
  },
  color: ["#8b5cf6", "#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#f97316"],
};
