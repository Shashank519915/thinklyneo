"use client";

/**
 * @fileoverview Custom Bézier edge: execution pulse tint, hover delete affordance, preview-mode dimming for non-selected subgraphs.
 */

import { useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflow-store";

/** React Flow custom edge bridging store-driven execution highlighting with `EdgeLabelRenderer` delete control (hidden during preview replay). */
export default function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  markerEnd,
  source,
  target,
  data,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const { deleteElements } = useReactFlow();
  const { executingNodeIds, previewRunId, previewRunNodeIds } = useWorkflowStore();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // In preview mode: dim edge if source OR target is not in the previewed run
  const isPreviewMode = previewRunId !== null;
  const isDimmed =
    isPreviewMode &&
    (!previewRunNodeIds.has(source) || !previewRunNodeIds.has(target));

  // Source node currently executing → pulse purple to match glow
  const sourceExecuting = isPreviewMode ? false : executingNodeIds.includes(source);
  const baseColor = (data?.color as string | undefined) ?? "#7C3AED";
  const activeColor = sourceExecuting ? "#7C3AED" : baseColor;
  const strokeColor = hovered || selected ? shadeDown(activeColor) : activeColor;
  const strokeWidth = hovered || selected ? 3.5 : 2.5;

  return (
    <g style={{ opacity: isDimmed ? 0.2 : 1, transition: "opacity 0.2s" }}>
      {/* Invisible wider path for easier hover/click */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: "pointer" }}
      />

      {/* Solid edge */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        markerEnd={markerEnd}
        className={sourceExecuting ? "edge-executing" : ""}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          transition: "stroke 0.2s, stroke-width 0.1s",
          pointerEvents: "none",
        }}
      />

      {/* Delete button on hover — suppressed in preview mode */}
      {(hovered || selected) && !isPreviewMode && (
        <EdgeLabelRenderer>
          <button
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow text-gray-500 hover:text-red-500 hover:border-red-200 transition-colors text-[10px] font-bold z-10"
            onClick={() => deleteElements({ edges: [{ id }] })}
          >
            ×
          </button>
        </EdgeLabelRenderer>
      )}
    </g>
  );
}

/** Slightly darken a hex color for hover state */
function shadeDown(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (n >> 16) - 30);
  const g = Math.max(0, ((n >> 8) & 0xff) - 30);
  const b = Math.max(0, (n & 0xff) - 30);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
