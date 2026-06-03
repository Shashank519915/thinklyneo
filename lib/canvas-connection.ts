/**
 * @fileoverview Shared Canvas edge validation (datatype, single-target, cycle).
 * Used by `Canvas.tsx` and unit-tested without mounting React Flow.
 */

import type { Connection, Edge, Node } from "@xyflow/react";
import { isValidConnection, validateNewEdge } from "@/lib/execution";

export type CanvasConnectionRejection =
  | "invalid-type"
  | "duplicate-target"
  | "cycle";

export interface CanvasConnectionEvaluation {
  allowed: boolean;
  reason?: CanvasConnectionRejection;
  error?: string;
}

/** Mirrors `Canvas` `isValidConnection` / `onConnect` guards. */
type ConnectionLike = {
  source?: string | null;
  target?: string | null;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

export function evaluateCanvasConnection(
  nodes: Node[],
  edges: Edge[],
  connection: ConnectionLike
): CanvasConnectionEvaluation {
  const sourceNode = nodes.find((n) => n.id === connection.source);
  const targetNode = nodes.find((n) => n.id === connection.target);

  const typeOk = isValidConnection(
    connection.sourceHandle,
    connection.targetHandle,
    sourceNode?.type,
    targetNode?.type
  );

  if (!typeOk) {
    return { allowed: false, reason: "invalid-type" };
  }

  if (connection.targetHandle !== "in:images") {
    const hasExisting = edges.some(
      (e) =>
        e.target === connection.target &&
        e.targetHandle === connection.targetHandle
    );
    if (hasExisting) {
      return { allowed: false, reason: "duplicate-target" };
    }
  }

  const cycleCheck = validateNewEdge(nodes, edges, {
    source: connection.source ?? "",
    target: connection.target ?? "",
  });

  if (!cycleCheck.valid) {
    return {
      allowed: false,
      reason: "cycle",
      error: cycleCheck.error,
    };
  }

  return { allowed: true };
}
