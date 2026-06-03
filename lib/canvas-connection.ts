/**
 * @fileoverview Shared Canvas edge validation (datatype, single-target, cycle).
 * Used by `Canvas.tsx` and unit-tested without mounting React Flow.
 */

import type { Connection, Edge, Node } from "@xyflow/react";
import { isLikelyVideoUrl, parseMediaList } from "@galaxy/shared";
import { isValidConnection, validateNewEdge } from "@/lib/execution";
import { classifyMediaUrl, resolvePropagatedEdgeValue } from "@/lib/utils";

export type CanvasConnectionRejection =
  | "invalid-type"
  | "duplicate-target"
  | "single-video-only"
  | "single-image-only"
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

function countImageUrlsFromSource(
  nodes: Node[],
  connection: ConnectionLike
): number {
  if (!connection.source || !connection.sourceHandle) return 0;
  const edge = {
    id: "__eval__",
    source: connection.source,
    target: connection.target ?? "",
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle ?? "",
  } as Edge;
  const val = resolvePropagatedEdgeValue(edge, nodes);
  return parseMediaList(val).filter((u) => classifyMediaUrl(u)?.kind === "image").length;
}

function countVideoUrlsFromSource(
  nodes: Node[],
  connection: ConnectionLike
): number {
  if (!connection.source || !connection.sourceHandle) return 0;
  const edge = {
    id: "__eval__",
    source: connection.source,
    target: connection.target ?? "",
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle ?? "",
  } as Edge;
  const val = resolvePropagatedEdgeValue(edge, nodes);
  const videos = parseMediaList(val).filter(isLikelyVideoUrl);
  if (videos.length > 0) return videos.length;
  return parseMediaList(val).length;
}

/** Mirrors `Canvas` `isValidConnection` / `onConnect` guards. */
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

  const multiFanInHandles = ["in:images", "in:video_urls"];
  if (!multiFanInHandles.includes(connection.targetHandle ?? "")) {
    const hasExisting = edges.some(
      (e) =>
        e.target === connection.target &&
        e.targetHandle === connection.targetHandle
    );
    if (hasExisting) {
      const isMergeAvVideo =
        targetNode?.type === "mergeAV" &&
        connection.targetHandle === "in:video_url";
      const isCropImage =
        targetNode?.type === "cropImage" &&
        connection.targetHandle === "in:inputImage";
      return {
        allowed: false,
        reason: "duplicate-target",
        error: isMergeAvVideo
          ? "Merge Audio & Video accepts only one video input. Disconnect the existing wire first."
          : isCropImage
            ? "Crop Image accepts only one image input. Disconnect the existing wire first."
            : undefined,
      };
    }
  }

  if (
    targetNode?.type === "cropImage" &&
    connection.targetHandle === "in:inputImage" &&
    connection.source
  ) {
    const imageCount = countImageUrlsFromSource(nodes, connection);
    if (imageCount > 1) {
      return {
        allowed: false,
        reason: "single-image-only",
        error:
          "Crop Image accepts only one image. Use a single-image field or disconnect extra sources.",
      };
    }
  }

  if (
    targetNode?.type === "mergeAV" &&
    connection.targetHandle === "in:video_url" &&
    connection.source
  ) {
    const videoCount = countVideoUrlsFromSource(nodes, connection);
    if (videoCount > 1) {
      return {
        allowed: false,
        reason: "single-video-only",
        error:
          "Merge Audio & Video accepts only one video. Use Merge Videos to combine multiple clips.",
      };
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
