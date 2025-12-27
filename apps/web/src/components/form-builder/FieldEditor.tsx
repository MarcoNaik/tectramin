"use client";

import { useState } from "react";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import type { FieldTemplateData, FieldConditionData } from "@/types";
import { DebouncedInput } from "@/components/ui/DebouncedInput";
import { ConditionEditor } from "./ConditionEditor";

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

function SelectOptionsEditor({
  options,
  onChange,
}: {
  options: SelectOption[];
  onChange: (options: SelectOption[]) => void;
}) {
  const [newOption, setNewOption] = useState("");

  const handleAdd = () => {
    if (!newOption.trim()) return;
    const value = newOption.trim().toLowerCase().replace(/\s+/g, "_");
    onChange([...options, { value, label: newOption.trim() }]);
    setNewOption("");
  };

  const handleRemove = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-1">Opciones</label>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Agregar opción..."
          className="flex-1 border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newOption.trim()}
          className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-blue-600"
        >
          Agregar
        </button>
      </div>
      {options.length > 0 && (
        <div className="space-y-1">
          {options.map((opt, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
              <span className="text-sm">{opt.label}</span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="text-red-500 hover:text-red-700 text-sm font-bold"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
      {options.length === 0 && (
        <p className="text-xs text-gray-500">Sin opciones agregadas aún</p>
      )}
    </div>
  );
}

interface FieldEditorProps {
  selectedField: FieldTemplateData | undefined;
  selectedTemplateId: Id<"taskTemplates"> | null;
  allFields: FieldTemplateData[];
  conditions: FieldConditionData[];
  onClose: () => void;
  onUpdate: (fieldId: Id<"fieldTemplates">, updates: {
    label?: string;
    fieldType?: string;
    placeholder?: string;
    isRequired?: boolean;
    subheader?: string;
    displayStyle?: string;
    conditionLogic?: "AND" | "OR" | null;
  }) => void;
  onDelete: (fieldId: Id<"fieldTemplates">) => void;
}

export function FieldEditor({
  selectedField,
  selectedTemplateId,
  allFields,
  conditions,
  onClose,
  onUpdate,
  onDelete,
}: FieldEditorProps) {
  if (!selectedTemplateId) {
    return null;
  }

  if (!selectedField) {
    return (
      <div className="w-72 flex-shrink-0">
        <div className="border-l border-gray-200 bg-gray-50 h-full flex items-center justify-center p-6">
          <p className="text-gray-400 text-center text-sm font-medium">
            Selecciona un campo para editar sus propiedades
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 flex-shrink-0">
      <div className="border-l border-gray-200 bg-white h-full flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">Editar Campo</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            &times;
          </button>
        </div>
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Etiqueta</label>
            <DebouncedInput
              value={selectedField.label}
              onChange={(value) => onUpdate(selectedField._id, { label: value })}
              className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Campo</label>
            <select
              value={selectedField.fieldType}
              onChange={(e) => onUpdate(selectedField._id, { fieldType: e.target.value })}
              className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="text">Texto</option>
              <option value="number">Número</option>
              <option value="boolean">Sí/No</option>
              <option value="date">Fecha</option>
              <option value="attachment">Adjunto</option>
              <option value="displayText">Texto de Visualización</option>
              <option value="select">Selección</option>
              <option value="userSelect">Selección de Usuario</option>
            </select>
          </div>
          {selectedField.fieldType === "displayText" && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Estilo de Visualización</label>
              <select
                value={selectedField.displayStyle || "simple"}
                onChange={(e) => onUpdate(selectedField._id, { displayStyle: e.target.value })}
                className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="header">Encabezado (Grande, Negrita)</option>
                <option value="simple">Simple (Texto Normal)</option>
              </select>
            </div>
          )}
          {selectedField.fieldType === "select" && (
            <SelectOptionsEditor
              options={parseSelectOptions(selectedField.displayStyle)}
              onChange={(options) => onUpdate(selectedField._id, { displayStyle: JSON.stringify(options) })}
            />
          )}
          {selectedField.fieldType === "userSelect" && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 font-medium">Opciones cargadas de la tabla de usuarios</p>
              <p className="text-xs text-blue-600 mt-1">Todos los usuarios aparecerán en el menú desplegable</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Subtítulo</label>
            <DebouncedInput
              value={selectedField.subheader || ""}
              onChange={(value) => onUpdate(selectedField._id, { subheader: value })}
              className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Texto de ayuda opcional..."
            />
          </div>
          {(selectedField.fieldType === "text" || selectedField.fieldType === "number") && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Texto de Ejemplo</label>
              <DebouncedInput
                value={selectedField.placeholder || ""}
                onChange={(value) => onUpdate(selectedField._id, { placeholder: value })}
                className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ingresa texto de ejemplo..."
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="field-required-sidebar"
              checked={selectedField.isRequired}
              onChange={(e) => onUpdate(selectedField._id, { isRequired: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="field-required-sidebar" className="text-sm text-gray-700 font-medium">
              Campo requerido
            </label>
          </div>
          {selectedField.fieldType !== "displayText" && (
            <ConditionEditor
              field={selectedField}
              allFields={allFields}
              conditions={conditions}
              onConditionLogicChange={(logic) =>
                onUpdate(selectedField._id, { conditionLogic: logic })
              }
            />
          )}
        </div>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => onDelete(selectedField._id)}
            className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-bold"
          >
            Eliminar Campo
          </button>
        </div>
      </div>
    </div>
  );
}
