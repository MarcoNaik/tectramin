"use client";

import { InlineTextEditor } from "@/components/ui/InlineTextEditor";
import type { FieldTemplateData } from "@/types";

interface PreviewFieldNumberProps {
  field: FieldTemplateData;
  editingProperty: "label" | "placeholder" | null;
  onEditLabel: () => void;
  onEditPlaceholder: () => void;
  onSaveEdit: (value: string) => void;
  onCancelEdit: () => void;
  onSelect: () => void;
  isSelected: boolean;
}

export function PreviewFieldNumber({
  field,
  editingProperty,
  onEditLabel,
  onEditPlaceholder,
  onSaveEdit,
  onCancelEdit,
  onSelect,
  isSelected,
}: PreviewFieldNumberProps) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg p-2 -m-2 transition-colors ${isSelected ? "bg-blue-50/70" : "hover:bg-gray-50"}`}
    >
      {editingProperty === "label" ? (
        <InlineTextEditor
          value={field.label}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          className="w-full mb-1.5"
        />
      ) : (
        <label
          className="block text-sm font-medium text-gray-700 mb-1.5 cursor-pointer hover:text-blue-600"
          onClick={(e) => { e.stopPropagation(); onSelect(); onEditLabel(); }}
        >
          {field.label}
          {field.isRequired && <span className="text-red-500 ml-1">*</span>}
          <span className="ml-2 text-xs text-gray-400">#</span>
        </label>
      )}
      {field.subheader && (
        <div className="text-xs text-gray-500 mb-1.5">{field.subheader}</div>
      )}
      {editingProperty === "placeholder" ? (
        <InlineTextEditor
          value={field.placeholder || ""}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          placeholder="Ingresa texto de ejemplo..."
          className="w-full"
        />
      ) : (
        <div
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-gray-400 cursor-pointer hover:border-blue-400"
          onClick={(e) => { e.stopPropagation(); onSelect(); onEditPlaceholder(); }}
        >
          {field.placeholder || "0"}
        </div>
      )}
    </div>
  );
}
