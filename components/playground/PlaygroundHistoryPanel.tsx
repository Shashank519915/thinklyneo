"use client";

import { Clock, Coins, Copy, Search } from "lucide-react";
import { formatCreditsMillions, type PlaygroundNodeRunLike } from "@/lib/playground-output";

export interface PlaygroundHistoryRun {
  id: string;
  status: string;
  startedAt: string;
  nodeRuns: PlaygroundNodeRunLike[];
}

type PlaygroundHistoryPanelProps = {
  runs: PlaygroundHistoryRun[];
  runFilter: "ui" | "api";
  onRunFilterChange: (filter: "ui" | "api") => void;
  historySearch: string;
  onHistorySearchChange: (value: string) => void;
  selectedRunId?: string | null;
  optimisticRunId?: string | null;
  isRunning: boolean;
  liveCreditsMicro: number | null;
  onSelectRun: (run: PlaygroundHistoryRun) => void;
  resolveCredits: (run: PlaygroundHistoryRun, isSelected: boolean) => number;
};

export function PlaygroundHistoryPanel({
  runs,
  runFilter,
  onRunFilterChange,
  historySearch,
  onHistorySearchChange,
  selectedRunId,
  optimisticRunId,
  isRunning,
  onSelectRun,
  resolveCredits,
}: PlaygroundHistoryPanelProps) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/5 px-4 py-2.5">
        <Clock className="h-3.5 w-3.5 text-zinc-500" />
        <span className="text-xs font-semibold text-zinc-200">Run history</span>
        <span className="font-mono text-[10px] text-zinc-500">({runs.length})</span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-white/8 bg-white/[0.02] p-0.5">
            {(["ui", "api"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onRunFilterChange(key)}
                className={`rounded-md px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wide transition-colors ${
                  runFilter === key
                    ? "bg-white/10 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              placeholder="Run ID"
              value={historySearch}
              onChange={(e) => onHistorySearchChange(e.target.value)}
              className="h-7 w-36 rounded-lg border border-white/8 bg-[#08080A] pl-7 pr-2 font-mono text-[11px] text-zinc-300 outline-none placeholder:text-zinc-600 focus:border-purple-500/40"
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto [scrollbar-width:thin]">
        <table className="w-full text-left">
          <thead className="sticky top-0 z-10 bg-[#0A0A0C]/95 backdrop-blur-sm">
            <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-2 font-medium">Time</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Credits</th>
              <th className="px-4 py-2 text-right font-medium">Run ID</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-xs text-zinc-500">
                  No runs yet
                </td>
              </tr>
            ) : (
              runs.map((run) => {
                const isOptimistic = run.id.startsWith("optimistic-");
                const isSelected =
                  selectedRunId === run.id ||
                  (isRunning && optimisticRunId === run.id && selectedRunId === optimisticRunId);
                const credits = resolveCredits(run, isSelected);
                const d = new Date(run.startedAt);
                const displayStatus =
                  run.status === "success" ? "completed" : run.status;

                return (
                  <tr
                    key={run.id}
                    onClick={() => !isOptimistic && onSelectRun(run)}
                    className={`border-b border-white/[0.03] transition-colors ${
                      isOptimistic
                        ? "cursor-default"
                        : "cursor-pointer hover:bg-white/[0.02]"
                    } ${isSelected ? "bg-purple-500/[0.06]" : ""}`}
                  >
                    <td className="px-4 py-2 font-mono text-[11px] text-zinc-300">
                      {d.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      <span className="text-zinc-500">
                        {d.toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] capitalize ${
                          run.status === "success" || run.status === "completed"
                            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                            : run.status === "running"
                              ? "border-blue-500/25 bg-blue-500/10 text-blue-300"
                              : "border-red-500/25 bg-red-500/10 text-red-300"
                        }`}
                      >
                        {displayStatus}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-400/90">
                        <Coins className="h-3 w-3" />
                        {formatCreditsMillions(credits)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {isOptimistic ? (
                        <span className="font-mono text-[11px] italic text-zinc-500">pending</span>
                      ) : (
                        <div className="ml-auto inline-flex max-w-[160px] items-center justify-end gap-1">
                          <span className="truncate font-mono text-[10px] text-zinc-500">
                            {run.id.slice(0, 10)}…
                          </span>
                          <button
                            type="button"
                            title="Copy Run ID"
                            onClick={(e) => {
                              e.stopPropagation();
                              void navigator.clipboard.writeText(run.id);
                            }}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
