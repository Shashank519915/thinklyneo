import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import type { NodeProps } from "@xyflow/react";
import React, { useState, useEffect } from "react";
import GenericNode from "@/components/workflow/nodes/generic/GenericNode";
import { ReactFlowTestWrapper } from "./helpers/react-flow-wrapper";
import { afterEach } from "vitest";

// Reactive test store state
let globalState: any = {
  nodes: [
    {
      id: "crop1",
      type: "cropImage",
      position: { x: 0, y: 0 },
      data: {
        inputs: {
          inputImage: "https://example.com/test-image.png",
          x: 10,
          y: 20,
          w: 50,
          h: 60,
        },
      },
    },
  ],
  edges: [],
  previewRunId: null,
  previewNodeOutputs: {},
  readOnly: false,
  activeSettingsNodeId: "crop1", // Open settings panel by default
};

const listeners = new Set<() => void>();

function updateState(updater: (state: any) => any) {
  globalState = updater(globalState);
  listeners.forEach((l) => l());
}

vi.mock("@/store/workflow-store", () => ({
  useWorkflowStore: (selector?: (s: any) => unknown) => {
    const [, forceUpdate] = useState(0);
    useEffect(() => {
      const listener = () => forceUpdate((x) => x + 1);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }, []);

    const actions = {
      updateNodeData: (nodeId: string, data: any) => {
        updateState((state) => ({
          ...state,
          nodes: state.nodes.map((n: any) =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
          ),
        }));
      },
      setActiveSettingsNodeId: (nodeId: string | null) => {
        updateState((state) => ({
          ...state,
          activeSettingsNodeId: nodeId,
        }));
      },
      deleteNode: vi.fn(),
      setNodes: vi.fn(),
      setEdges: vi.fn(),
    };

    if (typeof selector === "function") {
      return selector({ ...globalState, ...actions });
    }
    return { ...globalState, ...actions };
  },
  useNodePreview: () => ({
    isPreviewMode: false,
    isDimmed: false,
    isExecuting: false,
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

describe("Crop Overlay Reactivity", () => {
  beforeEach(() => {
    globalState = {
      nodes: [
        {
          id: "crop1",
          type: "cropImage",
          position: { x: 0, y: 0 },
          data: {
            inputs: {
              inputImage: "https://example.com/test-image.png",
              x: 10,
              y: 20,
              w: 50,
              h: 60,
            },
          },
        },
      ],
      edges: [],
      previewRunId: null,
      previewNodeOutputs: {},
      readOnly: false,
      activeSettingsNodeId: "crop1",
    };
    listeners.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("should render the crop overlay with correct initial styles", () => {
    render(
      <ReactFlowTestWrapper>
        <GenericNode
          id="crop1"
          type="cropImage"
          data={globalState.nodes[0].data}
          selected={false}
          {...({} as any)}
        />
      </ReactFlowTestWrapper>
    );

    // Get the image element to verify it renders
    const img = screen.getByAltText("");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/test-image.png");

    // The crop frame style is absolute and has:
    // left: 10%, top: 20%, width: 50%, height: 60%
    // Let's find the crop frame div. It has borderColor: "rgba(167,139,250,0.9)"
    // and styles style={{ left: "10%", top: "20%", width: "50%", height: "60%", ... }}
    const divs = document.querySelectorAll("div");
    let cropFrame: HTMLElement | null = null;
    divs.forEach((d) => {
      if (d.style.borderColor === "rgba(167, 139, 250, 0.9)") {
        cropFrame = d;
      }
    });

    expect(cropFrame).not.toBeNull();
    expect(cropFrame!.style.left).toBe("10%");
    expect(cropFrame!.style.top).toBe("20%");
    expect(cropFrame!.style.width).toBe("50%");
    expect(cropFrame!.style.height).toBe("60%");
  });

  it("should update styles when store values change", async () => {
    render(
      <ReactFlowTestWrapper>
        <GenericNode
          id="crop1"
          type="cropImage"
          data={globalState.nodes[0].data}
          selected={false}
          {...({} as any)}
        />
      </ReactFlowTestWrapper>
    );

    // Simulate changing values of x, y, w, h
    await act(async () => {
      // Simulate updateNodeData call that happens when slider is dragged
      const currentInputs = globalState.nodes[0].data.inputs;
      updateState((state) => ({
        ...state,
        nodes: state.nodes.map((n: any) =>
          n.id === "crop1"
            ? {
                ...n,
                data: {
                  ...n.data,
                  inputs: {
                    ...currentInputs,
                    x: 30,
                    y: 40,
                    w: 45,
                    h: 55,
                  },
                },
              }
            : n
        ),
      }));
    });

    // Let's check the crop frame style now
    const divs = document.querySelectorAll("div");
    let cropFrame: HTMLElement | null = null;
    divs.forEach((d) => {
      if (d.style.borderColor === "rgba(167, 139, 250, 0.9)") {
        cropFrame = d;
      }
    });

    expect(cropFrame).not.toBeNull();
    expect(cropFrame!.style.left).toBe("30%");
    expect(cropFrame!.style.top).toBe("40%");
    expect(cropFrame!.style.width).toBe("45%");
    expect(cropFrame!.style.height).toBe("55%");
  });

  it("should update store and overlay when numeric input is typed into", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(
      <ReactFlowTestWrapper>
        <GenericNode
          id="crop1"
          type="cropImage"
          data={globalState.nodes[0].data}
          selected={false}
          {...({} as any)}
        />
      </ReactFlowTestWrapper>
    );

    // Find all number inputs. There should be four: x, y, w, h
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs).toHaveLength(4);

    // The first one is x (based on cropImageDefinition inputs ordering: x, y, w, h)
    const xInput = inputs[0];
    expect(xInput).toHaveValue(10); // initial x value is 10

    await act(async () => {
      fireEvent.change(xInput, { target: { value: "35" } });
    });

    // Check if the store was updated reactively and the input now shows 35
    expect(xInput).toHaveValue(35);

    // Verify the crop frame style's left value updated to 35%
    const divs = document.querySelectorAll("div");
    let cropFrame: HTMLElement | null = null;
    divs.forEach((d) => {
      if (d.style.borderColor === "rgba(167, 139, 250, 0.9)") {
        cropFrame = d;
      }
    });

    expect(cropFrame).not.toBeNull();
    expect(cropFrame!.style.left).toBe("35%");
  });

  it("should render Upload image button inline when image is empty and not wired", () => {
    // Set inputImage to null / empty
    globalState.nodes[0].data.inputs.inputImage = null;

    render(
      <ReactFlowTestWrapper>
        <GenericNode
          id="crop1"
          type="cropImage"
          data={globalState.nodes[0].data}
          selected={false}
          {...({} as any)}
        />
      </ReactFlowTestWrapper>
    );

    // Verify "Upload image" button is rendered
    const uploadBtn = screen.getByRole("button", { name: /upload image/i });
    expect(uploadBtn).toBeInTheDocument();
  });

  it("should render Wired Upstream placeholder inline when image is empty and wired", () => {
    // Set inputImage to null and add a dummy edge to simulate being wired
    globalState.nodes[0].data.inputs.inputImage = null;
    globalState.edges = [
      {
        id: "edge-test",
        source: "someNode",
        sourceHandle: "out:image",
        target: "crop1",
        targetHandle: "in:inputImage",
      },
    ];

    render(
      <ReactFlowTestWrapper>
        <GenericNode
          id="crop1"
          type="cropImage"
          data={globalState.nodes[0].data}
          selected={false}
          {...({} as any)}
        />
      </ReactFlowTestWrapper>
    );

    // Verify "Wired Upstream (Awaiting Image)" is rendered
    const placeholder = screen.getByText(/wired upstream/i);
    expect(placeholder).toBeInTheDocument();
  });
});
