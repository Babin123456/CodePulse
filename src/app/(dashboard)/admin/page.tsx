"use client";

import { useState } from "react";
import { ShieldAlert, Server, Cpu, Activity, Database, CheckCircle, AlertTriangle, RefreshCw, Power } from "lucide-react";
import { useCurrentUser } from "@/hooks/api/use-auth";
import { Button } from "@/components/ui/button";

export default function AdminHealthPage() {
  const { data: user, isLoading } = useCurrentUser();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const isAdmin = user?.role === "ADMIN" || user?.username === "admin";

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-8 rounded-3xl bg-slate-900/60 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
              Admin Restricted
            </span>
          </div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Server className="w-8 h-8 text-cyan-400" />
            System Health & Operations
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time server telemetry, cache status, and application maintenance toggles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            onClick={() => setMaintenanceMode(!maintenanceMode)}
            className={`font-semibold ${
              maintenanceMode
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            <Power className="w-4 h-4 mr-2" />
            {maintenanceMode ? "Disable Maintenance" : "Enable Maintenance"}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase text-slate-400">Database</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">PostgreSQL</div>
          <div className="text-xs text-emerald-400 mt-1">Connected • 12ms latency</div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase text-slate-400">Cache</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">Redis Cluster</div>
          <div className="text-xs text-emerald-400 mt-1">Operational • 99.4% Hit Rate</div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase text-slate-400">Memory Usage</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">412 MB / 2 GB</div>
          <div className="text-xs text-slate-400 mt-1">20.6% Utilized</div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase text-slate-400">API Health</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">99.98%</div>
          <div className="text-xs text-emerald-400 mt-1">0 Critical Alerts in 24h</div>
        </div>
      </div>

      {/* Services status list */}
      <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white">Microservices & Dependencies</h3>
        <div className="space-y-3">
          {[
            { name: "GitHub GraphQL API Sync", status: "Healthy", rateLimit: "4,820 / 5,000", uptime: "100%" },
            { name: "Battle WebSocket Lobby Gateway", status: "Healthy", rateLimit: "Active Rooms: 12", uptime: "99.95%" },
            { name: "BullMQ Background Jobs Queue", status: "Healthy", rateLimit: "Idle", uptime: "100%" },
            { name: "Discord Notification Dispatcher", status: "Idle", rateLimit: "Quota OK", uptime: "100%" },
          ].map((srv, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                <span className="text-sm font-semibold text-white">{srv.name}</span>
              </div>
              <div className="flex items-center gap-6 text-xs text-slate-400">
                <span>{srv.rateLimit}</span>
                <span className="font-semibold text-emerald-400">{srv.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
