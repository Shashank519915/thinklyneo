"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useViewport, useUpdateNodeInternals } from "@xyflow/react";
import { X } from "lucide-react";

interface SettingsPanelOverlayProps {
  isOpen: boolean;
  nodeId: string;
  nodeName: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function SettingsPanelOverlay({
  isOpen,
  nodeId,
  nodeName,
  onClose,
  children,
}: SettingsPanelOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const viewport = useViewport();
  const updateNodeInternals = useUpdateNodeInternals();
  const [render, setRender] = React.useState(isOpen);

  // Sync render state with a delay for unmounting
  useEffect(() => {
    if (isOpen) {
      setRender(true);
    } else {
      const timer = setTimeout(() => {
        setRender(false);
      }, 300); // match duration-300
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Continuously update node internals when viewport changes so the Handles
  // inside this fixed panel get re-measured and edges route perfectly.
  useEffect(() => {
    if (render) {
      updateNodeInternals(nodeId);
    }
  }, [viewport.x, viewport.y, viewport.zoom, nodeId, updateNodeInternals, render]);

  // Ensure handles are measured when the panel first mounts
  useEffect(() => {
    if (render) {
      const frame = requestAnimationFrame(() => {
        updateNodeInternals(nodeId);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [nodeId, updateNodeInternals, render]);

  if (!render) return null;

  return (
    <div
      ref={panelRef}
      className={`wf-settings-panel-overlay nodrag nowheel nopan absolute w-[380px] rounded-[1.25rem] bg-[#050505]/95 border border-white/10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.85)] backdrop-blur-xl pointer-events-auto duration-300 ${
        isOpen 
          ? "animate-in slide-in-from-top-4 fade-in fill-mode-both" 
          : "animate-out slide-out-to-top-4 fade-out fill-mode-both"
      }`}
      style={{
        top: "calc(100% + 16px)", // Pop out below the node
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 999
      }}
    >
      <div className="absolute inset-0 pointer-events-none glass-noise z-0 rounded-[calc(1.25rem-1px)] opacity-50" />
      
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/5 pl-8 pr-4 py-3 bg-white/[0.02] rounded-t-[1.25rem]">
        <div className="text-[13px] font-semibold tracking-wide text-zinc-100 uppercase font-mono">
          {nodeName} Settings
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 pr-4 py-4 max-h-[60vh] overflow-y-auto overflow-x-visible [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent] hover:[scrollbar-color:rgba(255,255,255,0.3)_transparent]">
        <div className="pl-8 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}
