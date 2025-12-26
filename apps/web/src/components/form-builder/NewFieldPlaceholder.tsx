"use client";

import { FIELD_TYPES } from "@/types";

interface NewFieldPlaceholderProps {
  fieldType: string;
  isOverlay?: boolean;
}

export function NewFieldPlaceholder({ fieldType, isOverlay = false }: NewFieldPlaceholderProps) {
  const typeConfig = FIELD_TYPES.find((t) => t.value === fieldType);
  const label = `New ${typeConfig?.label || fieldType} field`;

  return (
    <div className={`rounded-lg ${isOverlay ? "" : "opacity-50"}`}>
      <div className="flex items-start gap-2">
        <button className="mt-1 text-blue-400">
          <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
            <circle cx="2" cy="2" r="1.5" />
            <circle cx="8" cy="2" r="1.5" />
            <circle cx="2" cy="8" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="2" cy="14" r="1.5" />
            <circle cx="8" cy="14" r="1.5" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="rounded-lg p-2 bg-blue-50 border-2 border-dashed border-blue-400">
            <label className="block text-sm font-medium text-blue-600 mb-1.5">
              {label}
            </label>
            {fieldType === "boolean" ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-blue-300 rounded bg-white" />
                <span className="text-sm text-blue-400">Yes</span>
              </div>
            ) : fieldType === "displayText" ? (
              <div className="text-sm text-blue-400 italic">Display text content...</div>
            ) : fieldType === "attachment" ? (
              <div className="border-2 border-dashed border-blue-300 rounded-lg px-3 py-4 text-center">
                <span className="text-blue-400 text-sm">+ Add attachment</span>
              </div>
            ) : fieldType === "date" ? (
              <div className="border border-blue-300 rounded-lg px-3 py-2.5 text-blue-400 bg-white">
                Select date...
              </div>
            ) : fieldType === "select" || fieldType === "userSelect" ? (
              <div className="border border-blue-300 rounded-lg px-3 py-2.5 text-blue-400 flex items-center justify-between bg-white">
                <span>Select...</span>
                <span>▼</span>
              </div>
            ) : (
              <div className="border border-blue-300 rounded-lg px-3 py-2.5 text-blue-400 bg-white">
                Enter {typeConfig?.label?.toLowerCase() || "text"}...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
