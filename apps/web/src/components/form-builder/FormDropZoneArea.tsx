"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import type { FieldTemplateData } from "@/types";
import { SortableFieldWrapper } from "./SortableFieldWrapper";
import { PreviewField } from "./preview-fields/PreviewField";
import { DroppableZone } from "./DroppableZone";

interface FormDropZoneAreaProps {
  localFields: FieldTemplateData[];
  activeDropZone: string | null;
  editingField: { fieldId: Id<"fieldTemplates">; property: "label" | "placeholder" } | null;
  selectedFieldId: Id<"fieldTemplates"> | null;
  setEditingField: (v: { fieldId: Id<"fieldTemplates">; property: "label" | "placeholder" } | null) => void;
  setSelectedFieldId: (v: Id<"fieldTemplates"> | null) => void;
  handleFieldUpdate: (id: Id<"fieldTemplates">, updates: { label?: string; placeholder?: string }) => void;
}

export function FormDropZoneArea({
  localFields,
  activeDropZone,
  editingField,
  selectedFieldId,
  setEditingField,
  setSelectedFieldId,
  handleFieldUpdate,
}: FormDropZoneAreaProps) {
  return (
    <SortableContext items={localFields.map((f) => f._id)} strategy={verticalListSortingStrategy}>
      <DroppableZone id="drop-zone-0" isOver={activeDropZone === "drop-zone-0"} />
      {localFields.length > 0 ? (
        localFields.map((field, index) => (
          <div key={field._id}>
            <SortableFieldWrapper field={field}>
              <PreviewField
                field={field}
                editingProperty={editingField?.fieldId === field._id ? editingField.property : null}
                onEditLabel={() => setEditingField({ fieldId: field._id, property: "label" })}
                onEditPlaceholder={() => setEditingField({ fieldId: field._id, property: "placeholder" })}
                onSaveEdit={(value) => {
                  if (editingField) {
                    handleFieldUpdate(field._id, { [editingField.property]: value });
                    setEditingField(null);
                  }
                }}
                onCancelEdit={() => setEditingField(null)}
                onSelect={() => setSelectedFieldId(field._id)}
                isSelected={selectedFieldId === field._id}
              />
            </SortableFieldWrapper>
            <DroppableZone
              id={`drop-zone-${index + 1}`}
              isOver={activeDropZone === `drop-zone-${index + 1}`}
            />
          </div>
        ))
      ) : (
        <div className="text-gray-400 text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          Drag fields here to get started
        </div>
      )}
    </SortableContext>
  );
}
