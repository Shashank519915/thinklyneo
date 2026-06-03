import type { ReactNode } from "react";
import { ReactFlowProvider } from "@xyflow/react";

/** Minimal provider shell for node component RTL tests. */
export function ReactFlowTestWrapper({ children }: { children: ReactNode }) {
  return <ReactFlowProvider>{children}</ReactFlowProvider>;
}
