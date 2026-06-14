"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Copy,
  Check,
  ChevronDown,
  Terminal,
  ExternalLink,
  Lock,
  FileText,
  Pencil,
} from "lucide-react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import {
  useWorkspaceIsland,
  useWorkspaceNavigate,
} from "@/components/workspace";
import { PlaygroundPageChrome } from "@/components/playground/PlaygroundPageChrome";
import { formatRelativeTime } from "@/lib/utils";
import { useAttachLiveRunOnFocus } from "@/lib/use-attach-live-run-on-focus";
import { SpinningLogo } from "@/components/SpinningLogo";
import Canvas from "@/components/workflow/Canvas";
import TextExpandModal from "@/components/workflow/TextExpandModal";
import { useWorkflowStore, type WorkflowField } from "@/store/workflow-store";
import { type Node, type Edge } from "@xyflow/react";
import {
  buildInputValuesFromFields,
  hydrateInputValuesFromRun,
  maxAssetsForField,
  normalizeInputValuesForRun,
  type RequestFieldKind,
} from "@/lib/request-inputs";
import { validateWorkflowInputsSync } from "@shashank519915/shared";
import { uploadFilesViaApi } from "@/lib/upload";
import { formatWorkflowEstimateDisplay } from "@/lib/node-estimates";
import { PlaygroundTab } from "@/components/playground/PlaygroundTab";
import {
  buildPlaygroundOutputSections,
  countCompletedFromStates,
  countRunnableNodes,
  formatCreditsMillions,
  mergeNodeRunsWithLive,
  resolveHistoryRowCreditsMicro,
  resolvePlaygroundRunStatus,
  sumLiveStatesCreditsMicro,
  sumRunCreditsMicro,
} from "@/lib/playground-output";

interface NodeRunItem {
  id: string;
  nodeId: string;
  nodeName: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  inputs: any;
  output: any;
  error: string | null;
  providerUsed: string | null;
  creditCost: number | null;
}

interface WorkflowRunItem {
  id: string;
  scope: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  orchestratorRunId: string | null;
  inputValues: any;
  nodeRuns: NodeRunItem[];
}

function renderHighlightedCode(code: string) {
  const lines = code.split("\n");
  return lines.map((line, index) => {
    let html = line
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    let comment = "";
    if (html.includes("#")) {
      const idx = html.indexOf("#");
      comment = `<span class="italic text-muted-foreground">${html.substring(idx)}</span>`;
      html = html.substring(0, idx);
    } else if (html.includes("//")) {
      const idx = html.indexOf("//");
      comment = `<span class="italic text-muted-foreground">${html.substring(idx)}</span>`;
      html = html.substring(0, idx);
    }
    
    html = html.replace(/(["'`])(.*?)\1/g, (match) => {
      return `<span class="text-emerald-600 dark:text-emerald-400">${match}</span>`;
    });

    const keywords = [
      "import", "time", "json", "requests", "def", "while", "True", "False", "return", "elif", "if", "in", "raise", "Exception", "print", "const", "let", "async", "await", "function", "require", "curl", "headers", "POST", "GET"
    ];
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "g");
      html = html.replace(regex, `<span class="text-violet-600 dark:text-violet-400">${keyword}</span>`);
    });

    const finalHtml = html + comment;

    return (
      <div key={index} className="flex">
        <span className="inline-block w-10 shrink-0 select-none pr-4 text-right text-muted-foreground/40">
          {index + 1}
        </span>
        <span className="text-foreground" dangerouslySetInnerHTML={{ __html: finalHtml || "&nbsp;" }} />
      </div>
    );
  });
}

export default function WorkflowWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  const { navigate: workspaceNavigate } = useWorkspaceNavigate();
  const [activeTab, setActiveTab] = useState<"playground" | "api" | "workflow">("playground");
  const [loading, setLoading] = useState(true);
  const [workflow, setWorkflow] = useState<any>(null);
  const [runs, setRuns] = useState<WorkflowRunItem[]>([]);
  const [selectedRun, setSelectedRun] = useState<WorkflowRunItem | null>(null);

  // Playground form state
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [estimatedCostLabel, setEstimatedCostLabel] = useState("0.10");
  const [liveNodeStates, setLiveNodeStates] = useState<
    Record<string, { status: string; output?: unknown; error?: string }>
  >({});
  const [liveRunCreditsMicro, setLiveRunCreditsMicro] = useState<number | null>(null);
  // Optimistic row shown in history table the moment Run is pressed, before DB confirms
  const [optimisticRun, setOptimisticRun] = useState<WorkflowRunItem | null>(null);

  // History filtering
  const [runFilter, setRunFilter] = useState<"ui" | "api">("ui");
  const [historySearch, setHistorySearch] = useState("");

  // Code snippet dropdown
  const [codeLanguage, setCodeLanguage] = useState<"python" | "nodejs" | "curl">("python");
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [inDetails, setInDetails] = useState(true);
  const [apiOrigin, setApiOrigin] = useState("https://api.thinkly.ai");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setApiOrigin(window.location.origin);
    }
  }, []);

  // Execution states
  const [isRunning, setIsRunning] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const currentRunIdRef = useRef<string | null>(null);
  const [orchestratorState, setOrchestratorState] = useState<{
    orchestratorRunId: string;
    publicAccessToken: string;
  } | null>(null);
  const orchestratorStateRef = useRef(orchestratorState);
  useEffect(() => {
    orchestratorStateRef.current = orchestratorState;
  }, [orchestratorState]);

  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
  const [activeExpandFieldId, setActiveExpandFieldId] = useState<string | null>(null);

  const handleFileUpload = async (
    fieldId: string,
    files: FileList | null,
    kind?: RequestFieldKind
  ) => {
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);

    const requestNode = (workflow?.nodes || []).find(
      (n: { type: string }) => n.type === "requestInputs"
    );
    const field = ((requestNode?.data?.fields || []) as WorkflowField[]).find(
      (f) => f.id === fieldId
    );
    const maxAssets = maxAssetsForField(field ?? { type: "file_field" });

    const currentVal = inputValues[fieldId] || "";
    const currentUrls = currentVal ? currentVal.split(",").filter(Boolean) : [];

    if (currentUrls.length + filesArray.length > maxAssets) {
      alert(`You can upload a maximum of ${maxAssets} file(s).`);
      return;
    }

    setUploadingFields((prev) => ({ ...prev, [fieldId]: true }));

    // For images, show local base64 previews immediately
    const imageFiles =
      kind === "image" ? filesArray.filter((file) => file.type.startsWith("image/")) : [];
    const localPreviews: string[] = [];
    let processedPreviews = 0;
    
    if (imageFiles.length > 0) {
      imageFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          localPreviews.push(ev.target?.result as string);
          processedPreviews++;
          if (processedPreviews === imageFiles.length) {
            setInputValues((prev) => {
              const prevVal = prev[fieldId] || "";
              const prevUrls = prevVal ? prevVal.split(",").filter(Boolean) : [];
              return { ...prev, [fieldId]: [...prevUrls, ...localPreviews].slice(0, maxAssets).join(",") };
            });
          }
        };
        reader.readAsDataURL(file);
      });
    }

    try {
      const { urls: validUrls, firstError } = await uploadFilesViaApi(filesArray);
      if (firstError) {
        window.alert(firstError);
      }

      if (validUrls.length === 0 && filesArray.length > 0 && !firstError) {
        window.alert("Upload failed. No files were saved.");
      }

      if (validUrls.length > 0) {
        setInputValues((prev) => {
          const prevVal = prev[fieldId] || "";
          // Filter out local base64 previews and append the real URLs
          const prevUrls = prevVal ? prevVal.split(",").filter(Boolean) : [];
          const cleanPrevUrls = prevUrls.filter(url => !url.startsWith("data:"));
          return {
            ...prev,
            [fieldId]: [...cleanPrevUrls, ...validUrls].slice(0, maxAssets).join(",")
          };
        });
      }
    } catch (err) {
      console.error("Upload error:", err);
      window.alert("Upload failed. Please try again.");
    } finally {
      setUploadingFields((prev) => ({ ...prev, [fieldId]: false }));
    }
  };

  // Load Canvas workspace data for the readonly Workflow Tab
  const { setNodes, setEdges, setWorkflowId, setWorkflowName } = useWorkflowStore();

  const applyWorkflowFieldsToInputs = useCallback(
    (wf: { nodes?: Array<{ type: string; data?: { fields?: WorkflowField[] } }> }) => {
      const requestNode = (wf.nodes || []).find((n) => n.type === "requestInputs");
      if (requestNode) {
        const fields = (requestNode.data?.fields || []) as WorkflowField[];
        setInputValues(buildInputValuesFromFields(fields));
      } else {
        setInputValues({});
      }
    },
    []
  );

  const selectHistoryRun = useCallback(
    (
      run: WorkflowRunItem,
      wf: { nodes?: Array<{ type: string; data?: { fields?: WorkflowField[] } }> } | null
    ) => {
      setSelectedRun(run);
      setLiveNodeStates({});
      setLiveRunCreditsMicro(sumRunCreditsMicro(run.nodeRuns));
      const requestNode = (wf?.nodes || []).find((n) => n.type === "requestInputs");
      if (requestNode) {
        const fields = (requestNode.data?.fields || []) as WorkflowField[];
        setInputValues(hydrateInputValuesFromRun(fields, run.inputValues));
      }
    },
    []
  );

  const fetchWorkflow = useCallback(async () => {
    try {
      const resp = await fetch(`/api/workflows/${workflowId}`);
      const data = await resp.json();
      if (data.data) {
        setWorkflow(data.data);
        setWorkflowId(workflowId);
        setWorkflowName(data.data.name);
        setNodes(data.data.nodes || []);
        setEdges(data.data.edges || []);
        const nodes = data.data.nodes || [];
        setEstimatedCostLabel(
          nodes.length > 0
            ? formatWorkflowEstimateDisplay(nodes)
            : "0.10",
        );
        return data.data as {
          nodes?: Array<{ type: string; data?: { fields?: WorkflowField[] } }>;
        };
      }
    } catch (err) {
      console.error("Failed to fetch workflow details:", err);
    }
    return null;
  }, [workflowId, setNodes, setEdges, setWorkflowId, setWorkflowName]);

  const fetchHistory = useCallback(async () => {
    try {
      const resp = await fetch(`/api/workflows/${workflowId}/history`);
      const data = await resp.json();
      if (data.data) {
        const list = data.data as WorkflowRunItem[];
        setRuns(list);
        return list;
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
    return [] as WorkflowRunItem[];
  }, [workflowId]);

  const restoreLiveRun = useCallback(
    async (
      runsList: WorkflowRunItem[],
      wf: { nodes?: Array<{ type: string; data?: { fields?: WorkflowField[] } }> } | null,
      options?: { attachOnly?: boolean; force?: boolean }
    ) => {
      const runningRun = runsList.find((r) => r.status === "running");
      if (!runningRun?.orchestratorRunId) {
        if (!options?.attachOnly) {
          setSelectedRun(null);
          setLiveNodeStates({});
          setLiveRunCreditsMicro(null);
          if (wf) applyWorkflowFieldsToInputs(wf);
        }
        return;
      }

      if (
        !options?.force &&
        orchestratorStateRef.current?.orchestratorRunId === runningRun.orchestratorRunId
      ) {
        return;
      }

      selectHistoryRun(runningRun, wf);

      const tokenResp = await fetch(`/api/workflows/${workflowId}/node-runs/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orchestratorRunId: runningRun.orchestratorRunId }),
      });
      if (!tokenResp.ok) return;
      const tokenData = await tokenResp.json();
      const { publicAccessToken } = tokenData.data ?? {};
      if (!publicAccessToken) return;

      setIsRunning(true);
      setCurrentRunId(runningRun.id);
      currentRunIdRef.current = runningRun.id;
      setOrchestratorState({
        orchestratorRunId: runningRun.orchestratorRunId,
        publicAccessToken,
      });
    },
    [workflowId, selectHistoryRun, applyWorkflowFieldsToInputs]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const wf = await fetchWorkflow();
      const runsList = await fetchHistory();
      if (cancelled) return;
      await restoreLiveRun(runsList, wf);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [workflowId, fetchWorkflow, fetchHistory, restoreLiveRun]);

  const tryAttachExternalRun = useCallback(async () => {
    const runsList = await fetchHistory();
    const runningRun = runsList.find((r) => r.status === "running");
    if (!runningRun?.orchestratorRunId) return;
    const wf = workflow ?? (await fetchWorkflow());
    await restoreLiveRun(runsList, wf, { attachOnly: true });
  }, [fetchHistory, fetchWorkflow, workflow, restoreLiveRun]);

  useAttachLiveRunOnFocus(() => tryAttachExternalRun(), !!orchestratorState);

  // Check if response node is connected
  const hasResponseConnection = useCallback(() => {
    if (!workflow) return false;
    const edges = workflow.edges || [];
    return edges.some((e: any) => e.target === "response");
  }, [workflow]);

  // Starts workflow execution run
  const getRequestFields = useCallback((): WorkflowField[] => {
    const requestNode = (workflow?.nodes || []).find((n: { type: string }) => n.type === "requestInputs");
    return (requestNode?.data?.fields || []) as WorkflowField[];
  }, [workflow]);

  const handleStartRun = async () => {
    if (isRunning) return;
    const fields = getRequestFields();
    const payload = normalizeInputValuesForRun(fields, inputValues);

    const limitErr = validateWorkflowInputsSync({
      nodes: (workflow?.nodes || []).map((n: { id: string; type: string; data?: unknown }) => ({
        id: n.id,
        type: n.type,
        data: (n.data ?? {}) as Record<string, unknown>,
      })),
      inputValues: payload,
      scope: "full",
    });
    if (limitErr) {
      window.alert(limitErr.message);
      return;
    }

    setInputValues(payload);
    setIsRunning(true);
    setLiveNodeStates({});
    setLiveRunCreditsMicro(null);

    // Show an optimistic "running" row in the history table immediately
    const optimistic: WorkflowRunItem = {
      id: `optimistic-${Date.now()}`,
      scope: "full",
      status: "running",
      startedAt: new Date().toISOString(),
      finishedAt: null,
      durationMs: null,
      orchestratorRunId: null,
      inputValues: payload,
      nodeRuns: [],
    };
    setOptimisticRun(optimistic);
    setSelectedRun(optimistic);

    try {
      const resp = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "full",
          inputValues: payload,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed to trigger run" }));
        alert(err.error || "Failed to trigger run");
        setIsRunning(false);
        setOptimisticRun(null);
        setSelectedRun(null);
        return;
      }

      const data = await resp.json();
      const { runId, orchestratorRunId, publicAccessToken } = data.data ?? {};

      setCurrentRunId(runId);
      currentRunIdRef.current = runId;
      setOrchestratorState({ orchestratorRunId, publicAccessToken });
    } catch (err) {
      console.error("Failed to run workflow:", err);
      setIsRunning(false);
      setOptimisticRun(null);
      setSelectedRun(null);
    }
  };

  // Refresh history list silently (updates run list / credits in history table)
  // without touching selectedRun or liveNodeStates while a run is in progress.
  const refreshCurrentRunSnapshot = useCallback(
    async (runId: string) => {
      const resp = await fetch(`/api/workflows/${workflowId}/history`);
      const data = await resp.json();
      if (data.data) {
        setRuns(data.data as WorkflowRunItem[]);
      }
    },
    [workflowId]
  );

  const handleOrchestratorUpdate = useCallback(
    (
      nodeStates: Record<
        string,
        { status: string; output?: unknown; error?: string; creditCost?: number | null }
      >
    ) => {
      setLiveNodeStates(nodeStates);
      setLiveRunCreditsMicro(sumLiveStatesCreditsMicro(nodeStates));
    },
    []
  );

  const handleOrchestratorComplete = useCallback(
    (finalStatus: string) => {
      // Use ref to avoid stale closure — currentRunId state may lag behind
      const finishedRunId = currentRunIdRef.current;
      setIsRunning(false);
      setCurrentRunId(null);
      currentRunIdRef.current = null;
      setOrchestratorState(null);
      setLiveNodeStates({});
      setOptimisticRun(null); // drop optimistic row — real row will show from history
      void (async () => {
        const list = await fetchHistory();
        if (finishedRunId) {
          const match = list.find((r) => r.id === finishedRunId);
          if (match && workflow) selectHistoryRun(match, workflow);
        }
      })();
    },
    [fetchHistory, workflow, selectHistoryRun]
  );

  const graphNodes = (workflow?.nodes || []).map((n: { id: string; type: string }) => ({
    id: n.id,
    type: n.type,
  }));
  const graphEdges = (workflow?.edges || []).map((e: { source: string; target: string }) => ({
    source: e.source,
    target: e.target,
  }));

  const activeRun = selectedRun;
  const displayNodeRuns = mergeNodeRunsWithLive(
    activeRun?.nodeRuns ?? [],
    isRunning ? liveNodeStates : null
  );
  const runStatus = resolvePlaygroundRunStatus(activeRun?.status, isRunning);
  const usedCreditsMicro =
    liveRunCreditsMicro ??
    (activeRun ? sumRunCreditsMicro(activeRun.nodeRuns) : 0);
  const runnableTotal = countRunnableNodes(graphNodes, graphEdges);
  const runnableDone = isRunning
    ? countCompletedFromStates(graphNodes, graphEdges, liveNodeStates)
    : displayNodeRuns.filter((nr) => {
        if (nr.status !== "success") return false;
        const t = graphNodes.find((n: { id: string; type: string }) => n.id === nr.nodeId)?.type ?? "";
        return !["requestInputs", "response"].includes(t);
      }).length;

  const { sections: outputSections, workflowError } = buildPlaygroundOutputSections(
    workflow?.nodes || [],
    displayNodeRuns,
    {
      workflowFailed: runStatus === "failed",
      workflowError:
        activeRun?.nodeRuns?.find((nr) => nr.status === "failed")?.error ?? null,
    }
  );

  const apiInputValues = normalizeInputValuesForRun(getRequestFields(), inputValues);

  const inputJson4  = JSON.stringify(apiInputValues, null, 4).replace(/\n/g, "\n    ");
  const inputJson6  = JSON.stringify(apiInputValues, null, 6).replace(/\n/g, "\n      ");
  const inputJsonCurl = JSON.stringify(apiInputValues, null, 6).replace(/\n/g, "\n    ");

  // Code templates — wired to our actual POST /api/v1/runs and GET /api/v1/runs/:id
  const codeTemplates = {
    python: `import requests
import time
import json

api_key = "YOUR_API_KEY"
url = "${apiOrigin}/api/v1/runs"

data = {
    "workflowId": "${workflowId}",
    "inputValues": ${inputJson4}
}

def poll_for_result(run_id):
    """Poll until the run finishes"""
    poll_url = f"${apiOrigin}/api/v1/runs/{'{run_id}'}"
    while True:
        response = requests.get(
            poll_url,
            headers={"Authorization": f"Bearer {'{api_key}'}"}
        )
        result = response.json()["data"]

        if result["status"] == "success":
            return result
        elif result["status"] in ["failed", "canceled"]:
            raise Exception(f"Run ended: {'{result.get(\\"status\\")}'}")

        time.sleep(5)

# Start the run
response = requests.post(
    url,
    json=data,
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {'{api_key}'}"
    }
)

result = response.json()
run_id = result["data"]["runId"]
print(f"Run started: {'{run_id}'}")

# Poll for result
final = poll_for_result(run_id)
print(json.dumps(final, indent=2))`,

    nodejs: `const response = await fetch("${apiOrigin}/api/v1/runs", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_API_KEY",
  },
  body: JSON.stringify({
    workflowId: "${workflowId}",
    inputValues: ${inputJson6}
  }),
});

const data = await response.json();
const runId = data.data.runId;
console.log("Run started:", runId);

// Poll for result
async function pollForResult(runId) {
  while (true) {
    const res = await fetch(\`${apiOrigin}/api/v1/runs/\${runId}\`, {
      headers: { "Authorization": "Bearer YOUR_API_KEY" }
    });
    const result = (await res.json()).data;

    if (result.status === "success") {
      return result;
    } else if (["failed", "canceled"].includes(result.status)) {
      throw new Error(\`Run ended: \${result.status}\`);
    }

    await new Promise(r => setTimeout(r, 5000));
  }
}

const final = await pollForResult(runId);
console.log(JSON.stringify(final, null, 2));`,

    curl: `curl -X POST ${apiOrigin}/api/v1/runs \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "workflowId": "${workflowId}",
    "inputValues": ${inputJsonCurl}
  }'

# Poll execution status (replace RUN_ID with the returned runId)
curl -X GET ${apiOrigin}/api/v1/runs/RUN_ID \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeTemplates[codeLanguage]);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Filter history runs list
  const optimisticRowForTable: WorkflowRunItem | null = optimisticRun;

  const filteredRuns = [
    ...(optimisticRowForTable ? [optimisticRowForTable] : []),
    ...runs.filter((r) => r.id.toLowerCase().includes(historySearch.toLowerCase())),
  ];

  useWorkspaceIsland({
    loading,
    createWorkflow: () => workspaceNavigate("/dashboard?tab=workflows", "close"),
    onImportClick: () => workspaceNavigate("/dashboard?tab=workflows", "close"),
  });

  return (
    <div className="relative flex h-full min-h-0 flex-col justify-start overflow-hidden">
      <PlaygroundPageChrome
        workflowName={workflow?.name || "Loading…"}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBack={() => workspaceNavigate("/dashboard?tab=workflows", "close")}
      >
        {activeTab === "playground" && (
          <PlaygroundTab
            workflow={workflow}
            inputValues={inputValues}
            uploadingFields={uploadingFields}
            estimatedCostLabel={estimatedCostLabel}
            isRunning={isRunning}
            hasResponseConnection={hasResponseConnection()}
            runStatus={runStatus}
            runnableDone={runnableDone}
            runnableTotal={runnableTotal}
            usedCreditsMicro={usedCreditsMicro}
            formatCredits={formatCreditsMillions}
            outputSections={outputSections}
            workflowError={workflowError}
            onInputChange={(fieldId, value) =>
              setInputValues((prev) => ({ ...prev, [fieldId]: value }))
            }
            onUpload={(fieldId, files, kind) => handleFileUpload(fieldId, files, kind)}
            onExpandText={setActiveExpandFieldId}
            onStartRun={handleStartRun}
            runs={filteredRuns}
            runFilter={runFilter}
            onRunFilterChange={setRunFilter}
            historySearch={historySearch}
            onHistorySearchChange={setHistorySearch}
            selectedRunId={selectedRun?.id}
            optimisticRunId={optimisticRun?.id}
            liveCreditsMicro={liveRunCreditsMicro}
            onSelectRun={(run) => workflow && selectHistoryRun(run as WorkflowRunItem, workflow)}
            resolveHistoryCredits={(run, isSelected) =>
              resolveHistoryRowCreditsMicro({
                nodeRuns: run.nodeRuns,
                isSelected,
                isRunning,
                liveCreditsMicro: liveRunCreditsMicro,
              })
            }
          />
        )}

        {activeTab === "api" && (
              <div className="flex h-full gap-6 overflow-hidden p-6">

                {/* Left: Code snippets block */}
                <div className="flex w-[45%] min-w-0 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                    {/* Language selector button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setLangDropdownOpen((o) => !o)}
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-[18px] px-3 text-xs cursor-pointer"
                      >
                        {codeLanguage === "python" ? "Python" : codeLanguage === "nodejs" ? "Node.js" : "cURL"}
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      {langDropdownOpen && (
                        <div className="absolute left-0 top-full z-50 mt-1 min-w-[120px] rounded-xl border border-border bg-card p-1 shadow-lg">
                          {(["python", "nodejs", "curl"] as const).map((lang) => (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => { setCodeLanguage(lang); setLangDropdownOpen(false); }}
                              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-muted cursor-pointer border-0 bg-transparent ${codeLanguage === lang ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                            >
                              {lang === "python" ? "Python" : lang === "nodejs" ? "Node.js" : "cURL"}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Copy button */}
                    <button
                      onClick={copyToClipboard}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 rounded-[18px] px-3 text-xs bg-transparent border-0 cursor-pointer"
                    >
                      {copiedCode ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedCode ? "Copied" : "Copy"}
                    </button>
                  </div>
                  {/* Code body — select-text so user can select individual characters */}
                  <div className="flex-1 overflow-auto p-4">
                    <pre className="font-mono text-[13px] leading-relaxed select-text whitespace-pre">
                      {renderHighlightedCode(codeTemplates[codeLanguage])}
                    </pre>
                  </div>
                </div>

                {/* Right: API Docs column */}
                <div className="min-w-0 flex-1 overflow-y-auto">
                  <div className="space-y-6">

                    {/* API Endpoint */}
                    <div>
                      <h3 className="mb-3 text-base font-semibold text-foreground">API Endpoint</h3>
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                        <span className="shrink-0 rounded bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700 dark:bg-green-500/10 dark:text-green-400">POST</span>
                        <code className="truncate font-mono text-sm text-foreground">{apiOrigin}/api/v1/runs</code>
                      </div>
                    </div>

                    {/* Start response */}
                    <div>
                      <h3 className="mb-3 text-base font-semibold text-foreground">Start Response</h3>
                      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                        <p className="text-sm text-foreground">
                          Returns a <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">runId</code> immediately. Use it to poll for status.
                        </p>
                        <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3">
                          <pre className="whitespace-pre font-mono text-xs text-foreground/80">{`{
  "data": {
    "runId": "clxyz...",
    "status": "running",
    "orchestratorRunId": "run_abc123..."
  }
}`}</pre>
                        </div>
                      </div>
                    </div>

                    {/* Polling */}
                    <div>
                      <h3 className="mb-3 text-base font-semibold text-foreground">Poll for Status</h3>
                      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                        <p className="text-sm text-foreground">
                          Poll <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">GET /api/v1/runs/{"{runId}"}</code> until status is terminal:
                        </p>

                        {/* Status badges — lowercase, matching our DB */}
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span className="rounded px-2 py-0.5 font-mono text-[11px] font-medium bg-muted text-muted-foreground">running</span>
                          <span className="rounded px-2 py-0.5 font-mono text-[11px] font-medium bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400">success</span>
                          <span className="rounded px-2 py-0.5 font-mono text-[11px] font-medium bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">failed</span>
                        </div>

                        {/* GET endpoint pill */}
                        <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                          <div className="flex items-center gap-2 font-mono text-sm text-foreground">
                            <span className="shrink-0 rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">GET</span>
                            <code className="truncate text-xs">/api/v1/runs/{"{runId}"}</code>
                          </div>
                        </div>

                        <p className="mt-2 text-xs text-muted-foreground">Always returns full node runs. Sample response:</p>
                        <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3">
                          <pre className="whitespace-pre font-mono text-xs text-foreground/80">{`{
  "data": {
    "id": "clxyz...",
    "workflowId": "${workflowId}",
    "scope": "full",
    "status": "success",
    "startedAt": "2025-01-01T00:00:00.000Z",
    "finishedAt": "2025-01-01T00:00:12.000Z",
    "durationMs": 12000,
    "inputValues": { ... },
    "nodeRuns": [
      {
        "id": "nr_abc...",
        "nodeId": "node_proc...",
        "nodeName": "Generate Image",
        "status": "success",
        "startedAt": "2025-01-01T00:00:01.000Z",
        "finishedAt": "2025-01-01T00:00:11.000Z",
        "durationMs": 10000,
        "inputs": { "prompt": "a horse running in fields" },
        "output": { "result": "https://cdn.example.com/output.png" },
        "error": null,
        "providerUsed": "fal",
        "creditCost": 100000
      }
    ]
  }
}`}</pre>
                        </div>
                      </div>
                    </div>

                    {/* Webhooks */}
                    <div>
                      <h3 className="mb-2 text-base font-semibold text-foreground">Webhooks (Optional)</h3>
                      <p className="mb-3 text-sm text-muted-foreground">
                        Configure a webhook URL on your workflow to receive push notifications when a run completes or fails. Events fired:{" "}
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">run.started</code>,{" "}
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">run.completed</code>,{" "}
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">run.failed</code>.
                      </p>
                      <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3">
                        <pre className="whitespace-pre font-mono text-xs text-foreground/80">{`// Payload delivered to your webhook URL
{
  "success": true,
  "type": "run.completed",
  "runId": "clxyz...",
  "workflowId": "${workflowId}",
  "data": { ... },
  "error": null
}`}</pre>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
        )}

        {activeTab === "workflow" && (
              <div className="h-full overflow-auto p-4 sm:p-6">
                <div className="rounded-[18px] border border-white/[0.08] bg-[#0A0A0C]/90 text-zinc-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                  <div className="flex flex-row items-center justify-between px-6 py-4">
                    <h3 className="text-lg font-semibold text-zinc-100">Workflow Structure</h3>
                    <button
                      onClick={() => workspaceNavigate(`/workflow/${workflowId}/canvas`, "open")}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-zinc-100 cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Edit Workflow
                    </button>
                  </div>

                  <div className="h-px w-full bg-white/[0.05]" />

                  <div
                    className="relative overflow-hidden rounded-b-[18px] bg-[#050505] p-0"
                    style={{ height: "clamp(400px, calc(-260px + 100vh), 700px)" }}
                  >
                    <Canvas readOnly={true} />
                  </div>
                </div>
              </div>
        )}
      </PlaygroundPageChrome>

      {/* SSE Real-time execution subscriber */}
      {orchestratorState && (
        <OrchestratorSubscriber
          orchestratorRunId={orchestratorState.orchestratorRunId}
          publicAccessToken={orchestratorState.publicAccessToken}
          onNodeStatesUpdate={handleOrchestratorUpdate}
          onComplete={handleOrchestratorComplete}
        />
      )}

      {/* Text Expand Modal Portal */}
      {activeExpandFieldId && (() => {
        const requestNode = (workflow?.nodes || []).find((n: any) => n.type === "requestInputs");
        const fields = requestNode?.data?.fields || [];
        const field = fields.find((f: any) => f.id === activeExpandFieldId) || { id: activeExpandFieldId, label: activeExpandFieldId.replace(/([A-Z])/g, " $1").replace("_", " ") };
        const displayValue = inputValues[activeExpandFieldId] || "";

        return (
          <TextExpandModal
            title={field.label}
            value={displayValue}
            onChange={(val) => setInputValues((prev) => ({ ...prev, [activeExpandFieldId]: val }))}
            onClose={() => setActiveExpandFieldId(null)}
          />
        );
      })()}
    </div>
  );
}

// Invisible subscription connector
interface SubscriberProps {
  orchestratorRunId: string;
  publicAccessToken: string;
  onNodeStatesUpdate: (
    nodeStates: Record<
      string,
      { status: string; output?: unknown; error?: string; creditCost?: number | null }
    >
  ) => void;
  onComplete: (finalStatus: string) => void;
}

function OrchestratorSubscriber({
  orchestratorRunId,
  publicAccessToken,
  onNodeStatesUpdate,
  onComplete,
}: SubscriberProps) {
  const { run } = useRealtimeRun(orchestratorRunId, {
    accessToken: publicAccessToken,
  });

  const firedCompleteRef = useRef(false);

  useEffect(() => {
    if (!run?.metadata) return;
    const nodeStates = (run.metadata as Record<string, unknown>)["nodeStates"];
    if (nodeStates) {
      onNodeStatesUpdate(nodeStates as any);
    }
  }, [run?.metadata, onNodeStatesUpdate]);

  useEffect(() => {
    if (!run || firedCompleteRef.current) return;

    const ACTIVE_STATUSES = new Set([
      "PENDING_VERSION", "QUEUED", "DEQUEUED", "EXECUTING", "WAITING", "DELAYED",
    ]);

    if (run.status === "COMPLETED") {
      firedCompleteRef.current = true;
      const finalStatus = ((run.metadata as any)?.["finalStatus"] as string) ?? "success";
      onComplete(finalStatus);
    } else if (!ACTIVE_STATUSES.has(run.status)) {
      firedCompleteRef.current = true;
      onComplete("failed");
    }
  }, [run, onComplete]);

  return null;
}
