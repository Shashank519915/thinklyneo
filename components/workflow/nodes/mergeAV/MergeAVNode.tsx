"use client";

import React from "react";
import type { NodeProps } from "@xyflow/react";
import GenericNode from "../generic/GenericNode";
import { MergeAVParameters } from "../generic/fields/MergeAVParameters";
import { isRequestPromoted, shouldShowAddToRequest } from "@/lib/promote-to-request";
import { resolveEffectiveParamValue } from "@/lib/promoted-input-value";
import { resolvePropagatedEdgeValue } from "@/lib/utils";

export default function MergeAVNode(props: NodeProps) {
  const customRender = (
    param: any,
    defaultRender: (param: any) => React.ReactNode,
    state: any
  ) => {
    if (param.uiVariant === "magica-volume-row" || param.uiVariant === "magica-side-label") {
      const handleId = `in:${param.key}`;
      const isWired = state.connectedTargets.has(handleId);
      const requestPromoted = isRequestPromoted(
        state.nodes ?? [],
        state.edges ?? [],
        props.id,
        handleId
      );
      const showAddToRequestBtn = shouldShowAddToRequest({
        hasHandle: !!param.handle,
        readOnly: state.readOnly,
        isLocked: state.isLocked,
        wired: isWired,
      });

      const rawValue = resolveEffectiveParamValue({
        requestPromoted,
        localValue: state.nodeData?.inputs?.[param.key],
        defaultValue: param.defaultValue,
        nodes: state.nodes ?? [],
        edges: state.edges ?? [],
        targetNodeId: props.id,
        targetHandle: handleId,
        paramType: param.type,
        previewOpts: state.edgeResolveOpts,
      });

      const value = param.type === "number" || param.type === "slider"
        ? typeof rawValue === "number"
          ? rawValue
          : Number(rawValue)
        : rawValue ?? param.defaultValue ?? "";

      let wiredValue: any = null;
      if (isWired) {
        const inboundEdge = (state.edges ?? []).find(
          (e: any) => e.target === props.id && e.targetHandle === handleId
        );
        if (inboundEdge) {
          wiredValue = resolvePropagatedEdgeValue(
            inboundEdge,
            state.nodes ?? [],
            state.edgeResolveOpts
          );
        }
      }

      return (
        <MergeAVParameters
          key={param.key}
          param={param}
          value={value}
          disabled={state.readOnly || state.isLocked || requestPromoted}
          isWired={isWired}
          requestPromoted={requestPromoted}
          wiredValue={wiredValue}
          updateInput={state.updateInput}
          showAddToRequestBtn={showAddToRequestBtn}
          isLocked={state.isLocked}
          handlePromoteInput={state.handlePromoteInput}
          removeFileValue={state.removeFileValue}
          activeUploadPopup={state.activeUploadPopup}
          setActiveUploadPopup={state.setActiveUploadPopup}
          uploadingField={state.uploadingField}
          handleFileUpload={state.handleFileUpload}
          id={props.id}
          readOnly={state.readOnly}
          handleId={handleId}
        />
      );
    }

    return defaultRender(param);
  };

  return <GenericNode {...props} customRenderParameterInput={customRender} />;
}
