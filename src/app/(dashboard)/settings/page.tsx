"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Moon,
  Sun,
  Monitor,
  Save,
  Loader2,
  Mail,
  Key,
  Eye,
  Smartphone,
  LogOut,
  RotateCcw,
  Check,
  Sliders,
  Sparkles,
  Download,
} from "lucide-react";
import { useTheme } from "next-themes";
import { GithubIcon } from "@/components/icons/github";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useCurrentUser } from "@/hooks/api/use-auth";
import {
  buildUserDataExport,
  downloadUserDataExport,
} from "@/lib/data-export";
import {
  useUpdateProfile,
  useUserPreferences,
  DEFAULT_APPEARANCE_PREFERENCES,
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "@/hooks/api/use-settings";

const sections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "privacy", label: "Privacy & Security", icon: Shield },
  { id: "integrations", label: "Integrations", icon: Globe },
];

const ACCENT_COLORS = [
  { id: "purple" as const, color: "bg-purple-500", label: "Purple" },
  { id: "blue" as const, color: "bg-blue-500", label: "Blue" },
  { id: "emerald" as const, color: "bg-emerald-500", label: "Green" },
  { id: "orange" as const, color: "bg-orange-500", label: "Orange" },
  { id: "pink" as const, color: "bg-pink-500", label: "Pink" },
];

const LANDING_TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "analytics", label: "Analytics" },
  { id: "battles", label: "Battles" },
  { id: "repositories", label: "Repositories" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "challenges", label: "Challenges" },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const [isExporting, setIsExporting] = useState(false);

  const { theme, setTheme } = useTheme();
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const updateProfileMutation = useUpdateProfile();

  const {
    preferences,
    isLoaded,
    lastSaved,
    updateAppearance,
    updateNotifications,
    resetToDefaults,
  } = useUserPreferences();

  const handleProfileSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    updateProfileMutation.mutate(data, {
      onSuccess: () => {
        toast.success("Profile saved successfully!");
      },
      onError: (error) => {
        toast.error("Failed to save profile. " + (error as any)?.message);
      },
    });
  };

  const handleManualSave = () => {
    toast.success("Preferences saved successfully!");
  };

  const handleResetDefaults = () => {
    resetToDefaults();
    setTheme("dark");
    toast.success("Preferences restored to recommended defaults!");
  };

  if (isUserLoading || !isLoaded) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Fallback user if not logged in
  const displayUser = user || {
    name: "Guest",
    username: "guest",
    email: "",
    avatar: "https://github.com/ghost.png",
    bio: "",
    location: "",
    company: "",
    website: "",
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      await new Promise((resolve) => setTimeout(resolve, 350));

      const payload = buildUserDataExport({
        user: displayUser,
        rating: user?.rating,
        stats: user?.stats,
        repositories: user?.repositories,
      });

      const result = downloadUserDataExport(payload);
      toast.success(`Account data exported successfully (${result.formattedSize}).`);
    } catch {
      toast.error("Failed to export account data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const notificationItems: {
    key: keyof NotificationPreferences;
    title: string;
    desc: string;
  }[] = [
    {
      key: "battleChallenges",
      title: "Battle Challenges",
      desc: "Get notified immediately when another developer challenges you",
    },
    {
      key: "weeklyDigest",
      title: "Weekly Stats Digest",
      desc: "Receive weekly summaries of your commits, stars, and XP progression",
    },
    {
      key: "achievementUnlocks",
      title: "Achievement Unlocks",
      desc: "Instant notifications when unlocking milestones and special badges",
    },
    {
      key: "leaderboardUpdates",
      title: "Leaderboard Updates",
      desc: "Weekly rank fluctuations and competitor tier changes",
    },
    {
      key: "challengeReminders",
      title: "Challenge Reminders",
      desc: "Alerts for expiring quests and weekly developer challenges",
    },
    {
      key: "productUpdates",
      title: "Product Updates",
      desc: "Announcements regarding new features and algorithm improvements",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your developer profile and persistent workspace preferences
          </p>
        </div>

        {/* Global Actions Bar */}
        <div className="flex items-center gap-2.5">
          {lastSaved && activeSection !== "profile" && (
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-emerald-400 mr-2 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              <Check className="w-3.5 h-3.5" />
              Auto-saved
            </span>
          )}

          {activeSection !== "profile" && (
            <>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleResetDefaults}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                title="Restore all appearance and notification settings to defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleManualSave}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium text-sm shadow-lg shadow-purple-500/10 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </motion.button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Navigation */}
        <div className="lg:w-56 shrink-0">
          <div
            role="tablist"
            aria-label="Settings sections"
            className="glass-card rounded-[20px] p-2 flex lg:flex-col overflow-x-auto gap-1 lg:gap-0.5 scrollbar-none"
          >
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  role="tab"
                  aria-selected={activeSection === section.id}
                  aria-controls={`panel-${section.id}`}
                  id={`tab-${section.id}`}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex items-center gap-2.5 shrink-0 lg:w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/40",
                    activeSection === section.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* PROFILE SECTION */}
          {activeSection === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <form
                onSubmit={handleProfileSave}
                className="glass-card rounded-[20px] p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Profile Information</h2>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium text-sm disabled:opacity-50"
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Profile
                  </motion.button>
                </div>
                <div className="flex items-center gap-4 mb-6">
                  <img
                    src={displayUser.avatar || "https://github.com/ghost.png"}
                    alt={displayUser.name || "User"}
                    className="w-20 h-20 rounded-2xl bg-muted object-cover"
                  />
                  <div>
                    <button
                      type="button"
                      className="text-sm px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      Change Avatar
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="settings-name-input" className="text-sm font-medium mb-1.5 block">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      <input
                        id="settings-name-input"
                        type="text"
                        name="name"
                        maxLength={50}
                        defaultValue={displayUser.name || ''}
                        placeholder="Your full name"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="settings-username-input" className="text-sm font-medium mb-1.5 block">Username</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      <input
                        id="settings-username-input"
                        type="text"
                        name="username"
                        defaultValue={displayUser.username}
                        disabled
                        aria-disabled="true"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm opacity-50 cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="settings-email-input" className="text-sm font-medium mb-1.5 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      <input
                        id="settings-email-input"
                        type="email"
                        name="email"
                        defaultValue={displayUser.email || ''}
                        placeholder="you@domain.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="settings-location-input" className="text-sm font-medium mb-1.5 block">Location</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      <input
                        id="settings-location-input"
                        type="text"
                        name="location"
                        maxLength={60}
                        defaultValue={displayUser.location || ''}
                        placeholder="City, Country"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="settings-company-input" className="text-sm font-medium mb-1.5 block">Company</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      <input
                        id="settings-company-input"
                        type="text"
                        name="company"
                        maxLength={60}
                        defaultValue={displayUser.company || ''}
                        placeholder="Organization or company"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="settings-website-input" className="text-sm font-medium mb-1.5 block">Website</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      <input
                        id="settings-website-input"
                        type="url"
                        name="website"
                        defaultValue={displayUser.website || ''}
                        placeholder="https://yourportfolio.dev"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <label htmlFor="settings-bio-input" className="text-sm font-medium mb-1.5 block">Bio</label>
                  <textarea
                    id="settings-bio-input"
                    name="bio"
                    maxLength={300}
                    defaultValue={displayUser.bio || ''}
                    placeholder="Tell the community a little bit about yourself..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none placeholder:text-muted-foreground/50"
                  />
                </div>
              </form>
            </motion.div>
          )}

          {/* NOTIFICATIONS SECTION */}
          {activeSection === "notifications" && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card rounded-[20px] p-6 space-y-6"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div>
                  <h2 className="text-lg font-semibold">
                    Notification Preferences
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Customize your alerts and updates across battle and achievement events
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updateNotifications(DEFAULT_NOTIFICATION_PREFERENCES);
                    toast.success("Notification settings reset to defaults.");
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Defaults
                </button>
              </div>

              <div className="space-y-4 divide-y divide-white/[0.04]">
                {notificationItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between pt-3 first:pt-0"
                  >
                    <div className="pr-4">
                      <div className="text-sm font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.desc}
                      </div>
                    </div>
                    <Switch
                      checked={preferences.notifications[item.key]}
                      onCheckedChange={(checked) => {
                        updateNotifications({ [item.key]: checked });
                        toast.success(
                          `${item.title} ${checked ? "enabled" : "disabled"}.`
                        );
                      }}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* APPEARANCE SECTION */}
          {activeSection === "appearance" && (
            <motion.div
              key="appearance"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card rounded-[20px] p-6 space-y-6"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div>
                  <h2 className="text-lg font-semibold">Appearance</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Personalize your interface theme, colors, layouts, and accessibility
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updateAppearance(DEFAULT_APPEARANCE_PREFERENCES);
                    setTheme("dark");
                    toast.success("Appearance settings reset to defaults.");
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Defaults
                </button>
              </div>

              {/* Theme Selector */}
              <div>
                <label className="text-sm font-medium mb-3 block">Theme</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "dark" as const, label: "Dark", icon: Moon },
                    { id: "light" as const, label: "Light", icon: Sun },
                    { id: "system" as const, label: "System", icon: Monitor },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = (theme || preferences.appearance.theme) === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setTheme(item.id);
                          updateAppearance({ theme: item.id });
                          toast.success(`Theme set to ${item.label}.`);
                        }}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all cursor-pointer",
                          isActive
                            ? "bg-primary/10 border-primary/50 text-foreground ring-1 ring-primary/30"
                            : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label className="text-sm font-medium mb-3 block">
                  Accent Color
                </label>
                <div className="flex gap-3">
                  {ACCENT_COLORS.map((accent) => {
                    const isSelected =
                      preferences.appearance.accentColor === accent.id;
                    return (
                      <button
                        key={accent.id}
                        type="button"
                        onClick={() => {
                          updateAppearance({ accentColor: accent.id });
                          toast.success(`Accent color set to ${accent.label}.`);
                        }}
                        className={cn(
                          "w-10 h-10 rounded-xl transition-all cursor-pointer hover:scale-110",
                          accent.color,
                          isSelected &&
                            "ring-2 ring-white ring-offset-2 ring-offset-[#111827] scale-105"
                        )}
                        title={accent.label}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Layout & Accessibility Preferences */}
              <div className="space-y-4 pt-2 border-t border-white/[0.06]">
                {/* Compact Table View Switch */}
                <div className="flex items-center justify-between py-2">
                  <div className="pr-4">
                    <div className="text-sm font-medium">
                      Compact Table View
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Reduces row padding in tables across repositories and battles for dense viewing
                    </div>
                  </div>
                  <Switch
                    checked={preferences.appearance.compactTableView}
                    onCheckedChange={(checked) => {
                      updateAppearance({ compactTableView: checked });
                      toast.success(
                        checked
                          ? "Compact table view enabled."
                          : "Compact table view disabled."
                      );
                    }}
                  />
                </div>

                {/* Reduced Motion Switch */}
                <div className="flex items-center justify-between py-2">
                  <div className="pr-4">
                    <div className="text-sm font-medium">
                      Reduced Motion Toggle
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Minimize animations, transitions, and particle celebration effects across the UI
                    </div>
                  </div>
                  <Switch
                    checked={preferences.appearance.reducedMotion}
                    onCheckedChange={(checked) => {
                      updateAppearance({ reducedMotion: checked });
                      toast.success(
                        checked
                          ? "Reduced motion enabled."
                          : "Reduced motion disabled."
                      );
                    }}
                  />
                </div>

                {/* Default Landing Tab */}
                <div className="pt-2">
                  <label className="text-sm font-medium mb-1 block">
                    Default Landing Tab
                  </label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Choose which dashboard section loads automatically on initial login
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {LANDING_TABS.map((tab) => {
                      const isCurrent =
                        preferences.appearance.defaultLandingTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            updateAppearance({ defaultLandingTab: tab.id });
                            toast.success(`Default tab set to ${tab.label}.`);
                          }}
                          className={cn(
                            "px-3 py-2 rounded-xl border text-xs font-medium text-center transition-all cursor-pointer",
                            isCurrent
                              ? "bg-primary/20 border-primary text-primary font-semibold ring-1 ring-primary/30"
                              : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                          )}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* PRIVACY SECTION */}
          {activeSection === "privacy" && (
            <motion.div
              key="privacy"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="glass-card rounded-[20px] p-6">
                <h2 className="text-lg font-semibold mb-4">Privacy</h2>
                <div className="space-y-4">
                  {[
                    {
                      title: "Public Profile",
                      desc: "Allow others to see your developer profile and stats",
                      default: true,
                    },
                    {
                      title: "Show Activity",
                      desc: "Display recent commit and battle activity publicly",
                      default: true,
                    },
                    {
                      title: "Show Leaderboard Rank",
                      desc: "Display your rank publicly on the global leaderboards",
                      default: true,
                    },
                    {
                      title: "Allow Challenges",
                      desc: "Let other developers send you 1v1 battle challenges",
                      default: true,
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2"
                    >
                      <div>
                        <div className="text-sm font-medium">{item.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.desc}
                        </div>
                      </div>
                      <Switch defaultChecked={item.default} />
                    </div>
                  ))}

                  {/* Account Data Export (GDPR) */}
                  <div className="pt-4 mt-2 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Export Account Data</div>
                      <div className="text-xs text-muted-foreground">
                        Download your full platform data footprint including profile, stats, and achievements in JSON format.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportData}
                      disabled={isExporting}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isExporting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Download className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span>{isExporting ? "Exporting..." : "Export All My Data"}</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-[20px] p-6">
                <h2 className="text-lg font-semibold mb-4">Security</h2>
                <div className="space-y-3">
                  <button className="flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors">
                    <Key className="w-4 h-4 text-muted-foreground" />
                    <span>Change Password</span>
                  </button>
                  <button className="flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    <span>Two-Factor Authentication</span>
                  </button>
                  <button className="flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span>Active Sessions</span>
                  </button>
                </div>
              </div>
              <div className="glass-card rounded-[20px] p-6 border border-red-500/10">
                <h2 className="text-lg font-semibold mb-2 text-red-400">
                  Danger Zone
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  These actions are irreversible.
                </p>
                <div className="flex gap-3">
                  <button className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors">
                    Delete Account
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-sm hover:bg-white/10 transition-colors">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* INTEGRATIONS SECTION */}
          {activeSection === "integrations" && (
            <motion.div
              key="integrations"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card rounded-[20px] p-6"
            >
              <h2 className="text-lg font-semibold mb-4">Integrations</h2>
              <div className="space-y-3">
                {[
                  {
                    name: "GitHub",
                    desc: `Connected as @${displayUser.username}`,
                    icon: GithubIcon,
                    connected: true,
                  },
                  {
                    name: "Discord",
                    desc: "Receive notifications and battle alerts via Discord",
                    icon: Globe,
                    connected: false,
                  },
                  {
                    name: "Slack",
                    desc: "Post battle victory reports to Slack channels",
                    icon: Globe,
                    connected: false,
                  },
                ].map((integration, i) => {
                  const Icon = integration.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            {integration.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {integration.desc}
                          </div>
                        </div>
                      </div>
                      <button
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-xs font-medium transition-colors",
                          integration.connected
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-white/5 text-muted-foreground hover:bg-white/10"
                        )}
                      >
                        {integration.connected ? "Connected" : "Connect"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
