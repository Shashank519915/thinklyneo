"use client";

import { Coins, Play } from "lucide-react";
import type { WorkflowField } from "@/store/workflow-store";
import type { RequestFieldKind } from "@/lib/request-inputs";
import type { PlaygroundOutputSection } from "@/lib/playground-output";
import { SpinningLogo } from "@/components/SpinningLogo";
import PlaygroundFieldRow from "@/components/playground/PlaygroundFieldRow";
import { PlaygroundBezel } from "./PlaygroundBezel";
import { PlaygroundHistoryPanel, type PlaygroundHistoryRun } from "./PlaygroundHistoryPanel";
import {
  PlaygroundEmptyOutput,
  PlaygroundOutputMedia,
} from "./PlaygroundOutputMedia";
import { PlaygroundStatusPill } from "./PlaygroundStatusPill";

type RunStatus = "idle" | "running" | "success" | "failed";

export type PlaygroundTabProps = {
  workflow: { nodes?: Array<{ type: string; data?: { fields?: WorkflowField[] } }> } | null;
  inputValues: Record<string, string>;
  uploadingFields: Record<string, boolean>;
  estimatedCostLabel: string;
  isRunning: boolean;
  hasResponseConnection: boolean;
  runStatus: RunStatus;
  runnableDone: number;
  runnableTotal: number;
  usedCreditsMicro: number;
  formatCredits: (micro: number) => string;
  outputSections: PlaygroundOutputSection[];
  workflowError: string | null | undefined;
  onInputChange: (fieldId: string, value: string) => void;
  onUpload: (fieldId: string, files: FileList | null, kind?: RequestFieldKind) => void;
  onExpandText: (fieldId: string) => void;
  onStartRun: () => void;
  runs: PlaygroundHistoryRun[];
  runFilter: "ui" | "api";
  onRunFilterChange: (filter: "ui" | "api") => void;
  historySearch: string;
  onHistorySearchChange: (value: string) => void;
  selectedRunId?: string | null;
  optimisticRunId?: string | null;
  liveCreditsMicro: number | null;
  onSelectRun: (run: PlaygroundHistoryRun) => void;
  resolveHistoryCredits: (run: PlaygroundHistoryRun, isSelected: boolean) => number;
};

export function PlaygroundTab({
  workflow,
  inputValues,
  uploadingFields,
  estimatedCostLabel,
  isRunning,
  hasResponseConnection,
  runStatus,
  runnableDone,
  runnableTotal,
  usedCreditsMicro,
  formatCredits,
  outputSections,
  workflowError,
  onInputChange,
  onUpload,
  onExpandText,
  onStartRun,
  runs,
  runFilter,
  onRunFilterChange,
  historySearch,
  onHistorySearchChange,
  selectedRunId,
  optimisticRunId,
  liveCreditsMicro,
  onSelectRun,
  resolveHistoryCredits,
}: PlaygroundTabProps) {
  const requestNode = (workflow?.nodes || []).find((n) => n.type === "requestInputs");
  const fields = (requestNode?.data?.fields || []) as WorkflowField[];

  return (
    <div className="flex h-full min-h-0 flex-col p-2 sm:p-3">
      <PlaygroundBezel className="min-h-0 flex-1">
        <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto] gap-0">
          <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[minmax(300px,360px)_1fr]">
            {/* Inputs */}
            <div className="flex min-h-0 flex-col border-b border-white/5 lg:border-b-0 lg:border-r">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">Inputs</h2>
                  <p className="text-[11px] text-zinc-500">Request fields for this run</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-1 font-mono text-[10px] text-amber-400/90">
                  <Coins className="h-3 w-3" />~{estimatedCostLabel}M est.
                </span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 [scrollbar-width:thin]">
                {!hasResponseConnection ? (
                  <p className="py-8 text-center text-xs leading-relaxed text-zinc-500">
                    Connect Request Inputs to the Response node in the workflow editor, then return
                    here to run.
                  </p>
                ) : fields.length === 0 ? (
                  <div className="space-y-3">
                    {Object.keys(inputValues).map((key) => (
                      <div key={key} className="space-y-1.5">
                        <label
                          htmlFor={`input-${key}`}
                          className="font-mono text-[10px] uppercase tracking-wide text-zinc-500"
                        >
                          {key}
                        </label>
                        <textarea
                          id={`input-${key}`}
                          rows={3}
                          value={inputValues[key]}
                          disabled={isRunning}
                          onChange={(e) => onInputChange(key, e.target.value)}
                          className="w-full resize-y rounded-xl border border-white/8 bg-[#08080A] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-purple-500/40 disabled:opacity-50"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field) => (
                      <PlaygroundFieldRow
                        key={field.id}
                        field={field}
                        value={inputValues[field.id] ?? ""}
                        disabled={isRunning}
                        isPromoted={!!field.linkedTarget}
                        uploading={!!uploadingFields[field.id]}
                        onChange={(val) => onInputChange(field.id, val)}
                        onUpload={(files, kind) => onUpload(field.id, files, kind)}
                        onExpandText={() => onExpandText(field.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-white/5 bg-white/[0.01] px-4 py-3">
                <button
                  type="button"
                  onClick={onStartRun}
                  disabled={isRunning || !hasResponseConnection}
                  className="group flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 font-semibold text-white shadow-[0_4px_20px_-4px_rgba(139,92,246,0.5)] transition-all hover:bg-purple-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isRunning ? (
                    <>
                      <SpinningLogo size="sm" />
                      <span className="text-sm">Running</span>
                      {runnableTotal > 0 && (
                        <span className="font-mono text-[11px] text-white/70">
                          {runnableDone}/{runnableTotal}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 transition-transform group-hover:scale-110" />
                      <span className="text-sm">Run workflow</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Output */}
            <div className="flex min-h-0 min-w-0 flex-col">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">Output</h2>
                  <p className="text-[11px] text-zinc-500">Live results from execution</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(runStatus !== "idle" || usedCreditsMicro > 0) && (
                    <span className="font-mono text-[10px] text-zinc-500">
                      Used {formatCredits(usedCreditsMicro)}
                    </span>
                  )}
                  {runStatus !== "idle" && <PlaygroundStatusPill status={runStatus} />}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:thin]">
                {runStatus === "running" && outputSections.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 py-12">
                    <SpinningLogo size="md" />
                    {runnableTotal > 0 && (
                      <p className="font-mono text-[11px] text-zinc-500">
                        {runnableDone} / {runnableTotal} nodes
                      </p>
                    )}
                  </div>
                )}

                {workflowError && (
                  <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                    <p className="text-xs font-medium text-red-300">Workflow error</p>
                    <p className="mt-1 text-xs text-red-300/80">{workflowError}</p>
                  </div>
                )}

                {runStatus === "idle" && !workflowError && outputSections.length === 0 && (
                  <PlaygroundEmptyOutput />
                )}

                {outputSections.length > 0 && (
                  <div className="space-y-5">
                    {outputSections.map((sec) => (
                      <section key={sec.nodeId}>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="font-mono text-[10px] uppercase tracking-wide text-zinc-500">
                            {sec.label}
                          </span>
                          <span className="h-px flex-1 bg-white/5" />
                        </div>
                        <PlaygroundOutputMedia section={sec} />
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* History */}
          <div className="max-h-[220px] min-h-[140px] shrink-0 border-t border-white/5">
            <PlaygroundHistoryPanel
              runs={runs}
              runFilter={runFilter}
              onRunFilterChange={onRunFilterChange}
              historySearch={historySearch}
              onHistorySearchChange={onHistorySearchChange}
              selectedRunId={selectedRunId}
              optimisticRunId={optimisticRunId}
              isRunning={isRunning}
              liveCreditsMicro={liveCreditsMicro}
              onSelectRun={onSelectRun}
              resolveCredits={resolveHistoryCredits}
            />
          </div>
        </div>
      </PlaygroundBezel>
    </div>
  );
}
