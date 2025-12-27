"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragMoveEvent,
  CollisionDetection,
  rectIntersection,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import type { FieldTemplateData, FieldConditionData } from "@/types";
import { FIELD_TYPES } from "@/types";
import { TemplateList } from "./TemplateList";
import { MobilePhoneFrame } from "./MobilePhoneFrame";
import { FormDropZoneArea } from "./FormDropZoneArea";
import { FieldEditor } from "./FieldEditor";
import { DraggableFieldTypeBadge } from "./DraggableFieldTypeBadge";
import { NewFieldPlaceholder } from "./NewFieldPlaceholder";

export function FormBuilder() {
  const templates = useQuery(api.admin.taskTemplates.list);
  const [selectedTemplateId, setSelectedTemplateId] = useState<Id<"taskTemplates"> | null>(null);
  const [editingField, setEditingField] = useState<{
    fieldId: Id<"fieldTemplates">;
    property: "label" | "placeholder";
  } | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<Id<"fieldTemplates"> | null>(null);
  const [localFields, setLocalFields] = useState<FieldTemplateData[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeFieldType, setActiveFieldType] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<number | null>(null);

  const templateWithFields = useQuery(
    api.admin.taskTemplates.getWithFields,
    selectedTemplateId ? { id: selectedTemplateId } : "skip"
  );

  const selectedFieldConditions = useQuery(
    api.admin.fieldConditions.listByChildField,
    selectedFieldId ? { childFieldId: selectedFieldId } : "skip"
  );

  const allTemplateConditions = useQuery(
    api.admin.fieldConditions.listByTaskTemplate,
    selectedTemplateId ? { taskTemplateId: selectedTemplateId } : "skip"
  );

  const conditions: FieldConditionData[] = selectedFieldConditions ?? [];
  const allConditions: FieldConditionData[] = allTemplateConditions ?? [];

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

  const handleDragStart = (event: DragStartEvent) => {
    const activeData = event.active.data.current;
    setActiveId(event.active.id.toString());
    if (activeData?.type === "new-field") {
      setActiveFieldType(activeData.fieldType as string);
    } else {
      setActiveFieldType(null);
    }
  };

  const activeDropZoneRef = useRef<string | null>(null);

  const lastPointerPositionRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      lastPointerPositionRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { active } = event;
    if (!active) return;

    const activeData = active.data.current;
    const isNewField = activeData?.type === "new-field";

    const pointerPos = lastPointerPositionRef.current;
    if (!pointerPos) return;

    const dropZones: { id: string; index: number; top: number; bottom: number; left: number; right: number }[] = [];
    for (let i = 0; i <= localFields.length; i++) {
      const el = document.getElementById(`drop-zone-${i}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        dropZones.push({
          id: `drop-zone-${i}`,
          index: i,
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
        });
      }
    }

    if (dropZones.length === 0) {
      if (isNewField) setActiveDropZone(null);
      return;
    }

    const currentX = pointerPos.x;
    const currentY = pointerPos.y;

    const phoneLeft = Math.min(...dropZones.map((z) => z.left)) - 20;
    const phoneRight = Math.max(...dropZones.map((z) => z.right)) + 20;
    const phoneTop = Math.min(...dropZones.map((z) => z.top)) - 50;
    const phoneBottom = Math.max(...dropZones.map((z) => z.bottom)) + 50;

    const isOverPhone = currentX >= phoneLeft && currentX <= phoneRight && currentY >= phoneTop && currentY <= phoneBottom;

    if (!isOverPhone) {
      activeDropZoneRef.current = null;
      if (isNewField) setActiveDropZone(null);
      return;
    }

    let closestZone = dropZones[0];
    let minDistance = Infinity;

    for (const zone of dropZones) {
      const zoneCenter = (zone.top + zone.bottom) / 2;
      const distance = Math.abs(currentY - zoneCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestZone = zone;
      }
    }

    activeDropZoneRef.current = closestZone.id;

    if (isNewField) {
      setActiveDropZone(closestZone.index);
    }
  }, [localFields.length]);

  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    const isNewField = args.active.data.current?.type === "new-field";

    if (isNewField) {
      if (activeDropZoneRef.current) {
        const dropZoneContainer = args.droppableContainers.find(
          (container) => container.id === activeDropZoneRef.current
        );
        if (dropZoneContainer) {
          return [{ id: dropZoneContainer.id, data: { droppableContainer: dropZoneContainer } }];
        }
      }
      return [];
    }

    const rectCollisions = rectIntersection(args);
    const fieldCollisions = rectCollisions.filter((c) =>
      !c.id.toString().startsWith("drop-zone-")
    );
    if (fieldCollisions.length > 0) {
      return fieldCollisions;
    }
    return rectCollisions;
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    activeDropZoneRef.current = null;
    setActiveId(null);
    setActiveFieldType(null);
    setActiveDropZone(null);

    if (!over || !selectedTemplateId) return;

    const activeData = active.data.current;
    const overId = over.id.toString();

    if (activeData?.type === "new-field" && overId.startsWith("drop-zone-")) {
      const insertIndex = parseInt(overId.replace("drop-zone-", ""));
      const fieldType = activeData.fieldType as string;

      await createField({
        taskTemplateId: selectedTemplateId,
        label: `Nuevo campo ${fieldType}`,
        fieldType,
        isRequired: false,
        order: insertIndex,
      });
      return;
    }

    if (active.id === over.id) return;

    const oldIndex = localFields.findIndex((f) => f._id === active.id);
    if (oldIndex === -1) return;

    let newIndex: number;
    if (overId.startsWith("drop-zone-")) {
      const dropIndex = parseInt(overId.replace("drop-zone-", ""));
      newIndex = dropIndex > oldIndex ? dropIndex - 1 : dropIndex;
    } else {
      newIndex = localFields.findIndex((f) => f._id === over.id);
      if (newIndex === -1) return;
    }

    const movingFieldId = active.id.toString();
    const fieldConditions = allConditions.filter((c) => c.childFieldId === movingFieldId);

    if (fieldConditions.length > 0 && newIndex < oldIndex) {
      for (const condition of fieldConditions) {
        const parentIndex = localFields.findIndex((f) => f._id === condition.parentFieldId);
        if (parentIndex !== -1 && newIndex <= parentIndex) {
          return;
        }
      }
    }

    const newOrder = arrayMove(localFields, oldIndex, newIndex);
    setLocalFields(newOrder);

    await reorderFields({
      taskTemplateId: selectedTemplateId,
      fieldIds: newOrder.map((f) => f._id),
    });
  };

  const handleFieldUpdate = async (
    fieldId: Id<"fieldTemplates">,
    updates: {
      label?: string;
      fieldType?: string;
      placeholder?: string;
      isRequired?: boolean;
      subheader?: string;
      displayStyle?: string;
      conditionLogic?: "AND" | "OR" | null;
    }
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

  const fieldsWithPlaceholder = activeDropZone !== null && activeFieldType
    ? [
        ...localFields.slice(0, activeDropZone),
        { _id: "placeholder" as Id<"fieldTemplates">, fieldType: activeFieldType, label: "", isPlaceholder: true } as FieldTemplateData & { isPlaceholder: boolean },
        ...localFields.slice(activeDropZone),
      ]
    : localFields;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
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
                <p className="text-sm text-gray-500">Arrastra campos al telefono, haz clic para editar</p>
              </div>

              <div className="flex flex-wrap gap-2 mb-6 justify-center">
                {FIELD_TYPES.map((type) => (
                  <DraggableFieldTypeBadge key={type.value} type={type} />
                ))}
              </div>

              <MobilePhoneFrame>
                <div className="text-lg font-bold text-gray-900 mb-6">{selectedTemplate.name}</div>
                <FormDropZoneArea
                  localFields={fieldsWithPlaceholder}
                  editingField={editingField}
                  selectedFieldId={selectedFieldId}
                  allConditions={allConditions}
                  setEditingField={setEditingField}
                  setSelectedFieldId={setSelectedFieldId}
                  handleFieldUpdate={handleFieldUpdate}
                />
                <div className="mt-6">
                  <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold opacity-50 cursor-not-allowed">
                    Marcar Completo
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
              <p className="text-lg font-medium">Selecciona una plantilla para comenzar a editar</p>
              <p className="text-sm mt-1">Elige de la lista a la izquierda</p>
            </div>
          )}
        </div>

        <FieldEditor
          selectedField={selectedField}
          selectedTemplateId={selectedTemplateId}
          allFields={localFields}
          conditions={conditions}
          onClose={() => setSelectedFieldId(null)}
          onUpdate={handleFieldUpdate}
          onDelete={handleDeleteField}
        />
      </div>
      <DragOverlay>
        {activeId && (
          <div className="pointer-events-none w-64">
            {activeFieldType ? (
              <div className="bg-white rounded-lg shadow-xl">
                <NewFieldPlaceholder fieldType={activeFieldType} isOverlay />
              </div>
            ) : (
              <div className="px-4 py-3 bg-white border-2 border-blue-400 rounded-lg shadow-lg">
                {localFields.find((f) => f._id === activeId)?.label || "Field"}
              </div>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
