"use client";

import { InlineTextEditor } from "@/components/ui/InlineTextEditor";
import type { FieldTemplateData } from "@/types";

interface PreviewFieldUserSelectProps {
  field: FieldTemplateData;
  editingProperty: "label" | "placeholder" | null;
  onEditLabel: () => void;
  onSaveEdit: (value: string) => void;
  onCancelEdit: () => void;
  onSelect: () => void;
  isSelected: boolean;
}

export function PreviewFieldUserSelect({
  field,
  editingProperty,
  onEditLabel,
  onSaveEdit,
  onCancelEdit,
  onSelect,
  isSelected,
}: PreviewFieldUserSelectProps) {
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
          className="mb-1"
        />
      ) : (
        <label
          className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
          onClick={(e) => { e.stopPropagation(); onSelect(); onEditLabel(); }}
        >
          {field.label}
          {field.isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {field.subheader && (
        <div className="text-xs text-gray-500 mb-1">{field.subheader}</div>
      )}
      <select
        disabled
        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 cursor-not-allowed"
      >
        <option value="">Seleccionar un usuario...</option>
      </select>
      <p className="text-xs text-blue-500 mt-1">Usuarios cargados de la base de datos</p>
    </div>
  );
}
