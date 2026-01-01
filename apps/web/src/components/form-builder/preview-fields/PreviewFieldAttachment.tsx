"use client";

import { Camera, Image, FileText } from "lucide-react";
import { InlineTextEditor } from "@/components/ui/InlineTextEditor";
import type { FieldTemplateData } from "@/types";

type AttachmentSource = "camera" | "gallery" | "document";

interface AttachmentConfig {
  sources?: AttachmentSource[];
}

const DEFAULT_SOURCES: AttachmentSource[] = ["camera", "gallery", "document"];

function parseAttachmentConfig(displayStyle: string | undefined): AttachmentConfig {
  if (!displayStyle) return {};
  try {
    const parsed = JSON.parse(displayStyle);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as AttachmentConfig;
    }
    return {};
  } catch {
    return {};
  }
}

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
  const config = parseAttachmentConfig(field.displayStyle);
  const sources = config.sources || DEFAULT_SOURCES;

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
      <div className="flex gap-1.5">
        {sources.includes("camera") && (
          <div className="flex-1 bg-gray-50 py-2 rounded-md flex items-center justify-center border border-gray-200">
            <Camera size={16} className="text-gray-500" />
          </div>
        )}
        {sources.includes("gallery") && (
          <div className="flex-1 bg-gray-50 py-2 rounded-md flex items-center justify-center border border-gray-200">
            <Image size={16} className="text-gray-500" />
          </div>
        )}
        {sources.includes("document") && (
          <div className="flex-1 bg-gray-50 py-2 rounded-md flex items-center justify-center border border-gray-200">
            <FileText size={16} className="text-gray-500" />
          </div>
        )}
      </div>
    </div>
  );
}
