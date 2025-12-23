"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import type { FieldTemplateData } from "@/types";
import { FIELD_TYPES } from "@/types";
import { TemplateList } from "./TemplateList";
import { MobilePhoneFrame } from "./MobilePhoneFrame";
import { FormDropZoneArea } from "./FormDropZoneArea";
import { FieldEditor } from "./FieldEditor";
import { DraggableFieldTypeBadge } from "./DraggableFieldTypeBadge";

export function FormBuilder() {
  const templates = useQuery(api.admin.taskTemplates.list);
  const [selectedTemplateId, setSelectedTemplateId] = useState<Id<"taskTemplates"> | null>(null);
  const [editingField, setEditingField] = useState<{
    fieldId: Id<"fieldTemplates">;
    property: "label" | "placeholder";
  } | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<Id<"fieldTemplates"> | null>(null);
  const [localFields, setLocalFields] = useState<FieldTemplateData[]>([]);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);

  const templateWithFields = useQuery(
    api.admin.taskTemplates.getWithFields,
    selectedTemplateId ? { id: selectedTemplateId } : "skip"
  );

  const updateField = useMutation(api.admin.fieldTemplates.update);
  const removeField = useMutation(api.admin.fieldTemplates.remove);
  const reorderFields = useMutation(api.admin.fieldTemplates.reorder);
  const createField = useMutation(api.admin.fieldTemplates.create);

  useEffect(() => {
    if (templateWithFields?.fields) {
      setLocalFields(templateWithFields.fields);
    }
  }, [templateWithFields?.fields]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id?.toString();
    if (overId?.startsWith("drop-zone-")) {
      setActiveDropZone(overId);
    } else {
      setActiveDropZone(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDropZone(null);

    if (!over || !selectedTemplateId) return;

    const activeData = active.data.current;
    const overId = over.id.toString();

    if (activeData?.type === "new-field" && overId.startsWith("drop-zone-")) {
      const insertIndex = parseInt(overId.replace("drop-zone-", ""));
      const fieldType = activeData.fieldType as string;

      await createField({
        taskTemplateId: selectedTemplateId,
        label: `New ${fieldType} field`,
        fieldType,
        isRequired: false,
        order: insertIndex,
      });
      return;
    }

    if (active.id === over.id) return;

    const oldIndex = localFields.findIndex((f) => f._id === active.id);
    const newIndex = localFields.findIndex((f) => f._id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(localFields, oldIndex, newIndex);
    setLocalFields(newOrder);

    await reorderFields({
      taskTemplateId: selectedTemplateId,
      fieldIds: newOrder.map((f) => f._id),
    });
  };

  const handleFieldUpdate = async (
    fieldId: Id<"fieldTemplates">,
    updates: { label?: string; fieldType?: string; placeholder?: string; isRequired?: boolean; subheader?: string; displayStyle?: string }
  ) => {
    setLocalFields((prev) =>
      prev.map((f) => (f._id === fieldId ? { ...f, ...updates } : f))
    );
    await updateField({ id: fieldId, ...updates });
  };

  const handleDeleteField = async (fieldId: Id<"fieldTemplates">) => {
    setLocalFields((prev) => prev.filter((f) => f._id !== fieldId));
    setSelectedFieldId(null);
    await removeField({ id: fieldId });
  };

  const handleSelectTemplate = (id: Id<"taskTemplates">) => {
    setSelectedTemplateId(id);
    setSelectedFieldId(null);
    setEditingField(null);
  };

  const selectedField = localFields.find((f) => f._id === selectedFieldId);
  const selectedTemplate = templates?.find((t) => t._id === selectedTemplateId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full">
        <TemplateList
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={handleSelectTemplate}
        />

        <div className="flex-1 flex flex-col items-center py-4 overflow-auto">
          {selectedTemplateId && selectedTemplate ? (
            <>
              <div className="text-center mb-4">
                <h3 className="font-bold text-gray-900 text-lg">{selectedTemplate.name}</h3>
                <p className="text-sm text-gray-500">Drag fields into the phone, click to edit</p>
              </div>

              <div className="flex flex-wrap gap-2 mb-6 justify-center">
                {FIELD_TYPES.map((type) => (
                  <DraggableFieldTypeBadge key={type.value} type={type} />
                ))}
              </div>

              <MobilePhoneFrame>
                <div className="text-lg font-bold text-gray-900 mb-6">{selectedTemplate.name}</div>
                <FormDropZoneArea
                  localFields={localFields}
                  activeDropZone={activeDropZone}
                  editingField={editingField}
                  selectedFieldId={selectedFieldId}
                  setEditingField={setEditingField}
                  setSelectedFieldId={setSelectedFieldId}
                  handleFieldUpdate={handleFieldUpdate}
                />
                <div className="mt-6">
                  <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold opacity-50 cursor-not-allowed">
                    Mark Complete
                  </button>
                </div>
              </MobilePhoneFrame>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="mb-4 text-gray-300"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <p className="text-lg font-medium">Select a template to start editing</p>
              <p className="text-sm mt-1">Choose from the list on the left</p>
            </div>
          )}
        </div>

        <FieldEditor
          selectedField={selectedField}
          selectedTemplateId={selectedTemplateId}
          onClose={() => setSelectedFieldId(null)}
          onUpdate={handleFieldUpdate}
          onDelete={handleDeleteField}
        />
      </div>
    </DndContext>
  );
}
