"use client";

import React, { useState } from "react";
import type { NodeProps } from "@xyflow/react";
import GenericNode from "../generic/GenericNode";
import { KlingElementsParameter } from "../generic/fields/KlingElementsParameter";
import { isRequestPromoted } from "@/lib/promote-to-request";

export default function KlingV3Node(props: NodeProps) {
  const [elementItems, setElementItems] = useState<Record<string, Record<string, any>>>(() => {
    const saved = (props.data as any)?.inputs?.elements;
    if (Array.isArray(saved) && saved.length > 0) {
      return Object.fromEntries(saved.map((el: any, i: number) => [String(i), el]));
    }
    return {};
  });
  const [uploadingElementField, setUploadingElementField] = useState<string | null>(null);

  const customRender = (
    param: any,
    defaultRender: (param: any) => React.ReactNode,
    state: any
  ) => {
    if (param.type === "element-array") {
      const handleId = `in:${param.key}`;
      const requestPromoted = isRequestPromoted(
        state.nodes ?? [],
        state.edges ?? [],
        props.id,
        handleId
      );

      return (
        <KlingElementsParameter
          key={param.key}
          param={param}
          disabled={state.readOnly || state.isLocked || requestPromoted}
          updateInput={state.updateInput}
          elementItems={elementItems}
          setElementItems={setElementItems}
          uploadingElementField={uploadingElementField}
          setUploadingElementField={setUploadingElementField}
          activeUploadPopup={state.activeUploadPopup}
          setActiveUploadPopup={state.setActiveUploadPopup}
          id={props.id}
          edges={state.edges ?? []}
          nodes={state.nodes ?? []}
          setEdges={state.setEdges}
          connectedTargets={state.connectedTargets}
        />
      );
    }

    return defaultRender(param);
  };

  return <GenericNode {...props} customRenderParameterInput={customRender} />;
}
