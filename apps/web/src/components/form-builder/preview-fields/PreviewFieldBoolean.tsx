"use client";

import { InlineTextEditor } from "@/components/ui/InlineTextEditor";
import type { FieldTemplateData } from "@/types";

interface PreviewFieldBooleanProps {
  field: FieldTemplateData;
  editingProperty: "label" | "placeholder" | null;
  onEditLabel: () => void;
  onSaveEdit: (value: string) => void;
  onCancelEdit: () => void;
  onSelect: () => void;
  isSelected: boolean;
}

export function PreviewFieldBoolean({
  field,
  editingProperty,
  onEditLabel,
  onSaveEdit,
  onCancelEdit,
  onSelect,
  isSelected,
}: PreviewFieldBooleanProps) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg p-2 -m-2 transition-colors ${isSelected ? "bg-blue-50 ring-2 ring-blue-300" : "hover:bg-gray-50"}`}
    >
      <div className="flex items-center justify-between">
        {editingProperty === "label" ? (
          <InlineTextEditor
            value={field.label}
            onSave={onSaveEdit}
            onCancel={onCancelEdit}
            className="flex-1"
          />
        ) : (
          <label
            className="text-sm font-medium text-gray-700 cursor-pointer hover:text-blue-600"
            onClick={(e) => { e.stopPropagation(); onEditLabel(); }}
          >
            {field.label}
            {field.isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="w-11 h-6 bg-gray-200 rounded-full relative flex-shrink-0 ml-4">
          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow" />
        </div>
      </div>
      {field.subheader && (
        <div className="text-xs text-gray-500 mt-1">{field.subheader}</div>
      )}
    </div>
  );
}
