"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Clock,
  Search,
  Copy,
  Check,
  ChevronDown,
  Terminal,
  ExternalLink,
  Lock,
  FileText,
  Coins,
  Pencil,
} from "lucide-react";
import LeftSidebar from "@/components/workflow/LeftSidebar";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
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
  normalizeInputValuesForRun,
  type RequestFieldKind,
} from "@/lib/request-inputs";
import { uploadFilesViaApi } from "@/lib/upload";
import { formatWorkflowEstimateDisplay } from "@/lib/node-estimates";
import PlaygroundFieldRow from "@/components/playground/PlaygroundFieldRow";
import {
  buildPlaygroundOutputSections,
  countCompletedFromStates,
  countRunnableNodes,
  formatCreditsMillions,
  mergeNodeRunsWithLive,
  resolvePlaygroundRunStatus,
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

  const [activeTab, setActiveTab] = useState<"playground" | "api" | "workflow">("playground");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
  const [apiOrigin, setApiOrigin] = useState("https://api.galaxy.ai");

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
    
    // Check limit
    const currentVal = inputValues[fieldId] || "";
    const currentUrls = currentVal ? currentVal.split(",").filter(Boolean) : [];
    
    if (currentUrls.length + filesArray.length > 10) {
      alert("You can upload a maximum of 10 files.");
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
              return { ...prev, [fieldId]: [...prevUrls, ...localPreviews].slice(0, 10).join(",") };
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
            [fieldId]: [...cleanPrevUrls, ...validUrls].slice(0, 10).join(",")
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
    (nodeStates: Record<string, { status: string; output?: unknown; error?: string }>) => {
      setLiveNodeStates(nodeStates);
      // Accumulate live credits from completed node states
      const total = Object.values(nodeStates).reduce((sum, ns: any) => {
        return sum + (typeof ns.creditCost === "number" ? ns.creditCost : 0);
      }, 0);
      if (total > 0) setLiveRunCreditsMicro(total);
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
  // Build the live-credit-enriched optimistic row for the history table
  const optimisticRowForTable: WorkflowRunItem | null = optimisticRun
    ? {
        ...optimisticRun,
        // Reflect accumulated live credits directly in the optimistic row's nodeRuns credit total
        nodeRuns:
          liveRunCreditsMicro != null && liveRunCreditsMicro > 0
            ? [{ id: "live", nodeId: "live", nodeName: "", status: "running", creditCost: liveRunCreditsMicro, output: null, error: null, inputs: null, providerUsed: null, durationMs: null, startedAt: optimisticRun.startedAt, finishedAt: null }]
            : [],
      }
    : null;

  const filteredRuns = [
    ...(optimisticRowForTable ? [optimisticRowForTable] : []),
    ...runs.filter((r) => r.id.toLowerCase().includes(historySearch.toLowerCase())),
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left Sidebar */}
      <LeftSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="relative flex min-w-0 flex-1 overflow-hidden workflow-editor-layout">
        <div className="flex h-full w-full flex-col overflow-hidden bg-background">
          
          {/* Header Row */}
          <div className="shrink-0 border-b border-border pl-16 pr-6">
            <div className="flex items-center gap-3 pb-4 pt-5">
              <button
                onClick={() => router.push("/dashboard?tab=workflows")}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted cursor-pointer"
                title="Back to Flow"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h1 className="truncate text-lg font-semibold text-foreground">
                {workflow?.name || "Loading..."}
              </h1>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab("playground")}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer border-0 ${
                  activeTab === "playground"
                    ? "border-primary text-foreground border-b-2 border-solid"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                Playground
              </button>
              <button
                onClick={() => setActiveTab("api")}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer border-0 ${
                  activeTab === "api"
                    ? "border-primary text-foreground border-b-2 border-solid"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                API
              </button>
              <button
                onClick={() => setActiveTab("workflow")}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer border-0 ${
                  activeTab === "workflow"
                    ? "border-primary text-foreground border-b-2 border-solid"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                Workflow
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {/* ──── Tab 1: Playground ──── */}
            {activeTab === "playground" && (
              <div className="relative h-full overflow-y-auto p-4 sm:p-6 sm:pl-16">
                <div className="grid h-[72vh] grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[480px_1fr]">
                  
                  {/* Inputs Column */}
                  <div className="flex min-h-0 flex-col">
                    <div className="rounded-[18px] border bg-card text-card-foreground shadow-sm flex h-full flex-col overflow-hidden">
                      
                      <div className="flex p-6 flex-row items-center justify-between space-y-0 px-5 py-4">
                        <div>
                          <h2 className="text-sm font-semibold text-foreground">Inputs</h2>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Configure the input fields for this workflow run
                          </p>
                        </div>
                        <span className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                          Est. ~{estimatedCostLabel}M
                        </span>
                      </div>
                      
                      <div className="shrink-0 bg-border h-[1px] w-full"></div>
                      
                      <div className="p-6 min-h-0 flex-1 overflow-y-auto px-5 py-5">
                        {(() => {
                          const requestNode = (workflow?.nodes || []).find((n: any) => n.type === "requestInputs");
                          const fields = requestNode?.data?.fields || [];

                          if (!hasResponseConnection()) {
                            return (
                              <div className="py-10 text-center text-sm text-muted-foreground">
                                No edge connected to Response node.<br />
                                Please connect it in the workflow editor.
                              </div>
                            );
                          }

                          if (fields.length === 0) {
                            // Fallback: If no fields defined on the RequestInputs node, map over inputValues keys
                            return (
                              <div className="space-y-4">
                                {Object.keys(inputValues).map((key) => (
                                  <div key={key} className="flex flex-col gap-1.5">
                                    <label htmlFor={`input-${key}`} className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                      {key.replace(/([A-Z])/g, " $1").replace("_", " ")}
                                    </label>
                                    <textarea
                                      id={`input-${key}`}
                                      rows={3}
                                      value={inputValues[key]}
                                      onChange={(e) => setInputValues((prev) => ({ ...prev, [key]: e.target.value }))}
                                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                      placeholder={`Enter ${key}...`}
                                    />
                                  </div>
                                ))}
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-5">
                              {fields.map((field: WorkflowField) => (
                                <PlaygroundFieldRow
                                  key={field.id}
                                  field={field}
                                  value={inputValues[field.id] ?? ""}
                                  disabled={isRunning}
                                  isPromoted={!!field.linkedTarget}
                                  uploading={!!uploadingFields[field.id]}
                                  onChange={(val) =>
                                    setInputValues((prev) => ({ ...prev, [field.id]: val }))
                                  }
                                  onUpload={(files, kind) => handleFileUpload(field.id, files, kind)}
                                  onExpandText={() => setActiveExpandFieldId(field.id)}
                                />
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                      
                      {/* Run Action Container */}
                      <div className="flex flex-col gap-2 bg-muted/30 px-5 py-4">
                        <button
                          onClick={handleStartRun}
                          disabled={isRunning || !hasResponseConnection()}
                          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[18px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg transition-all w-full h-10 px-4 border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isRunning ? (
                            <>
                              <SpinningLogo size="sm" />
                              Running...
                              {runnableTotal > 0 && (
                                <span className="text-xs text-white/70">
                                  ({runnableDone}/{runnableTotal})
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <Play className="w-5 h-5" />
                              Run
                            </>
                          )}
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* Output Column */}
                  <div className="flex min-h-0 min-w-0 flex-col">
                    <div className="rounded-[18px] border bg-card text-card-foreground shadow-sm flex h-full flex-col overflow-hidden">
                      <div className="flex flex-row items-center justify-between px-5 py-4">
                        <div>
                          <h2 className="text-sm font-semibold text-foreground">Output</h2>
                          <p className="mt-0.5 text-xs text-muted-foreground">Results from workflow execution</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {(runStatus !== "idle" || usedCreditsMicro > 0) && (
                            <span className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                              Used ~{formatCreditsMillions(usedCreditsMicro)}
                            </span>
                          )}
                          {runStatus === "running" && (
                            <span className="rounded-full border border-amber-300/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600">
                              RUNNING
                            </span>
                          )}
                          {runStatus === "success" && (
                            <span className="rounded-full border border-green-300/40 bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-600">
                              COMPLETED
                            </span>
                          )}
                          {runStatus === "failed" && (
                            <span className="rounded-full border border-red-300/40 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                              FAILED
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 bg-border h-[1px] w-full" />
                      
                      <div className="min-h-0 flex-1 overflow-y-auto p-5">
                        {runStatus === "running" && outputSections.length === 0 && (
                          <div className="flex h-full flex-col items-center justify-center gap-4 py-12">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                              <SpinningLogo size="md" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium text-foreground">Running workflow...</p>
                              {runnableTotal > 0 && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {runnableDone} of {runnableTotal} nodes completed
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {workflowError && (
                          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                            <p className="text-sm font-medium text-destructive">Error</p>
                            <p className="mt-1 text-sm text-destructive/80">{workflowError}</p>
                          </div>
                        )}

                        {runStatus === "idle" && !workflowError && outputSections.length === 0 && (
                          <div className="flex h-full flex-col items-center justify-center gap-4 py-12 text-muted-foreground">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
                              <Play className="h-7 w-7 opacity-30" />
                            </div>
                            <p className="text-sm font-medium">No output yet</p>
                            <p className="text-xs">Run the workflow to see results here</p>
                          </div>
                        )}

                        {outputSections.length > 0 && (
                          <div className="space-y-6">
                            {outputSections.map((sec) => (
                              <div key={sec.nodeId}>
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  {sec.label}
                                </p>
                                {sec.kind === "error" && sec.error && (
                                  <p className="text-sm text-destructive">{sec.error}</p>
                                )}
                                {sec.url && sec.kind === "image" && (
                                  <div className="flex justify-center">
                                    <img
                                      src={sec.url}
                                      alt=""
                                      className="max-h-[400px] max-w-full rounded-lg border border-border object-contain"
                                    />
                                  </div>
                                )}
                                {sec.url && sec.kind === "video" && (
                                  <div className="flex justify-center">
                                    <video
                                      src={sec.url}
                                      controls
                                      className="max-h-[400px] max-w-full rounded-lg border border-border"
                                    />
                                  </div>
                                )}
                                {sec.url && sec.kind === "audio" && (
                                  <audio src={sec.url} controls className="w-full" />
                                )}
                                {sec.text && (
                                  <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs">
                                    {sec.text}
                                  </pre>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* History Table at bottom */}
                <div className="shrink-0 pt-4 sm:pt-6">
                  <div className="rounded-[18px] border bg-card text-card-foreground shadow-sm">
                    <div className="flex p-6 flex-row flex-wrap items-center gap-2 space-y-0 px-3 py-3 sm:px-5">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-foreground">Run History</h3>
                      <span className="text-xs text-muted-foreground">({filteredRuns.length})</span>
                      
                      <div className="ml-auto flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
                            <button
                              type="button"
                              onClick={() => setRunFilter("ui")}
                              className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors border-0 cursor-pointer ${
                                runFilter === "ui"
                                  ? "bg-background text-foreground shadow-sm font-bold"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              UI Runs
                            </button>
                            <button
                              type="button"
                              onClick={() => setRunFilter("api")}
                              className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors border-0 cursor-pointer ${
                                runFilter === "api"
                                  ? "bg-background text-foreground shadow-sm font-bold"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              API Runs
                            </button>
                          </div>
                        </div>

                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                          <input
                            type="text"
                            placeholder="Search by Run ID..."
                            value={historySearch}
                            onChange={(e) => setHistorySearch(e.target.value)}
                            className="flex rounded-[18px] border border-input bg-background px-3 h-8 py-1.5 pl-8 pr-3 text-xs w-full sm:w-48 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-0">
                      <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                          <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 bg-muted/30 text-xs text-muted-foreground">
                              <th className="h-12 text-left align-middle px-5 py-2 font-medium">Date & Time</th>
                              <th className="h-12 text-left align-middle px-3 py-2 font-medium">Status</th>
                              <th className="h-12 text-left align-middle px-3 py-2 font-medium">Used Credits</th>
                              <th className="h-12 text-right align-middle px-5 py-2 font-medium">Run ID</th>
                            </tr>
                          </thead>
                          <tbody className="[&_tr:last-child]:border-0">
                            {filteredRuns.length === 0 ? (
                              <tr>
                                <td className="p-4 align-middle px-5 py-10 text-center text-xs text-muted-foreground" colSpan={4}>
                                  No runs found.
                                </td>
                              </tr>
                            ) : (
                              filteredRuns.map((r) => {
                                const totalCost = r.nodeRuns.reduce((sum, nr) => sum + (nr.creditCost || 0), 0);
                                const isSelected = selectedRun?.id === r.id;
                                const isOptimistic = r.id.startsWith("optimistic-");
                                const displayStatus =
                                  r.status === "success" ? "completed" : r.status;
                                const d = new Date(r.startedAt);
                                const datePart = d.toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                });
                                const timePart = d.toLocaleTimeString("en-GB", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                });
                                return (
                                  <tr
                                    key={r.id}
                                    onClick={() => !isOptimistic && workflow && selectHistoryRun(r, workflow)}
                                    className={`border-b transition-colors ${
                                      isOptimistic
                                        ? "cursor-default"
                                        : "cursor-pointer hover:bg-muted/40"
                                    } ${isSelected ? "bg-primary/5" : ""}`}
                                  >
                                    {/* Date & Time */}
                                    <td className="p-4 align-middle px-5 py-2.5 text-[13px] text-foreground">
                                      {datePart}{" "}
                                      <span className="text-muted-foreground">{timePart}</span>
                                    </td>

                                    {/* Status badge */}
                                    <td className="p-4 align-middle px-3 py-2.5">
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                                          r.status === "success" || r.status === "completed"
                                            ? "border-green-300/40 bg-green-500/10 text-green-600 dark:text-green-400"
                                            : r.status === "running"
                                            ? "border-blue-300/40 bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-pulse"
                                            : "border-red-300/40 bg-red-500/10 text-red-600 dark:text-red-400"
                                        }`}
                                      >
                                        {displayStatus}
                                      </span>
                                    </td>

                                    {/* Credits badge with Coins icon */}
                                    <td className="p-4 align-middle px-3 py-2.5">
                                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                        <Coins className="h-3 w-3" />
                                        {formatCreditsMillions(totalCost)}
                                      </span>
                                    </td>

                                    {/* Run ID with copy button */}
                                    <td className="p-4 align-middle px-5 py-2.5 text-right">
                                      {isOptimistic ? (
                                        <span className="text-[13px] text-muted-foreground italic">pending…</span>
                                      ) : (
                                        <div className="ml-auto inline-flex max-w-[180px] items-center gap-1.5">
                                          <span className="min-w-0 flex-1 truncate text-right text-[13px] text-muted-foreground">
                                            {r.id}
                                          </span>
                                          <button
                                            type="button"
                                            title="Copy Run ID"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              navigator.clipboard.writeText(r.id);
                                            }}
                                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground border-0 bg-transparent cursor-pointer"
                                          >
                                            <Copy className="h-4 w-4" />
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

                  </div>
                </div>

              </div>
            )}

            {/* ──── Tab 2: API ──── */}
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

            {/* ──── Tab 3: Workflow Canvas ──── */}
            {activeTab === "workflow" && (
              <div className="p-6 pb-10">
                <div className="rounded-[18px] border border-gray-200 bg-white text-gray-900 shadow-sm">
                  {/* Header: title + white Edit button */}
                  <div className="flex flex-row items-center justify-between px-6 py-4">
                    <h3 className="text-lg font-semibold text-gray-900">Workflow Structure</h3>
                    <button
                      onClick={() => router.push(`/workflow/${workflowId}/canvas`)}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[18px] border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Edit Workflow
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="h-px w-full bg-gray-200" />

                  {/* Canvas box (read-only) */}
                  <div
                    className="relative overflow-hidden rounded-b-[18px] p-0"
                    style={{ height: "clamp(400px, calc(-260px + 100vh), 700px)" }}
                  >
                    <Canvas readOnly={true} />
                  </div>
                </div>
              </div>
            )}
            
          </div>

        </div>
      </div>

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
  onNodeStatesUpdate: (nodeStates: Record<string, { status: string; output?: any; error?: string }>) => void;
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
