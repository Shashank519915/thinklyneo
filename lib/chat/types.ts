export type ChatKind = "helper" | "thinkly" | "brain";

export type BlueprintConfidence = "draft" | "review" | "ready";

export interface Blueprint {
  title: string;
  summary: string;
  requestFields: Array<{
    id: string;
    type: string;
    label: string;
    required?: boolean;
  }>;
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    params?: Record<string, unknown>;
  }>;
  edges: Array<{
    source: string;
    sourceHandle: string;
    target: string;
    targetHandle: string;
  }>;
  openQuestions?: string[];
  confidence?: BlueprintConfidence;
}

export interface ChatRecord {
  id: string;
  kind: ChatKind;
  title: string | null;
  workflowId: string | null;
  blueprint: Blueprint | null;
  blueprintSource?: Blueprint | null;
  createdAt: string;
  updatedAt: string;
  messages?: Array<{
    id: string;
    role: string;
    parts: unknown;
    orchestratorRunId?: string | null;
    createdAt: string;
  }>;
}
