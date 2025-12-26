"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import type { FieldTemplateData, FieldConditionData } from "@/types";
import { SortableFieldWrapper } from "./SortableFieldWrapper";
import { PreviewField } from "./preview-fields/PreviewField";
import { DroppableZone } from "./DroppableZone";
import { NewFieldPlaceholder } from "./NewFieldPlaceholder";

interface FormDropZoneAreaProps {
  localFields: (FieldTemplateData & { isPlaceholder?: boolean })[];
  editingField: { fieldId: Id<"fieldTemplates">; property: "label" | "placeholder" } | null;
  selectedFieldId: Id<"fieldTemplates"> | null;
  allConditions: FieldConditionData[];
  setEditingField: (v: { fieldId: Id<"fieldTemplates">; property: "label" | "placeholder" } | null) => void;
  setSelectedFieldId: (v: Id<"fieldTemplates"> | null) => void;
  handleFieldUpdate: (id: Id<"fieldTemplates">, updates: { label?: string; placeholder?: string }) => void;
}

export function FormDropZoneArea({
  localFields,
  editingField,
  selectedFieldId,
  allConditions,
  setEditingField,
  setSelectedFieldId,
  handleFieldUpdate,
}: FormDropZoneAreaProps) {
  const conditionDepthMap = new Map<string, number>();

  const getConditionDepth = (fieldId: string, visited = new Set<string>()): number => {
    if (visited.has(fieldId)) return 0;
    visited.add(fieldId);

    const fieldConditions = allConditions.filter((c) => c.childFieldId === fieldId);
    if (fieldConditions.length === 0) return 0;

    let maxParentDepth = 0;
    for (const condition of fieldConditions) {
      const parentDepth = getConditionDepth(condition.parentFieldId, visited);
      maxParentDepth = Math.max(maxParentDepth, parentDepth);
    }
    return maxParentDepth + 1;
  };

  for (const field of localFields) {
    conditionDepthMap.set(field._id, getConditionDepth(field._id));
  }

  const realFields = localFields.filter((f) => !f.isPlaceholder);

  return (
    <SortableContext items={localFields.map((f) => f._id)} strategy={verticalListSortingStrategy}>
      <DroppableZone id="drop-zone-0" />
      {localFields.length > 0 ? (
        localFields.map((field, index) => {
          if (field.isPlaceholder) {
            return (
              <div key="placeholder">
                <NewFieldPlaceholder fieldType={field.fieldType} />
                <DroppableZone id={`drop-zone-${index + 1}`} />
              </div>
            );
          }

          const isSelected = selectedFieldId === field._id;
          const conditionDepth = conditionDepthMap.get(field._id) ?? 0;

          return (
            <div key={field._id}>
              <SortableFieldWrapper
                field={field}
                isSelected={isSelected}
                conditionDepth={conditionDepth}
                onSelect={() => setSelectedFieldId(field._id)}
              >
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
                  isSelected={isSelected}
                />
              </SortableFieldWrapper>
              <DroppableZone id={`drop-zone-${index + 1}`} />
            </div>
          );
        })
      ) : (
        <div className="text-gray-400 text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          Drag fields here to get started
        </div>
      )}
    </SortableContext>
  );
}
