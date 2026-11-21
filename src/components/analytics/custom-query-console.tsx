"use client";

import React, { useState, useEffect } from "react";
import {
  DuckDbWasmService,
  QueryResult,
} from "./duckdb-wasm.service";
import {
  Terminal,
  Play,
  Download,
  BarChart2,
  Table as TableIcon,
  Zap,
  Sparkles,
} from "lucide-react";

const PRESET_QUERIES = [
  {
    name: "Commits by Hour of Day",
    sql: "SELECT hour_of_day, COUNT(*) AS commit_count, SUM(lines_added) AS total_additions FROM commits GROUP BY hour_of_day ORDER BY hour_of_day ASC;",
  },
  {
    name: "Churn by File Extension",
    sql: "SELECT file_extension, SUM(lines_added) AS total_additions, SUM(lines_deleted) AS total_deletions FROM commits GROUP BY file_extension ORDER BY total_additions DESC;",
  },
  {
    name: "Folder Churn & Activity",
    sql: "SELECT folder, COUNT(*) AS total_commits, SUM(lines_added) AS total_lines_added FROM commits GROUP BY folder ORDER BY total_commits DESC;",
  },
  {
    name: "Recent Tournament Battles",
    sql: "SELECT battle_id, mode, language, winner, duration_sec FROM battles ORDER BY duration_sec DESC;",
  },
];

export const CustomQueryConsole: React.FC = () => {
  const [query, setQuery] = useState(PRESET_QUERIES[0].sql);
  const [results, setResults] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"table" | "chart">("table");

  const duckDb = DuckDbWasmService.getInstance();

  useEffect(() => {
    handleRunQuery(PRESET_QUERIES[0].sql);
  }, []);

  const handleRunQuery = async (sqlToRun?: string) => {
    setIsLoading(true);
    try {
      const q = sqlToRun || query;
      const res = await duckDb.executeQuery(q);
      setResults(res);
    } catch (err) {
      console.error("DuckDB query failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!results) return;
    const csvContent = duckDb.exportToCsv(results);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `duckdb_query_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-card rounded-[32px] p-8 border border-white/5 relative overflow-hidden group">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              In-Browser DuckDB SQL Console
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono">
                Wasm &lt;10ms
              </span>
            </h3>
          </div>
          <p className="text-xs text-white/50 mt-1">
            Zero-backend columnar analytics running directly on in-memory Parquet snapshots
          </p>
        </div>

        {/* Preset query buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_QUERIES.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(preset.sql);
                handleRunQuery(preset.sql);
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Query input editor area */}
      <div className="relative mb-4 z-10">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500/50 resize-none"
          placeholder="Enter analytical SQL query (e.g. SELECT hour_of_day, COUNT(*) FROM commits GROUP BY hour_of_day)..."
        />

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRunQuery()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isLoading ? "Executing..." : "Execute Query"}
            </button>

            {results && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                <Zap className="w-3 h-3" />
                {results.executionTimeMs}ms across {results.totalRows} rows
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-white/5 p-1 border border-white/10">
              <button
                onClick={() => setActiveTab("table")}
                className={`p-1.5 rounded-md text-xs flex items-center gap-1.5 ${
                  activeTab === "table" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                Table
              </button>
              <button
                onClick={() => setActiveTab("chart")}
                className={`p-1.5 rounded-md text-xs flex items-center gap-1.5 ${
                  activeTab === "chart" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                Chart
              </button>
            </div>

            <button
              onClick={handleExportCsv}
              disabled={!results || results.rows.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs disabled:opacity-40 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Results View Area */}
      {results && (
        <div className="relative z-10 mt-4 rounded-xl border border-white/10 bg-black/30 overflow-hidden">
          {activeTab === "table" ? (
            <div className="overflow-x-auto max-h-[320px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    {results.columns.map((col) => (
                      <th key={col.name} className="py-2.5 px-4 font-mono font-medium text-white/60">
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {results.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      {results.columns.map((col) => (
                        <td key={col.name} className="py-2 px-4 text-white/80">
                          {String(row[col.name] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Bar Chart representation */
            <div className="p-6 flex flex-col gap-3">
              <div className="text-xs font-mono text-white/60 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Visual Query Projection ({results.rows.length} data points)
                <span className="ml-auto text-[10px] text-amber-400/80 font-mono">
                  Engine: DuckDB-Wasm (SIMD)
                </span>
              </div>
              <div className="flex items-end gap-2 h-44 pt-6 border-b border-white/10 overflow-x-auto">
                {results.rows.slice(0, 24).map((row, idx) => {
                  const numVal =
                    Number(row.commit_count || row.total_additions || row.duration_sec || 10);
                  const maxVal = 120;
                  const heightPercent = Math.min(Math.max((numVal / maxVal) * 100, 10), 100);

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 min-w-[24px]">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full rounded-t-sm bg-gradient-to-t from-amber-500/40 to-amber-400 border-t border-amber-300"
                        title={`${numVal}`}
                      />
                      <span className="text-[10px] font-mono text-white/40 truncate w-full text-center">
                        {row.hour_of_day !== undefined
                          ? `${row.hour_of_day}h`
                          : row.file_extension || row.folder || idx}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

