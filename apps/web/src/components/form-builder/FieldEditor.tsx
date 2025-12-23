"use client";

import type { Id } from "@packages/backend/convex/_generated/dataModel";
import type { FieldTemplateData } from "@/types";
import { DebouncedInput } from "@/components/ui/DebouncedInput";

interface FieldEditorProps {
  selectedField: FieldTemplateData | undefined;
  selectedTemplateId: Id<"taskTemplates"> | null;
  onClose: () => void;
  onUpdate: (fieldId: Id<"fieldTemplates">, updates: {
    label?: string;
    fieldType?: string;
    placeholder?: string;
    isRequired?: boolean;
    subheader?: string;
    displayStyle?: string;
  }) => void;
  onDelete: (fieldId: Id<"fieldTemplates">) => void;
}

export function FieldEditor({
  selectedField,
  selectedTemplateId,
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
            Select a field to edit its properties
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 flex-shrink-0">
      <div className="border-l border-gray-200 bg-white h-full flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">Edit Field</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            &times;
          </button>
        </div>
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Label</label>
            <DebouncedInput
              value={selectedField.label}
              onChange={(value) => onUpdate(selectedField._id, { label: value })}
              className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Field Type</label>
            <select
              value={selectedField.fieldType}
              onChange={(e) => onUpdate(selectedField._id, { fieldType: e.target.value })}
              className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="boolean">Yes/No Toggle</option>
              <option value="date">Date</option>
              <option value="attachment">Attachment</option>
              <option value="displayText">Display Text</option>
            </select>
          </div>
          {selectedField.fieldType === "displayText" && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Display Style</label>
              <select
                value={selectedField.displayStyle || "simple"}
                onChange={(e) => onUpdate(selectedField._id, { displayStyle: e.target.value })}
                className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="header">Header (Large, Bold)</option>
                <option value="simple">Simple (Normal Text)</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Subheader</label>
            <DebouncedInput
              value={selectedField.subheader || ""}
              onChange={(value) => onUpdate(selectedField._id, { subheader: value })}
              className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional helper text..."
            />
          </div>
          {(selectedField.fieldType === "text" || selectedField.fieldType === "number") && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Placeholder</label>
              <DebouncedInput
                value={selectedField.placeholder || ""}
                onChange={(value) => onUpdate(selectedField._id, { placeholder: value })}
                className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter placeholder text..."
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
              Required field
            </label>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => onDelete(selectedField._id)}
            className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-bold"
          >
            Delete Field
          </button>
        </div>
      </div>
    </div>
  );
}
