"use client";

import { InlineTextEditor } from "@/components/ui/InlineTextEditor";
import type { FieldTemplateData } from "@/types";

interface SelectOption {
  value: string;
  label: string;
}

function parseSelectOptions(displayStyle: string | undefined): SelectOption[] {
  if (!displayStyle) return [];
  try {
    const parsed = JSON.parse(displayStyle);
    if (Array.isArray(parsed)) {
      return parsed.filter((opt): opt is SelectOption =>
        typeof opt === "object" && opt !== null && typeof opt.value === "string" && typeof opt.label === "string"
      );
    }
    return [];
  } catch {
    return [];
  }
}

interface PreviewFieldMultiSelectProps {
  field: FieldTemplateData;
  editingProperty: "label" | "placeholder" | null;
  onEditLabel: () => void;
  onSaveEdit: (value: string) => void;
  onCancelEdit: () => void;
  onSelect: () => void;
  isSelected: boolean;
}

export function PreviewFieldMultiSelect({
  field,
  editingProperty,
  onEditLabel,
  onSaveEdit,
  onCancelEdit,
  onSelect,
  isSelected,
}: PreviewFieldMultiSelectProps) {
  const options = parseSelectOptions(field.displayStyle);

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
      <div className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 cursor-not-allowed min-h-[38px] flex items-center gap-2 flex-wrap">
        <span className="text-gray-400">Seleccionar multiples opciones...</span>
      </div>
      {options.length === 0 ? (
        <p className="text-xs text-gray-400 mt-1">Sin opciones configuradas</p>
      ) : (
        <p className="text-xs text-gray-400 mt-1">{options.length} opciones disponibles</p>
      )}
    </div>
  );
}
