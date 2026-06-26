import { describe, it, expect } from "vitest";
import { useWorkflowStore } from "@/store/workflow-store";

describe("Workflow Store Drag state", () => {
  it("initializes with null/false values", () => {
    const state = useWorkflowStore.getState();
    expect(state.connectingSourceNodeId).toBeNull();
    expect(state.settingsNodeIdBeforeDrag).toBeNull();
    expect(state.connectionCompletedThisDrag).toBe(false);
  });

  it("updates values correctly via setters", () => {
    const { setConnectingSourceNodeId, setSettingsNodeIdBeforeDrag, setConnectionCompletedThisDrag } =
      useWorkflowStore.getState();

    setConnectingSourceNodeId("nodeA");
    setSettingsNodeIdBeforeDrag("nodeB");
    setConnectionCompletedThisDrag(true);

    const state = useWorkflowStore.getState();
    expect(state.connectingSourceNodeId).toBe("nodeA");
    expect(state.settingsNodeIdBeforeDrag).toBe("nodeB");
    expect(state.connectionCompletedThisDrag).toBe(true);

    // Reset
    setConnectingSourceNodeId(null);
    setSettingsNodeIdBeforeDrag(null);
    setConnectionCompletedThisDrag(false);

    const stateReset = useWorkflowStore.getState();
    expect(stateReset.connectingSourceNodeId).toBeNull();
    expect(stateReset.settingsNodeIdBeforeDrag).toBeNull();
    expect(stateReset.connectionCompletedThisDrag).toBe(false);
  });
});
