/**
 * @fileoverview RTL tests for GenericNode wired vs manual input states.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { Edge, Node, NodeProps } from "@xyflow/react";
import GenericNode from "@/components/workflow/nodes/generic/GenericNode";
import { ReactFlowTestWrapper } from "./helpers/react-flow-wrapper";

const baseNodes: Node[] = [
  {
    id: "ri",
    type: "requestInputs",
    position: { x: 0, y: 0 },
    data: {
      label: "Request",
      fields: [{ id: "field_text_default", type: "text_field", label: "Text", value: "upstream copy" }],
    },
  },
  {
    id: "llm",
    type: "openRouter",
    position: { x: 200, y: 0 },
    data: {
      label: "LLM",
      inputs: { prompt: "", systemPrompt: "" },
    },
  },
];

const wiredEdges: Edge[] = [
  {
    id: "e1",
    source: "ri",
    target: "llm",
    sourceHandle: "field_text_default",
    targetHandle: "in:prompt",
  },
];

const storeState = {
  nodes: baseNodes,
  edges: [] as Edge[],
  updateNodeData: vi.fn(),
  deleteNode: vi.fn(),
  setNodes: vi.fn(),
  setEdges: vi.fn(),
  previewRunId: null as string | null,
  previewNodeOutputs: {} as Record<string, unknown>,
  readOnly: false,
  activeSettingsNodeId: null as string | null,
  setActiveSettingsNodeId: vi.fn(),
};

vi.mock("@/store/workflow-store", () => ({
  useWorkflowStore: (selector?: (s: typeof storeState) => unknown) => {
    if (typeof selector === "function") {
      return selector(storeState);
    }
    return storeState;
  },
  useNodePreview: () => ({
    isPreviewMode: false,
    isDimmed: false,
    isExecuting: false,
    isRunSession: false,
    isRunPending: false,
    isRunCompleted: false,
    isRunFailed: false,
    output: null,
    error: null,
  }),
}));

vi.mock("@/lib/upload", () => ({
  uploadFilesViaApi: vi.fn(),
}));

function renderGenericNode(edges: Edge[]) {
  storeState.edges = edges;
  return render(
    <ReactFlowTestWrapper>
      <GenericNode
        {...({
          id: "llm",
          type: "openRouter",
          data: baseNodes[1].data,
          selected: false,
          dragging: false,
          zIndex: 0,
          isConnectable: true,
          positionAbsoluteX: 200,
          positionAbsoluteY: 0,
        } as NodeProps)}
      />
    </ReactFlowTestWrapper>
  );
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  storeState.edges = [];
  storeState.readOnly = false;
  storeState.activeSettingsNodeId = null;
});

afterEach(() => {
  cleanup();
});

const promptPlaceholder = /enter your prompt/i;

describe("GenericNode wired states", () => {
  it("shows upstream wired preview when prompt handle is connected", () => {
    renderGenericNode(wiredEdges);

    expect(screen.getByText("Connected upstream")).toBeInTheDocument();
    expect(screen.getByText("upstream copy")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(promptPlaceholder)).not.toBeInTheDocument();
  });

  it("shows editable prompt textarea when handle is not wired", () => {
    renderGenericNode([]);

    const prompt = screen.getByPlaceholderText(promptPlaceholder);
    expect(prompt).not.toBeDisabled();
    expect(prompt.closest(".input-connected")).toBeNull();
  });

  it("disables manual prompt input in read-only mode", () => {
    storeState.readOnly = true;
    renderGenericNode([]);

    expect(screen.getByPlaceholderText(promptPlaceholder)).toBeDisabled();
  });
});

describe("GenericNode wired image-array", () => {
  const imageUrl1 = "https://cdn.example/a.webp";
  const imageUrl2 = "https://cdn.example/b.webp";

  const geminiNodes: Node[] = [
    {
      id: "ri",
      type: "requestInputs",
      position: { x: 0, y: 0 },
      data: {
        label: "Request",
        fields: [
          {
            id: "field_image_1",
            type: "image_field",
            label: "Images",
            value: `${imageUrl1},${imageUrl2}`,
          },
        ],
      },
    },
    {
      id: "gem",
      type: "gemini",
      position: { x: 200, y: 0 },
      data: { label: "Gemini", inputs: {} },
    },
  ];

  const imageEdges: Edge[] = [
    {
      id: "e-img",
      source: "ri",
      target: "gem",
      sourceHandle: "field_image_1",
      targetHandle: "in:image_urls",
    },
  ];

  it("renders separate previews when one field has comma-separated image URLs", () => {
    storeState.nodes = geminiNodes;
    storeState.edges = imageEdges;
    storeState.activeSettingsNodeId = "gem";
    render(
      <ReactFlowTestWrapper>
        <GenericNode
          {...({
            id: "gem",
            type: "gemini",
            data: geminiNodes[1].data,
            selected: false,
            dragging: false,
            zIndex: 0,
            isConnectable: true,
            positionAbsoluteX: 200,
            positionAbsoluteY: 0,
          } as NodeProps)}
        />
      </ReactFlowTestWrapper>
    );

    expect(screen.getByText("Connected upstream")).toBeInTheDocument();
    const imgs = screen.getAllByRole("img");
    expect(imgs).toHaveLength(2);
    expect(imgs[0]).toHaveAttribute("src", imageUrl1);
    expect(imgs[1]).toHaveAttribute("src", imageUrl2);
  });
});
