"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkflowStore, useNodePreview } from "@/store/workflow-store";
import {
  generateEdgeId,
  resolvePropagatedEdgeValue,
} from "@/lib/utils";
import { uploadFilesViaApi } from "@/lib/upload";
import {
  buildDefaultNodeInputs,
  type NodeDefinition,
} from "@shashank519915/shared";
import {
  normalizeArrayParamValue,
  resolveEffectiveParamValue,
} from "@/lib/promoted-input-value";
import {
  isRequestPromoted,
  promoteInputToRequest,
  shouldShowAddToRequest,
} from "@/lib/promote-to-request";

function getMediaArrayMax(
  definition: NodeDefinition,
  param: { key: string; type?: string },
): number {
  const limit = definition.limits?.[param.key as keyof typeof definition.limits];
  if (limit?.maxCount != null) return limit.maxCount;
  if (param.type === "image-array") return 10;
  if (param.type === "video-array") return 7;
  if (param.type === "audio-array") return 5;
  return 10;
}

export function useGenericNodeState(id: string, definition: NodeDefinition) {
  const {
    updateNodeData,
    deleteNode,
    setNodes,
    setEdges,
    edges,
    nodes,
    previewRunId,
    previewNodeOutputs,
    readOnly,
    activeSettingsNodeId,
    setActiveSettingsNodeId,
  } = useWorkflowStore();
  const {
    isPreviewMode,
    isDimmed,
    isExecuting,
    isRunPending,
    isRunCompleted,
    isRunFailed,
    output,
    error,
  } = useNodePreview(id);

  const nodeData = useWorkflowStore((state) => state.nodes.find((n) => n.id === id)?.data) as any;
  const nodeError = error as string | null;
  const isLocked = !!nodeData?.locked;

  const [showAdvanced, setShowAdvanced] = useState(false);
  const showSettings = activeSettingsNodeId === id;
  const setShowSettings = (open: boolean) => {
    setActiveSettingsNodeId(open ? id : null);
  };
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [activeUploadPopup, setActiveUploadPopup] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [activeExpandParamKey, setActiveExpandParamKey] = useState<string | null>(null);

  useEffect(() => {
    if (!activeUploadPopup && !activeDropdown) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (activeUploadPopup && !target.closest(".upload-popup-container")) {
        setActiveUploadPopup(null);
      }
      if (activeDropdown && !target.closest(".custom-select-container")) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [activeUploadPopup, activeDropdown]);

  const hasModeTab = definition.type === "gptImage2" || definition.type === "klingV3";
  const modeLabels: [string, string] =
    definition.type === "gptImage2"
      ? ["Text to Image", "Image to Image"]
      : ["Text to Video", "Image to Video"];

  const [modeTab, setModeTab] = useState<"text" | "image">(() =>
    nodeData?.inputs?.inputImage ||
    (nodeData?.inputs?.inputImage as any)?.start_image_url ||
    (nodeData?.inputs as any)?.start_image_url ||
    (nodeData?.inputs?.uploadedImages &&
      nodeData.inputs.uploadedImages.length > 0)
      ? "image"
      : "text",
  );

  const connectedTargets = new Set(
    (edges ?? [])
      .filter((e) => e.target === id && typeof e.targetHandle === "string")
      .map((e) => e.targetHandle as string),
  );

  useEffect(() => {
    if (!hasModeTab || modeTab === "image") return;
    const imageModeKeys = definition.inputs
      .filter((p: any) => p.group === "image-mode" && p.handle)
      .map((p: any) => `in:${p.key}`);
    const hasWiredImageMode = imageModeKeys.some((h) => connectedTargets.has(h));
    if (hasWiredImageMode) setModeTab("image");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const edgeResolveOpts =
    previewRunId !== null
      ? { previewOutputsByNodeId: previewNodeOutputs }
      : undefined;

  const updateInput = (key: string, val: any) => {
    if (isLocked || readOnly) return;
    if (key === "model") {
      updateNodeData(id, { model: val } as any);
    } else {
      const currentInputs = nodeData?.inputs || {};
      updateNodeData(id, {
        inputs: { ...currentInputs, [key]: val },
      } as any);
    }
  };

  const handleModeChange = (mode: "text" | "image") => {
    setModeTab(mode);
    if (mode === "text") {
      updateInput("inputImage", null);
      updateInput("uploadedImages", null);
    }
  };

  const handleSingleRun = () => {
    window.dispatchEvent(
      new CustomEvent("thinkly:run-node", { detail: { nodeId: id } }),
    );
  };

  const handleReset = () => {
    updateNodeData(id, {
      inputs: buildDefaultNodeInputs(definition),
      output: null,
    } as any);
  };

  const handleLockToggle = () => {
    const nextLocked = !isLocked;
    setNodes(
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              draggable: !nextLocked,
              selected: nextLocked ? false : n.selected,
              data: { ...n.data, locked: nextLocked },
            }
          : n,
      ),
    );
  };

  const handleDuplicate = () => {
    const thisNode = nodes.find((n) => n.id === id);
    if (!thisNode) return;
    const newId = `${definition.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newNode = {
      ...thisNode,
      id: newId,
      position: { x: thisNode.position.x + 60, y: thisNode.position.y - 60 },
      selected: true,
      data: JSON.parse(JSON.stringify(thisNode.data)),
    };
    setNodes([
      ...nodes.map((n) => (n.id === id ? { ...n, selected: false } : n)),
      newNode,
    ]);
  };

  const handleDuplicateWithEdges = () => {
    const thisNode = nodes.find((n) => n.id === id);
    if (!thisNode) return;
    const newId = `${definition.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newNode = {
      ...thisNode,
      id: newId,
      position: { x: thisNode.position.x + 60, y: thisNode.position.y - 60 },
      selected: true,
      data: JSON.parse(JSON.stringify(thisNode.data)),
    };
    setNodes([
      ...nodes.map((n) => (n.id === id ? { ...n, selected: false } : n)),
      newNode,
    ]);
    const incomingEdges = edges.filter((e) => e.target === id);
    const newEdges = incomingEdges.map((e) => ({
      ...e,
      id: generateEdgeId(),
      target: newId,
    }));
    setEdges([...edges, ...newEdges]);
  };

  const handleFileUpload = async (
    key: string,
    files: FileList | null,
    isArray = false,
  ) => {
    if (!files?.length || isLocked || readOnly) return;
    setUploadingField(key);

    try {
      let filesToUpload = Array.from(files);
      if (isArray) {
        const paramDef = definition.inputs.find((p) => p.key === key);
        const maxItems = paramDef
          ? getMediaArrayMax(definition, paramDef)
          : 10;
        const currentInputs = nodeData?.inputs || {};
        const currentArr = currentInputs[key] || [];
        const remaining = maxItems - currentArr.length;
        if (remaining <= 0) {
          alert(`You can upload a maximum of ${maxItems} files.`);
          setUploadingField(null);
          return;
        }
        filesToUpload = filesToUpload.slice(0, remaining);
      }

      const { urls: validUrls, firstError } =
        await uploadFilesViaApi(filesToUpload);
      if (firstError) {
        window.alert(firstError);
      }

      if (validUrls.length > 0) {
        const store = useWorkflowStore.getState();
        const latestNode = store.nodes.find((n) => n.id === id);
        const currentInputs = (latestNode?.data as any)?.inputs || {};

        if (isArray) {
          const arr = currentInputs[key] || [];
          const cleanArr = arr.filter(
            (url: string) => !url.startsWith("data:"),
          );
          const paramDef = definition.inputs.find((p) => p.key === key);
          const maxItems = paramDef
            ? getMediaArrayMax(definition, paramDef)
            : 10;
          updateInput(key, [...cleanArr, ...validUrls].slice(0, maxItems));
        } else {
          updateInput(key, validUrls[0]);
        }
      }
    } catch (err) {
      console.error(`[useGenericNodeState] Upload failed for ${key}:`, err);
    } finally {
      setUploadingField(null);
    }
  };

  const handlePromoteInput = useCallback(
    (param: {
      key: string;
      label: string;
      type?: string;
      handle?: { type?: string };
      defaultValue?: unknown;
      options?: Array<{ value: string; label: string }>;
      min?: number;
      max?: number;
      step?: number;
    }) => {
      if (readOnly || isLocked) return;
      const handleId = `in:${param.key}`;
      const mediaMaxCount =
        param.type === "image-array" ||
        param.type === "video-array" ||
        param.type === "audio-array"
          ? getMediaArrayMax(definition, param)
          : param.key === "video_url" || param.handle?.type === "video"
            ? param.type === "video-array" || param.key === "video_urls"
              ? getMediaArrayMax(definition, param)
              : 1
            : definition.limits?.[param.key as keyof typeof definition.limits]
                ?.maxCount;
      const result = promoteInputToRequest({
        nodes: nodes ?? [],
        edges: edges ?? [],
        targetNodeId: id,
        targetHandle: handleId,
        paramKey: param.key,
        paramLabel: param.label,
        paramType: param.type as never,
        handleType: param.handle?.type,
        currentValue: nodeData?.inputs?.[param.key],
        defaultValue: param.defaultValue,
        selectOptions: param.type === "select" ? param.options : undefined,
        numberMin: param.min,
        numberMax: param.max,
        numberStep: param.step,
        mediaMaxCount,
      });
      if (result.error) {
        console.warn("[Add to request]", result.error);
        return;
      }
      setNodes(result.nodes);
      setEdges(result.edges);
    },
    [
      readOnly,
      isLocked,
      nodes,
      edges,
      id,
      nodeData?.inputs,
      setNodes,
      setEdges,
      definition,
    ],
  );

  const removeFileValue = (key: string, indexToRemove?: number) => {
    if (isLocked || readOnly) return;
    const currentInputs = nodeData?.inputs || {};
    if (indexToRemove !== undefined) {
      const arr = [...(currentInputs[key] || [])];
      arr.splice(indexToRemove, 1);
      updateInput(key, arr);
    } else {
      updateInput(key, null);
    }
  };

  const primaryParams = definition.inputs.filter((p) => p.group === "primary");
  const advancedParams = definition.inputs.filter(
    (p) => p.group === "advanced",
  );
  const imageModeParams = definition.inputs.filter((p) => (p as any).group === "image-mode");
  const settingsParams = definition.inputs.filter((p) => (p as any).group === "settings");

  return {
    nodeData,
    isPreviewMode,
    isDimmed,
    isExecuting,
    isRunPending,
    isRunCompleted,
    isRunFailed,
    output,
    nodeError,
    isLocked,
    readOnly,
    hasModeTab,
    modeLabels,
    modeTab,
    setModeTab,
    connectedTargets,
    edgeResolveOpts,
    updateInput,
    handleModeChange,
    handleSingleRun,
    handleReset,
    handleLockToggle,
    handleDuplicate,
    handleDuplicateWithEdges,
    handleFileUpload,
    handlePromoteInput,
    removeFileValue,
    showAdvanced,
    setShowAdvanced,
    showSettings,
    setShowSettings,
    uploadingField,
    activeUploadPopup,
    setActiveUploadPopup,
    activeDropdown,
    setActiveDropdown,
    activeExpandParamKey,
    setActiveExpandParamKey,
    primaryParams,
    advancedParams,
    imageModeParams,
    settingsParams,
    deleteNode,
    setEdges,
  };
}
