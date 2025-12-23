"use client";

import { InlineTextEditor } from "@/components/ui/InlineTextEditor";
import type { FieldTemplateData } from "@/types";

interface PreviewFieldAttachmentProps {
  field: FieldTemplateData;
  editingProperty: "label" | "placeholder" | null;
  onEditLabel: () => void;
  onSaveEdit: (value: string) => void;
  onCancelEdit: () => void;
  onSelect: () => void;
  isSelected: boolean;
}

export function PreviewFieldAttachment({
  field,
  editingProperty,
  onEditLabel,
  onSaveEdit,
  onCancelEdit,
  onSelect,
  isSelected,
}: PreviewFieldAttachmentProps) {
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
        </label>
      )}
      {field.subheader && (
        <div className="text-xs text-gray-500 mb-1.5">{field.subheader}</div>
      )}
      <div className="flex gap-2">
        <div className="flex-1 bg-gray-100 py-3 rounded-lg text-center border border-gray-200">
          <span className="text-xl">📷</span>
          <div className="text-xs text-gray-600 mt-1">Camera</div>
        </div>
        <div className="flex-1 bg-gray-100 py-3 rounded-lg text-center border border-gray-200">
          <span className="text-xl">🖼️</span>
          <div className="text-xs text-gray-600 mt-1">Gallery</div>
        </div>
        <div className="flex-1 bg-gray-100 py-3 rounded-lg text-center border border-gray-200">
          <span className="text-xl">📄</span>
          <div className="text-xs text-gray-600 mt-1">Document</div>
        </div>
      </div>
    </div>
  );
}
