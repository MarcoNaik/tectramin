"use client";

import { InlineTextEditor } from "@/components/ui/InlineTextEditor";
import type { FieldTemplateData } from "@/types";

interface PreviewFieldCoordinatedProps {
  field: FieldTemplateData;
  editingProperty: "label" | "placeholder" | null;
  onEditLabel: () => void;
  onSaveEdit: (value: string) => void;
  onCancelEdit: () => void;
  onSelect: () => void;
  isSelected: boolean;
}

export function PreviewFieldCoordinated({
  field,
  editingProperty,
  onEditLabel,
  onSaveEdit,
  onCancelEdit,
  onSelect,
  isSelected,
}: PreviewFieldCoordinatedProps) {
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
          <span className="ml-2 text-xs text-gray-400">📍</span>
        </label>
      )}
      {field.subheader && (
        <div className="text-xs text-gray-500 mb-1.5">{field.subheader}</div>
      )}
      <div className="flex gap-3">
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">Latitud</div>
          <div className="border border-gray-300 rounded-lg px-3 py-2.5 text-gray-400">
            -33.4489
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">Longitud</div>
          <div className="border border-gray-300 rounded-lg px-3 py-2.5 text-gray-400">
            -70.6693
          </div>
        </div>
      </div>
    </div>
  );
}
