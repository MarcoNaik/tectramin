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

import type { FieldTemplateData, FieldConditionData, TaskTemplateData, ServiceTaskTemplate } from "@/types";
import { FIELD_TYPES } from "@/types";
import { RoutineSidebar } from "./RoutineSidebar";
import { MobilePhoneFrame } from "./MobilePhoneFrame";
import { MobileRoutinePreview } from "./MobileRoutinePreview";
import { FormDropZoneArea } from "./FormDropZoneArea";
import { FieldEditor } from "./FieldEditor";
import { TaskEditor, TaskEditorPlaceholder } from "./TaskEditor";
import { DraggableFieldTypeBadge } from "./DraggableFieldTypeBadge";
import { NewFieldPlaceholder } from "./NewFieldPlaceholder";
import { CreateTaskModal } from "./CreateTaskModal";

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

  const [selectedRoutineId, setSelectedRoutineId] = useState<Id<"services"> | "unassigned" | null>(null);
  const [selectedRoutineTaskId, setSelectedRoutineTaskId] = useState<Id<"serviceTaskTemplates"> | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const routinesWithCount = useQuery(api.admin.services.listWithTaskCount);
  const unassignedTasks = useQuery(api.admin.taskTemplates.listUnassigned);

  const routineWithTasks = useQuery(
    api.admin.services.getWithTaskTemplates,
    selectedRoutineId && selectedRoutineId !== "unassigned"
      ? { id: selectedRoutineId }
      : "skip"
  );

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

  const createTask = useMutation(api.admin.taskTemplates.create);
  const updateTask = useMutation(api.admin.taskTemplates.update);
  const addTaskToRoutine = useMutation(api.admin.services.addTaskTemplate);
  const removeTaskFromRoutine = useMutation(api.admin.services.removeTaskTemplate);
  const reorderRoutineTasks = useMutation(api.admin.services.reorderTaskTemplates);
  const addDependency = useMutation(api.admin.serviceTaskDependencies.create);
  const removeDependency = useMutation(api.admin.serviceTaskDependencies.remove);

  const serviceDependencies = useQuery(
    api.admin.serviceTaskDependencies.listByService,
    selectedRoutineId && selectedRoutineId !== "unassigned"
      ? { serviceId: selectedRoutineId }
      : "skip"
  );

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

  const handleSelectRoutine = (id: Id<"services"> | "unassigned") => {
    setSelectedRoutineId(id);
    setSelectedTemplateId(null);
    setSelectedFieldId(null);
    setSelectedRoutineTaskId(null);
    setEditingField(null);
  };

  const handleBackToRoutines = () => {
    setSelectedRoutineId(null);
    setSelectedTemplateId(null);
    setSelectedFieldId(null);
    setSelectedRoutineTaskId(null);
    setEditingField(null);
  };

  const handleSelectTaskInRoutine = (linkId: string) => {
    setSelectedRoutineTaskId(linkId as Id<"serviceTaskTemplates">);
  };

  const handleUpdateTaskName = async (name: string) => {
    const selectedTask = routineTasks?.find((t) => t._id === selectedRoutineTaskId);
    if (selectedTask) {
      await updateTask({ id: selectedTask.taskTemplateId, name });
    }
  };

  const handleUpdateTaskRepeatable = async (isRepeatable: boolean) => {
    const selectedTask = routineTasks?.find((t) => t._id === selectedRoutineTaskId);
    if (selectedTask) {
      await updateTask({ id: selectedTask.taskTemplateId, isRepeatable });
    }
  };

  const handleUpdateTaskDescription = async (description: string) => {
    const selectedTask = routineTasks?.find((t) => t._id === selectedRoutineTaskId);
    if (selectedTask) {
      await updateTask({ id: selectedTask.taskTemplateId, description });
    }
  };

  const handleUpdateTaskNameFromFieldView = async (name: string) => {
    if (selectedTemplateId) {
      await updateTask({ id: selectedTemplateId, name });
    }
  };

  const handleUpdateTaskDescriptionFromFieldView = async (description: string) => {
    if (selectedTemplateId) {
      await updateTask({ id: selectedTemplateId, description });
    }
  };

  const handleRemoveSelectedTaskFromRoutine = async () => {
    const selectedTask = routineTasks?.find((t) => t._id === selectedRoutineTaskId);
    if (selectedTask && selectedRoutineId && selectedRoutineId !== "unassigned") {
      await removeTaskFromRoutine({
        serviceId: selectedRoutineId,
        taskTemplateId: selectedTask.taskTemplateId,
      });
      setSelectedRoutineTaskId(null);
    }
  };

  const handleEditTaskFields = () => {
    const selectedTask = routineTasks?.find((t) => t._id === selectedRoutineTaskId);
    if (selectedTask) {
      setSelectedTemplateId(selectedTask.taskTemplateId);
      setSelectedRoutineTaskId(null);
    }
  };

  const handleEditTaskFromPreview = (linkId: string) => {
    const task = routineTasks?.find((t) => t._id === linkId);
    if (task) {
      setSelectedTemplateId(task.taskTemplateId);
      setSelectedRoutineTaskId(null);
    }
  };

  const handleToggleDependency = async (
    prereqId: Id<"serviceTaskTemplates">,
    isAdding: boolean
  ) => {
    if (!selectedRoutineTaskId) return;

    if (isAdding) {
      await addDependency({
        serviceTaskTemplateId: selectedRoutineTaskId,
        dependsOnServiceTaskTemplateId: prereqId,
      });
    } else {
      const dep = serviceDependencies?.find(
        (d) =>
          d.serviceTaskTemplateId === selectedRoutineTaskId &&
          d.dependsOnServiceTaskTemplateId === prereqId
      );
      if (dep) {
        await removeDependency({ id: dep._id });
      }
    }
  };

  const handleSelectTaskFromRoutine = (taskId: Id<"taskTemplates">) => {
    setSelectedTemplateId(taskId);
    setSelectedFieldId(null);
    setEditingField(null);
  };

  const handleAddTaskToRoutine = async (taskTemplateId: Id<"taskTemplates">) => {
    if (selectedRoutineId && selectedRoutineId !== "unassigned") {
      const nextOrder = routineWithTasks?.taskTemplates.length ?? 0;
      await addTaskToRoutine({
        serviceId: selectedRoutineId,
        taskTemplateId,
        order: nextOrder,
        isRequired: false,
      });
    }
  };

  const handleRemoveTaskFromRoutine = async (taskTemplateId: Id<"taskTemplates">) => {
    if (selectedRoutineId && selectedRoutineId !== "unassigned") {
      await removeTaskFromRoutine({
        serviceId: selectedRoutineId,
        taskTemplateId,
      });
      if (selectedTemplateId === taskTemplateId) {
        setSelectedTemplateId(null);
        setSelectedFieldId(null);
      }
    }
  };

  const handleReorderRoutineTasks = async (linkIds: Id<"serviceTaskTemplates">[]) => {
    if (selectedRoutineId && selectedRoutineId !== "unassigned") {
      await reorderRoutineTasks({
        serviceId: selectedRoutineId,
        linkIds,
      });
    }
  };

  const handleCreateTaskForRoutine = async (name: string) => {
    const taskId = await createTask({ name });
    if (selectedRoutineId && selectedRoutineId !== "unassigned") {
      const nextOrder = routineWithTasks?.taskTemplates.length ?? 0;
      await addTaskToRoutine({
        serviceId: selectedRoutineId,
        taskTemplateId: taskId,
        order: nextOrder,
        isRequired: false,
      });
    }
    setSelectedTemplateId(taskId);
  };

  const selectedField = localFields.find((f) => f._id === selectedFieldId);
  const selectedTemplate = templates?.find((t) => t._id === selectedTemplateId);

  const routineTasks: ServiceTaskTemplate[] | undefined =
    selectedRoutineId === "unassigned"
      ? unassignedTasks?.map((t, i) => ({
          _id: `unassigned-${t._id}` as Id<"serviceTaskTemplates">,
          taskTemplateId: t._id,
          taskTemplateName: t.name,
          order: i,
          isRequired: false,
          isRepeatable: t.isRepeatable,
          dependsOn: [],
          fieldCount: 0,
          fields: [],
        }))
      : routineWithTasks?.taskTemplates;

  const routineName =
    selectedRoutineId === "unassigned"
      ? "Tareas sin asignar"
      : routineWithTasks?.service.name;

  const routineTasksForPreview = routineTasks?.map((t) => ({
    id: t._id,
    name: t.taskTemplateName,
    fieldCount: t.fieldCount,
    fields: t.fields,
  })) ?? [];

  const handleReorderTasksFromPreview = async (taskIds: string[]) => {
    if (selectedRoutineId && selectedRoutineId !== "unassigned") {
      await reorderRoutineTasks({
        serviceId: selectedRoutineId,
        linkIds: taskIds as Id<"serviceTaskTemplates">[],
      });
    }
  };

  const fieldsWithPlaceholder = activeDropZone !== null && activeFieldType
    ? [
        ...localFields.slice(0, activeDropZone),
        { _id: "placeholder" as Id<"fieldTemplates">, fieldType: activeFieldType, label: "", isPlaceholder: true } as FieldTemplateData & { isPlaceholder: boolean },
        ...localFields.slice(activeDropZone),
      ]
    : localFields;

  const renderCenterPanel = () => {
    if (selectedTemplateId && selectedTemplate) {
      return (
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
            <div
              onClick={() => setSelectedTemplateId(null)}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-4 cursor-pointer"
            >
              <span>←</span>
              <span>Volver a rutina</span>
            </div>
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
      );
    }

    if (selectedRoutineId && routineName) {
      return (
        <MobileRoutinePreview
          routineName={routineName}
          tasks={routineTasksForPreview}
          selectedTaskId={selectedRoutineTaskId}
          onReorderTasks={selectedRoutineId !== "unassigned" ? handleReorderTasksFromPreview : undefined}
          onSelectTask={handleSelectTaskInRoutine}
          onEditTask={handleEditTaskFromPreview}
        />
      );
    }

    return (
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
        <p className="text-lg font-medium">Selecciona una rutina para comenzar</p>
        <p className="text-sm mt-1">Elige de la lista a la izquierda</p>
      </div>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full">
        <RoutineSidebar
          routines={routinesWithCount}
          unassignedTasks={unassignedTasks as TaskTemplateData[] | undefined}
          selectedRoutineId={selectedRoutineId}
          selectedTaskId={selectedTemplateId}
          routineTasks={routineTasks}
          routineName={routineName}
          onSelectRoutine={handleSelectRoutine}
          onSelectTask={handleSelectTaskFromRoutine}
          onDeselectTask={() => {
            setSelectedTemplateId(null);
            setSelectedFieldId(null);
            setSelectedRoutineTaskId(null);
          }}
          onBack={handleBackToRoutines}
          onAddTask={handleAddTaskToRoutine}
          onRemoveTask={handleRemoveTaskFromRoutine}
          onCreateTask={() => setIsCreateModalOpen(true)}
          onReorderTasks={handleReorderRoutineTasks}
          allTasks={templates as TaskTemplateData[] | undefined}
        />

        <div className="flex-1 flex flex-col items-center py-4 overflow-auto">
          {renderCenterPanel()}
        </div>

        {selectedTemplateId ? (
          <FieldEditor
            selectedField={selectedField}
            selectedTemplateId={selectedTemplateId}
            allFields={localFields}
            conditions={conditions}
            taskName={selectedTemplate?.name}
            taskDescription={selectedTemplate?.description}
            onClose={() => setSelectedFieldId(null)}
            onUpdate={handleFieldUpdate}
            onDelete={handleDeleteField}
            onUpdateTaskName={handleUpdateTaskNameFromFieldView}
            onUpdateTaskDescription={handleUpdateTaskDescriptionFromFieldView}
          />
        ) : selectedRoutineId && selectedRoutineId !== "unassigned" ? (
          selectedRoutineTaskId ? (
            (() => {
              const selectedTask = routineTasks?.find((t) => t._id === selectedRoutineTaskId);
              const taskIndex = routineTasks?.findIndex((t) => t._id === selectedRoutineTaskId) ?? -1;
              if (!selectedTask) return <TaskEditorPlaceholder />;
              const currentDeps = serviceDependencies
                ?.filter((d) => d.serviceTaskTemplateId === selectedRoutineTaskId)
                .map((d) => d.dependsOnServiceTaskTemplateId) ?? [];
              return (
                <TaskEditor
                  taskTemplateId={selectedTask.taskTemplateId}
                  serviceTaskTemplateId={selectedRoutineTaskId}
                  taskName={selectedTask.taskTemplateName}
                  taskDescription={selectedTask.taskTemplateDescription}
                  orderNumber={taskIndex + 1}
                  isRepeatable={selectedTask.isRepeatable}
                  allTasksInRoutine={routineTasks ?? []}
                  currentDependencies={currentDeps}
                  onClose={() => setSelectedRoutineTaskId(null)}
                  onUpdateName={handleUpdateTaskName}
                  onUpdateDescription={handleUpdateTaskDescription}
                  onUpdateRepeatable={handleUpdateTaskRepeatable}
                  onRemoveFromRoutine={handleRemoveSelectedTaskFromRoutine}
                  onEditFields={handleEditTaskFields}
                  onToggleDependency={handleToggleDependency}
                />
              );
            })()
          ) : (
            <TaskEditorPlaceholder />
          )
        ) : null}
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

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateTask={handleCreateTaskForRoutine}
        routineName={routineName}
      />
    </DndContext>
  );
}
