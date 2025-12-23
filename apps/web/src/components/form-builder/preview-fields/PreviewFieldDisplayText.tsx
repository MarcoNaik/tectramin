"use client";

import type { FieldTemplateData } from "@/types";

interface PreviewFieldDisplayTextProps {
  field: FieldTemplateData;
  onSelect: () => void;
  isSelected: boolean;
}

export function PreviewFieldDisplayText({
  field,
  onSelect,
  isSelected,
}: PreviewFieldDisplayTextProps) {
  const isHeader = field.displayStyle === "header";
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg p-2 -m-2 transition-colors ${isSelected ? "bg-blue-50 ring-2 ring-blue-300" : "hover:bg-gray-50"}`}
    >
      <div className={isHeader ? "text-lg font-semibold text-gray-900" : "text-sm text-gray-700"}>
        {field.label}
      </div>
      {field.subheader && (
        <div className="text-xs text-gray-500 mt-0.5">{field.subheader}</div>
      )}
    </div>
  );
}
