"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { InlineTextEditor } from "@/components/ui/InlineTextEditor";
import type { FieldTemplateData } from "@/types";

interface TaskInstanceSelectConfig {
  sourceTaskTemplateId?: string;
  displayFieldTemplateId?: string;
}

function parseTaskInstanceSelectConfig(displayStyle: string | undefined): TaskInstanceSelectConfig {
  if (!displayStyle) return {};
  try {
    const parsed = JSON.parse(displayStyle);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as TaskInstanceSelectConfig;
    }
    return {};
  } catch {
    return {};
  }
}

interface PreviewFieldTaskInstanceSelectProps {
  field: FieldTemplateData;
  editingProperty: "label" | "placeholder" | null;
  onEditLabel: () => void;
  onSaveEdit: (value: string) => void;
  onCancelEdit: () => void;
  onSelect: () => void;
  isSelected: boolean;
}

export function PreviewFieldTaskInstanceSelect({
  field,
  editingProperty,
  onEditLabel,
  onSaveEdit,
  onCancelEdit,
  onSelect,
  isSelected,
}: PreviewFieldTaskInstanceSelectProps) {
  const config = parseTaskInstanceSelectConfig(field.displayStyle);

  const sourceTaskTemplate = useQuery(
    api.admin.taskTemplates.get,
    config.sourceTaskTemplateId ? { id: config.sourceTaskTemplateId as Id<"taskTemplates"> } : "skip"
  );

  const displayField = useQuery(
    api.admin.fieldTemplates.get,
    config.displayFieldTemplateId ? { id: config.displayFieldTemplateId as Id<"fieldTemplates"> } : "skip"
  );

  const isConfigured = sourceTaskTemplate && displayField;

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
        <option value="">
          {isConfigured
            ? `Seleccionar instancia de ${sourceTaskTemplate.name}...`
            : "Seleccionar instancia..."}
        </option>
      </select>
      {isConfigured ? (
        <p className="text-xs text-purple-500 mt-1">
          Instancias de: {sourceTaskTemplate.name} (mostrar: {displayField.label})
        </p>
      ) : (
        <p className="text-xs text-orange-500 mt-1">
          {!config.sourceTaskTemplateId
            ? "Sin tarea fuente configurada"
            : !config.displayFieldTemplateId
              ? "Sin campo de etiqueta configurado"
              : "Cargando configuracion..."}
        </p>
      )}
    </div>
  );
}
