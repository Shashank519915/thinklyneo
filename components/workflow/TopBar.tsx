"use client";

/**
 * @fileoverview Workflow editor title bar: inline rename PATCH, dashboard back navigation, JSON import/export bridging API routes.
 */

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Download, Upload } from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";

interface TopBarProps {
  workflowId: string;
}

/** Top stripe coordinating `/api/workflows/:id` PATCH and `/export`/`/import` UX for the loaded graph instance. */
export default function TopBar({ workflowId }: TopBarProps) {
  const router = useRouter();
  const { workflowName, setWorkflowName } = useWorkflowStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(workflowName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(workflowName);
  }, [workflowName]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleNameSave = async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === workflowName) {
      setEditValue(workflowName);
      setIsEditing(false);
      return;
    }
    setWorkflowName(trimmed);
    setIsEditing(false);
    try {
      await fetch(`/api/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
    } catch {
      // ignore
    }
  };

  const handleExport = async () => {
    try {
      const resp = await fetch(`/api/workflows/${workflowId}/export`);
      const data = await resp.json();
      const { downloadJson } = await import("@/lib/utils");
      downloadJson(data, `${workflowName.replace(/\s+/g, "-").toLowerCase()}.json`);
    } catch {
      // ignore
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const resp = await fetch("/api/workflows/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ json: text }),
        });
        const data = await resp.json();
        if (data.data?.id) {
          router.push(`/workflow/${data.data.id}`);
        }
      } catch {
        // ignore
      }
    };
    input.click();
  };

  return (
    <div className="flex items-center justify-between h-[52px] px-4 bg-white border-b border-gray-200 flex-shrink-0">
      {/* Left: back + workflow name */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push("/dashboard")}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          title="Back to Dashboard"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameSave();
              if (e.key === "Escape") { setEditValue(workflowName); setIsEditing(false); }
            }}
            className="text-[15px] font-semibold text-gray-900 bg-transparent outline-none border border-[#7C3AED] rounded px-1 w-48"
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-[15px] font-semibold text-gray-900 hover:text-[#7C3AED] transition-colors truncate max-w-[280px]"
            title="Click to rename"
          >
            {workflowName}
          </button>
        )}
      </div>

      {/* Right: export / import */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleExport}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          title="Export workflow"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={handleImport}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          title="Import workflow"
        >
          <Upload className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
