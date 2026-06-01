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
  AlignLeft,
  Image,
  Video,
  Trash2,
  Volume2,
  FileText,
  Maximize2,
  X,
} from "lucide-react";
import LeftSidebar from "@/components/workflow/LeftSidebar";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { formatRelativeTime } from "@/lib/utils";
import { SpinningLogo } from "@/components/SpinningLogo";
import Canvas from "@/components/workflow/Canvas";
import TextExpandModal from "@/components/workflow/TextExpandModal";
import { useWorkflowStore } from "@/store/workflow-store";
import { type Node, type Edge } from "@xyflow/react";

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
  const [estimatedCost, setEstimatedCost] = useState(0.25);

  // History filtering
  const [runFilter, setRunFilter] = useState<"ui" | "api">("ui");
  const [historySearch, setHistorySearch] = useState("");

  // Code snippet dropdown
  const [codeLanguage, setCodeLanguage] = useState<"python" | "nodejs" | "curl">("python");
  const [copiedCode, setCopiedCode] = useState(false);
  const [apiOrigin, setApiOrigin] = useState("https://api.galaxy.ai");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setApiOrigin(window.location.origin);
    }
  }, []);

  // Execution states
  const [isRunning, setIsRunning] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [orchestratorState, setOrchestratorState] = useState<{
    orchestratorRunId: string;
    publicAccessToken: string;
  } | null>(null);

  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
  const [activeExpandFieldId, setActiveExpandFieldId] = useState<string | null>(null);

  const getFieldType = (field: any) => {
    if (field.type) {
      if (field.type === "image_field") return "image";
      if (field.type === "video_field") return "video";
      if (field.type === "audio_field") return "audio";
      if (field.type === "text_field") return "text";
      return field.type;
    }
    if (field.id.startsWith("field_image_")) return "image";
    if (field.id.startsWith("field_video_")) return "video";
    if (field.id.startsWith("field_audio_")) return "audio";
    if (field.id.startsWith("field_text_")) return "text";
    return "text";
  };

  const handleFileUpload = async (fieldId: string, files: FileList | null) => {
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
    const imageFiles = filesArray.filter((file) => file.type.startsWith("image/"));
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
      // Upload all files in parallel
      const uploadPromises = filesArray.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        return data.url || null;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter((url): url is string => url !== null);

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
    } finally {
      setUploadingFields((prev) => ({ ...prev, [fieldId]: false }));
    }
  };

  // Load Canvas workspace data for the readonly Workflow Tab
  const { setNodes, setEdges, setWorkflowId, setWorkflowName } = useWorkflowStore();

  const fetchWorkflow = useCallback(async () => {
    try {
      const resp = await fetch(`/api/workflows/${workflowId}`);
      const data = await resp.json();
      if (data.data) {
        setWorkflow(data.data);
        setWorkflowId(workflowId);
        setWorkflowName(data.data.name);
        
        // Populates Zustand store for the read-only Canvas view
        setNodes(data.data.nodes || []);
        setEdges(data.data.edges || []);

        // Load input fields from Request-Inputs node
        const requestNode = (data.data.nodes || []).find((n: any) => n.type === "requestInputs");
        if (requestNode) {
          const fields = requestNode.data?.fields || [];
          const initialVals: Record<string, string> = {};
          fields.forEach((f: any) => {
            initialVals[f.id] = f.value || "";
          });
          setInputValues(initialVals);
        }

        // Calculate estimated cost
        let est = 0;
        (data.data.nodes || []).forEach((n: any) => {
          if (n.type === "gemini" || n.type === "gptImage2") est += 1.0;
          if (n.type === "klingV3") est += 2.0;
        });
        setEstimatedCost(est || 0.25);
      }
    } catch (err) {
      console.error("Failed to fetch workflow details:", err);
    }
  }, [workflowId, setNodes, setEdges, setWorkflowId, setWorkflowName]);

  const fetchHistory = useCallback(async () => {
    try {
      const resp = await fetch(`/api/workflows/${workflowId}/history`);
      const data = await resp.json();
      if (data.data) {
        setRuns(data.data);
        // By default, select the latest run to display outputs if available
        if (data.data.length > 0 && !selectedRun) {
          setSelectedRun(data.data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  }, [workflowId, selectedRun]);

  useEffect(() => {
    fetchWorkflow();
    fetchHistory();
  }, [workflowId]);

  // Check if response node is connected
  const hasResponseConnection = useCallback(() => {
    if (!workflow) return false;
    const edges = workflow.edges || [];
    return edges.some((e: any) => e.target === "response");
  }, [workflow]);

  // Starts workflow execution run
  const handleStartRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setSelectedRun(null);

    try {
      const resp = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "full",
          inputValues,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed to trigger run" }));
        alert(err.error || "Failed to trigger run");
        setIsRunning(false);
        return;
      }

      const data = await resp.json();
      const { runId, orchestratorRunId, publicAccessToken } = data.data ?? {};

      setCurrentRunId(runId);
      setOrchestratorState({ orchestratorRunId, publicAccessToken });
    } catch (err) {
      console.error("Failed to run workflow:", err);
      setIsRunning(false);
    }
  };

  const handleOrchestratorUpdate = useCallback(
    (nodeStates: Record<string, { status: string; output?: any; error?: string }>) => {
      // Stream state update
      console.log("[Playground] Real-time orchestrator update:", nodeStates);
    },
    []
  );

  const handleOrchestratorComplete = useCallback(
    (finalStatus: string) => {
      setIsRunning(false);
      setCurrentRunId(null);
      setOrchestratorState(null);
      // Reload history to fetch new outputs
      fetchHistory();
    },
    [fetchHistory]
  );

  // Extract Response Node outputs for display
  const getOutputData = () => {
    const targetRun = selectedRun;
    if (!targetRun) return null;

    const responseNodeRun = targetRun.nodeRuns.find((nr) => nr.nodeId === "response" || nr.nodeName === "Output");
    if (!responseNodeRun || responseNodeRun.status !== "success" || !responseNodeRun.output) {
      // Check if there are other completed media nodes to show partial assets
      const mediaNode = targetRun.nodeRuns
        .slice()
        .reverse()
        .find((nr) => nr.status === "success" && nr.output && (nr.output.result || nr.output.outputUrl));
      
      if (mediaNode) {
        return mediaNode.output;
      }
      return null;
    }

    return responseNodeRun.output;
  };

  const outputContent = getOutputData();

  // Python, JS, cURL Script generator templates
  const codeTemplates = {
    python: `import requests
import time
import json

api_key = "YOUR_API_KEY"
url = "${apiOrigin}/api/v1/runs"

data = {
    "workflowId": "${workflowId}",
    "inputValues": ${JSON.stringify(inputValues, null, 4).replace(/\n/g, "\n    ")}
}

# Start execution
response = requests.post(
    url,
    json=data,
    headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
)

result = response.json()
run_id = result['data']['runId']
print(f"Run started: {run_id}")

# Poll for status
poll_url = f"${apiOrigin}/api/v1/runs/{run_id}"
while True:
    response = requests.get(
        poll_url,
        headers={'Authorization': f'Bearer {api_key}'}
    )
    res_data = response.json()
    status = res_data['data']['status']
    
    if status == 'success':
        print("Completed successfully!")
        print(json.dumps(res_data['data']['nodeRuns'], indent=2))
        break
    elif status in ['failed', 'canceled']:
        print(f"Run ended with status: {status}")
        break
    time.sleep(5)`,

    nodejs: `const fetch = require('node-fetch');

const apiKey = 'YOUR_API_KEY';
const url = '${apiOrigin}/api/v1/runs';
const workflowId = '${workflowId}';

async function startRun() {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${apiKey}\`
    },
    body: JSON.stringify({
      workflowId,
      inputValues: ${JSON.stringify(inputValues, null, 6).replace(/\n/g, "\n      ")}
    })
  });
  const data = await response.json();
  const runId = data.data.runId;
  console.log(\`Run started: \${runId}\`);
  pollResult(runId);
}

async function pollResult(runId) {
  const pollUrl = \`\${apiOrigin}/api/v1/runs/\${runId}\`;
  while (true) {
    const response = await fetch(pollUrl, {
      headers: { 'Authorization': \`Bearer \${apiKey}\` }
    });
    const result = await response.json();
    const run = result.data;
    if (run.status === 'success') {
      console.log('Success!', JSON.stringify(run.nodeRuns, null, 2));
      break;
    } else if (run.status === 'failed') {
      console.error('Run failed:', run.error);
      break;
    }
    await new Promise(r => setTimeout(r, 5000));
  }
}

startRun();`,

    curl: `curl -X POST ${apiOrigin}/api/v1/runs \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "workflowId": "${workflowId}",
    "inputValues": ${JSON.stringify(inputValues, null, 6).replace(/\n/g, "\n    ")}
  }'

# Poll execution status
curl -X GET ${apiOrigin}/api/v1/runs/RUN_ID \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeTemplates[codeLanguage]);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Filter history runs list
  const filteredRuns = runs.filter((r) => {
    const matchesSearch = r.id.toLowerCase().includes(historySearch.toLowerCase());
    // In our backend, public API runs are triggered with an ApiKey linked,
    // which has scope or keys in header. In local, we can check if scope exists.
    const isApiRun = r.orchestratorRunId && !r.inputValues?.ClerkUser; // Mock indicator or scope checks
    const matchesFilter = runFilter === "ui" ? true : true; // Keep list unified, can add dynamic indicator later
    return matchesSearch;
  });

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
                          Est. ~{estimatedCost.toFixed(2)}M
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

                          if (Object.keys(inputValues).length === 0) {
                            return (
                              <div className="py-10 text-center text-sm text-muted-foreground">
                                No settings needed. Ready to trigger.
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
                              {fields.map((field: any) => {
                                const type = getFieldType(field);
                                const displayValue = inputValues[field.id] || "";

                                return (
                                  <div key={field.id} className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-muted-foreground/70">
                                        {type === "image" && <Image className="h-4 w-4" />}
                                        {type === "video" && <Video className="h-4 w-4" />}
                                        {type === "audio" && <Volume2 className="h-4 w-4" />}
                                        {type === "text" && <AlignLeft className="h-4 w-4" />}
                                        {type !== "image" && type !== "video" && type !== "audio" && type !== "text" && (
                                          <FileText className="h-4 w-4" />
                                        )}
                                      </span>
                                      <label className="text-[13px] font-medium text-foreground">{field.label}</label>
                                      <span className="ml-auto text-[11px] capitalize text-muted-foreground/50">{type}</span>
                                    </div>

                                    {type === "text" ? (
                                      <div className="relative">
                                        <textarea
                                          placeholder={`Enter ${field.label}...`}
                                          rows={3}
                                          value={displayValue}
                                          onChange={(e) => setInputValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                                          className="min-h-[60px] w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/30"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setActiveExpandFieldId(field.id)}
                                          className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-md bg-muted/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer border-0"
                                          title="Expand"
                                        >
                                          <Maximize2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      /* File upload fields (image, video, audio, generic file) */
                                      <div className="space-y-2">
                                        {type === "image" ? (
                                          /* Multi-image grid field */
                                          <div className="space-y-2">
                                            <div className="relative">
                                              <button
                                                type="button"
                                                tabIndex={-1}
                                                disabled={uploadingFields[field.id] || (displayValue.split(",").filter(Boolean).length >= 10)}
                                                onClick={() => {
                                                  const input = document.getElementById(`file-input-${field.id}`);
                                                  if (input) input.click();
                                                }}
                                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed transition-colors disabled:opacity-50 h-10 border-border bg-background px-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground cursor-pointer"
                                                title="Upload image"
                                              >
                                                {uploadingFields[field.id] ? (
                                                  <>
                                                    <SpinningLogo size="sm" />
                                                    <span>Uploading...</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <svg
                                                      xmlns="http://www.w3.org/2000/svg"
                                                      width="24"
                                                      height="24"
                                                      viewBox="0 0 24 24"
                                                      fill="none"
                                                      stroke="currentColor"
                                                      strokeWidth="2"
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                      className="tabler-icon tabler-icon-cloud-upload h-4 w-4"
                                                    >
                                                      <path d="M7 18a4.6 4.4 0 0 1 0 -9a5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7h-1" />
                                                      <path d="M9 15l3 -3l3 3" />
                                                      <path d="M12 12l0 9" />
                                                    </svg>
                                                    <span className="capitalize">Upload image</span>
                                                  </>
                                                )}
                                              </button>
                                              <input
                                                id={`file-input-${field.id}`}
                                                hidden
                                                accept="image/*"
                                                multiple
                                                type="file"
                                                onChange={(e) => handleFileUpload(field.id, e.target.files)}
                                              />
                                            </div>
                                            
                                            {displayValue && (
                                              <div className="grid grid-cols-3 gap-2">
                                                {displayValue.split(",").filter(Boolean).map((url: string, idx: number) => (
                                                  <div key={idx} className="group relative">
                                                    <div className="overflow-hidden rounded-lg bg-muted/30" style={{ border: "2px solid rgba(59, 130, 246, 0.3)", aspectRatio: "1 / 1" }}>
                                                      <img src={url} alt="" className="h-full w-full object-cover" />
                                                    </div>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        const urls = displayValue.split(",").filter(Boolean);
                                                        const newUrls = urls.filter((_, i) => i !== idx);
                                                        setInputValues((prev) => ({ ...prev, [field.id]: newUrls.join(",") }));
                                                      }}
                                                      className="absolute right-1 top-1 z-10 rounded bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500 cursor-pointer border-0"
                                                      title="Remove"
                                                    >
                                                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x h-2.5 w-2.5" aria-hidden="true">
                                                        <path d="M18 6 6 18"></path>
                                                        <path d="m6 6 12 12"></path>
                                                      </svg>
                                                    </button>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          /* Single/Multi file upload (video, audio, other) */
                                          <div className="space-y-2">
                                            <div className="relative">
                                              <button
                                                type="button"
                                                tabIndex={-1}
                                                disabled={uploadingFields[field.id] || (displayValue.split(",").filter(Boolean).length >= 10)}
                                                onClick={() => {
                                                  const input = document.getElementById(`file-input-${field.id}`);
                                                  if (input) input.click();
                                                }}
                                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed transition-colors disabled:opacity-50 h-10 border-border bg-background px-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground cursor-pointer"
                                                title={`Upload ${type}`}
                                              >
                                                {uploadingFields[field.id] ? (
                                                  <>
                                                    <SpinningLogo size="sm" />
                                                    <span>Uploading...</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <svg
                                                      xmlns="http://www.w3.org/2000/svg"
                                                      width="24"
                                                      height="24"
                                                      viewBox="0 0 24 24"
                                                      fill="none"
                                                      stroke="currentColor"
                                                      strokeWidth="2"
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                      className="tabler-icon tabler-icon-cloud-upload h-4 w-4"
                                                    >
                                                      <path d="M7 18a4.6 4.4 0 0 1 0 -9a5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7h-1" />
                                                      <path d="M9 15l3 -3l3 3" />
                                                      <path d="M12 12l0 9" />
                                                    </svg>
                                                    <span className="capitalize">Upload {type}</span>
                                                  </>
                                                )}
                                              </button>
                                              <input
                                                id={`file-input-${field.id}`}
                                                hidden
                                                accept={
                                                  type === "video"
                                                    ? "video/*"
                                                    : type === "audio"
                                                    ? "audio/*"
                                                    : "*"
                                                }
                                                multiple
                                                type="file"
                                                onChange={(e) => handleFileUpload(field.id, e.target.files)}
                                              />
                                            </div>

                                            {displayValue && (
                                              <div className="space-y-2">
                                                {displayValue.split(",").filter(Boolean).map((url: string, idx: number) => (
                                                  <div key={idx} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-2 relative group">
                                                    {type === "video" && (
                                                      <div className="flex h-10 w-10 items-center justify-center rounded bg-zinc-800 text-white border border-border">
                                                        <Video className="h-4 w-4" />
                                                      </div>
                                                    )}
                                                    {type === "audio" && (
                                                      <div className="flex h-10 w-10 items-center justify-center rounded bg-indigo-50 text-indigo-500 border border-border">
                                                        <Volume2 className="h-4 w-4" />
                                                      </div>
                                                    )}
                                                    {type !== "video" && type !== "audio" && (
                                                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-muted-foreground border border-border">
                                                        <FileText className="h-4 w-4" />
                                                      </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                      <span className="block truncate text-xs text-muted-foreground font-mono">{url}</span>
                                                    </div>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        const urls = displayValue.split(",").filter(Boolean);
                                                        const newUrls = urls.filter((_, i) => i !== idx);
                                                        setInputValues((prev) => ({ ...prev, [field.id]: newUrls.join(",") }));
                                                      }}
                                                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-red-500 transition-colors cursor-pointer border-0 bg-transparent"
                                                      title="Remove file"
                                                    >
                                                      <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                      
                      {/* Run Action Container */}
                      <div className="flex items-center p-6 flex-col gap-2 bg-muted/30 px-5 py-4">
                        <button
                          onClick={handleStartRun}
                          disabled={isRunning || !hasResponseConnection()}
                          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[18px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg transition-all duration-300 w-full px-4 py-6 border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isRunning ? (
                            <>
                              <SpinningLogo size="sm" />
                              Running...
                            </>
                          ) : (
                            <>
                              <Play className="w-5 h-5 mr-2" />
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
                      <div className="flex p-6 flex-row items-center justify-between space-y-0 px-5 py-4">
                        <div>
                          <h2 className="text-sm font-semibold text-foreground">Output</h2>
                          <p className="mt-0.5 text-xs text-muted-foreground">Results from workflow execution</p>
                        </div>
                      </div>
                      <div className="shrink-0 bg-border h-[1px] w-full"></div>
                      
                      <div className="min-h-0 flex-1 overflow-y-auto p-5 flex flex-col justify-center items-center">
                        {!outputContent ? (
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                              <Play className="h-7 w-7 opacity-30" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground/70">No output yet</p>
                            <p className="mt-1 text-xs text-muted-foreground/50">Run the workflow to see results here</p>
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                            {/* Formatted Output rendering depending on media type */}
                            {typeof outputContent === "string" && (outputContent.startsWith("http://") || outputContent.startsWith("https://")) ? (
                              outputContent.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                                <img
                                  src={outputContent}
                                  alt="Generated asset result"
                                  className="max-h-[60vh] rounded-xl object-contain border border-border shadow-md"
                                />
                              ) : outputContent.match(/\.(mp4|webm)/i) ? (
                                <video
                                  src={outputContent}
                                  controls
                                  className="max-h-[60vh] rounded-xl object-contain border border-border shadow-md"
                                />
                              ) : (
                                <a
                                  href={outputContent}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-border bg-card rounded-lg text-sm text-foreground hover:bg-muted"
                                >
                                  Download Asset <ExternalLink className="w-4 h-4" />
                                </a>
                              )
                            ) : outputContent.result && typeof outputContent.result === "string" && (outputContent.result.startsWith("http://") || outputContent.result.startsWith("https://")) ? (
                              outputContent.result.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                                <img
                                  src={outputContent.result}
                                  alt="Generated asset result"
                                  className="max-h-[60vh] rounded-xl object-contain border border-border shadow-md"
                                />
                              ) : outputContent.result.match(/\.(mp4|webm)/i) ? (
                                <video
                                  src={outputContent.result}
                                  controls
                                  className="max-h-[60vh] rounded-xl object-contain border border-border shadow-md"
                                />
                              ) : (
                                <a
                                  href={outputContent.result}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-border bg-card rounded-lg text-sm text-foreground hover:bg-muted"
                                >
                                  Download Result <ExternalLink className="w-4 h-4" />
                                </a>
                              )
                            ) : (
                              <pre className="p-4 rounded-xl border border-border bg-muted/30 font-mono text-xs w-full max-h-[60vh] overflow-auto text-foreground">
                                {JSON.stringify(outputContent, null, 2)}
                              </pre>
                            )}
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
                        <table className="w-full caption-bottom text-sm border-collapse">
                          <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 text-xs text-muted-foreground bg-muted/30">
                              <th className="h-10 text-left align-middle px-5 py-2 font-medium">Date & Time</th>
                              <th className="h-10 text-left align-middle px-3 py-2 font-medium">Status</th>
                              <th className="h-10 text-left align-middle px-3 py-2 font-medium">Used Credits</th>
                              <th className="h-10 text-right align-middle px-5 py-2 font-medium">Run ID</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
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
                                return (
                                  <tr
                                    key={r.id}
                                    onClick={() => setSelectedRun(r)}
                                    className={`border-b transition-colors cursor-pointer hover:bg-muted/10 ${
                                      isSelected ? "bg-muted/30" : ""
                                    }`}
                                  >
                                    <td className="px-5 py-3 text-xs font-medium text-foreground">
                                      {new Date(r.startedAt).toLocaleString()}
                                    </td>
                                    <td className="px-3 py-3 text-xs">
                                      <span
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                                          r.status === "success"
                                            ? "bg-green-50 text-green-700 border border-green-200"
                                            : r.status === "running"
                                            ? "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"
                                            : "bg-red-50 text-red-700 border border-red-200"
                                        }`}
                                      >
                                        {r.status}
                                      </span>
                                    </td>
                                    <td className="px-3 py-3 text-xs font-medium text-foreground tabular-nums">
                                      {(totalCost / 1000000).toFixed(2)}M
                                    </td>
                                    <td className="px-5 py-3 text-right text-xs font-mono text-muted-foreground">
                                      {r.id}
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
                
                {/* Code snippets block */}
                <div className="flex w-[45%] min-w-0 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                    <div className="relative">
                      <select
                        value={codeLanguage}
                        onChange={(e) => setCodeLanguage(e.target.value as any)}
                        className="inline-flex items-center justify-center bg-background border border-border rounded-[18px] px-3 py-1 text-xs gap-2 outline-none cursor-pointer text-foreground"
                      >
                        <option value="python">Python</option>
                        <option value="nodejs">Node.js</option>
                        <option value="curl">cURL</option>
                      </select>
                    </div>
                    <button
                      onClick={copyToClipboard}
                      className="inline-flex items-center justify-center gap-1.5 bg-transparent hover:bg-muted px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-foreground transition-colors cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCode ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto p-4 bg-muted/10">
                    <pre className="font-mono text-[13px] leading-relaxed text-foreground select-all whitespace-pre-wrap">
                      {renderHighlightedCode(codeTemplates[codeLanguage])}
                    </pre>
                  </div>
                </div>

                {/* API Docs layout column */}
                <div className="min-w-0 flex-1 overflow-y-auto">
                  <div className="space-y-6">
                    <div>
                      <h3 className="mb-3 text-base font-semibold text-foreground">API Endpoint</h3>
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                        <span className="shrink-0 rounded bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700 dark:bg-green-500/10 dark:text-green-400">POST</span>
                        <code className="truncate font-mono text-sm text-foreground">{apiOrigin}/api/v1/runs</code>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-3 text-base font-semibold text-foreground">Response Format</h3>
                      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                        <p className="text-sm text-foreground">The start endpoint returns a <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">runId</code>. Poll <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">GET /v1/runs/{"{runId}"}</code> to check status.</p>
                        <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3">
                          <pre className="whitespace-pre font-mono text-xs text-foreground/80">{"{\n  \"runId\": \"run_abc123...\"\n}"}</pre>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-3 text-base font-semibold text-foreground">Polling Response</h3>
                      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                        <p className="text-sm text-foreground">Poll <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">GET /v1/runs/{"{runId}"}</code> until status is terminal:</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span className="rounded px-2 py-0.5 font-mono text-[11px] font-medium bg-muted text-muted-foreground">QUEUED</span>
                          <span className="rounded px-2 py-0.5 font-mono text-[11px] font-medium bg-muted text-muted-foreground">RUNNING</span>
                          <span className="rounded px-2 py-0.5 font-mono text-[11px] font-medium bg-green-100 text-green-700">COMPLETED</span>
                          <span className="rounded px-2 py-0.5 font-mono text-[11px] font-medium bg-red-100 text-red-700">FAILED</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* ──── Tab 3: Workflow Canvas ──── */}
            {activeTab === "workflow" && (
              <div className="relative h-full w-full flex flex-col overflow-hidden">
                <div className="absolute right-4 top-4 z-10">
                  <button
                    onClick={() => router.push(`/workflow/${workflowId}/canvas`)}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-[18px] bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold px-4 py-2 border-0 cursor-pointer shadow-md"
                  >
                    Edit Workflow
                  </button>
                </div>
                
                {/* Render Canvas in non-editable mode */}
                <div className="flex-1 w-full h-full relative overflow-hidden">
                  <Canvas readOnly={true} />
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
