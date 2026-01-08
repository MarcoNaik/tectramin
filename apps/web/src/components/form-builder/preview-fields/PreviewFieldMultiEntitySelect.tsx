"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { InlineTextEditor } from "@/components/ui/InlineTextEditor";
import type { FieldTemplateData } from "@/types";

interface EntitySelectConfig {
  entityTypeId?: string;
  filterByFieldId?: string;
}

function parseEntitySelectConfig(displayStyle: string | undefined): EntitySelectConfig {
  if (!displayStyle) return {};
  try {
    const parsed = JSON.parse(displayStyle);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as EntitySelectConfig;
    }
    return {};
  } catch {
    return {};
  }
}

interface PreviewFieldMultiEntitySelectProps {
  field: FieldTemplateData;
  editingProperty: "label" | "placeholder" | null;
  onEditLabel: () => void;
  onSaveEdit: (value: string) => void;
  onCancelEdit: () => void;
  onSelect: () => void;
  isSelected: boolean;
}

export function PreviewFieldMultiEntitySelect({
  field,
  editingProperty,
  onEditLabel,
  onSaveEdit,
  onCancelEdit,
  onSelect,
  isSelected,
}: PreviewFieldMultiEntitySelectProps) {
  const config = parseEntitySelectConfig(field.displayStyle);
  const entityType = useQuery(
    api.admin.lookupEntityTypes.get,
    config.entityTypeId ? { id: config.entityTypeId as Id<"lookupEntityTypes"> } : "skip"
  );

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
        <span className="text-gray-400">
          {entityType ? `Seleccionar multiples ${entityType.name}...` : "Seleccionar multiples entidades..."}
        </span>
      </div>
      {entityType ? (
        <p className="text-xs text-purple-500 mt-1">
          Opciones de: {entityType.name} (seleccion multiple)
        </p>
      ) : (
        <p className="text-xs text-orange-500 mt-1">
          Sin tipo de entidad configurado
        </p>
      )}
    </div>
  );
}
