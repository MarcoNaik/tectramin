"use client";

import { useState } from "react";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import type { RoutineWithTaskCount, ServiceTaskTemplate, TaskTemplateData } from "@/types";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface RoutineSidebarProps {
  routines: RoutineWithTaskCount[] | undefined;
  unassignedTasks: TaskTemplateData[] | undefined;
  selectedRoutineId: Id<"services"> | "unassigned" | null;
  selectedTaskId: Id<"taskTemplates"> | null;
  routineTasks: ServiceTaskTemplate[] | undefined;
  routineName: string | undefined;
  onSelectRoutine: (id: Id<"services"> | "unassigned") => void;
  onSelectTask: (id: Id<"taskTemplates">) => void;
  onDeselectTask: () => void;
  onBack: () => void;
  onAddTask: (taskTemplateId: Id<"taskTemplates">) => void;
  onRemoveTask: (taskTemplateId: Id<"taskTemplates">) => void;
  onCreateTask: () => void;
  onReorderTasks: (linkIds: Id<"serviceTaskTemplates">[]) => void;
  allTasks: TaskTemplateData[] | undefined;
}

export function RoutineSidebar({
  routines,
  unassignedTasks,
  selectedRoutineId,
  selectedTaskId,
  routineTasks,
  routineName,
  onSelectRoutine,
  onSelectTask,
  onDeselectTask,
  onBack,
  onAddTask,
  onRemoveTask,
  onCreateTask,
  onReorderTasks,
  allTasks,
}: RoutineSidebarProps) {
  const isRoutineSelected = selectedRoutineId !== null;

  if (isRoutineSelected) {
    return (
      <RoutineDetailView
        routineId={selectedRoutineId}
        routineName={routineName}
        routineTasks={routineTasks}
        selectedTaskId={selectedTaskId}
        onBack={onBack}
        onSelectTask={onSelectTask}
        onDeselectTask={onDeselectTask}
        onAddTask={onAddTask}
        onRemoveTask={onRemoveTask}
        onCreateTask={onCreateTask}
        onReorderTasks={onReorderTasks}
        allTasks={allTasks}
      />
    );
  }

  return (
    <RoutineListView
      routines={routines}
      unassignedTasks={unassignedTasks}
      onSelectRoutine={onSelectRoutine}
    />
  );
}

interface RoutineListViewProps {
  routines: RoutineWithTaskCount[] | undefined;
  unassignedTasks: TaskTemplateData[] | undefined;
  onSelectRoutine: (id: Id<"services"> | "unassigned") => void;
}

function RoutineListView({
  routines,
  unassignedTasks,
  onSelectRoutine,
}: RoutineListViewProps) {
  return (
    <div className="w-64 flex-shrink-0 border-r border-gray-200 overflow-hidden flex flex-col bg-white">
      <div className="p-3 bg-gray-50 border-b border-gray-200 font-bold text-gray-900">
        Rutinas ({routines?.length ?? 0})
      </div>
      <div className="overflow-y-auto flex-1">
        {routines?.map((routine) => (
          <div
            key={routine._id}
            onClick={() => onSelectRoutine(routine._id)}
            className="p-3 border-b border-gray-200 cursor-pointer transition-colors hover:bg-gray-50 group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-base text-gray-900">{routine.name}</div>
                <div className="text-xs mt-0.5 text-gray-500">
                  {routine.taskCount} {routine.taskCount === 1 ? "tarea" : "tareas"}
                </div>
              </div>
              <div className="text-gray-300 group-hover:text-gray-400">→</div>
            </div>
          </div>
        ))}

        {routines?.length === 0 && (
          <div className="p-4 text-gray-500 text-sm text-center">
            Sin rutinas aun. Crea una en la Vista de Depuracion.
          </div>
        )}

        {(unassignedTasks?.length ?? 0) > 0 && (
          <>
            <div className="p-3 bg-gray-100 border-y border-gray-200 font-bold text-gray-700 text-sm mt-2">
              Sin Asignar ({unassignedTasks?.length ?? 0})
            </div>
            <div
              onClick={() => onSelectRoutine("unassigned")}
              className="p-3 border-b border-gray-200 cursor-pointer transition-colors hover:bg-gray-50 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-base text-gray-900">Tareas sin asignar</div>
                  <div className="text-xs mt-0.5 text-gray-500">
                    {unassignedTasks?.length} {unassignedTasks?.length === 1 ? "tarea" : "tareas"}
                  </div>
                </div>
                <div className="text-gray-300 group-hover:text-gray-400">→</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface RoutineDetailViewProps {
  routineId: Id<"services"> | "unassigned";
  routineName: string | undefined;
  routineTasks: ServiceTaskTemplate[] | undefined;
  selectedTaskId: Id<"taskTemplates"> | null;
  onBack: () => void;
  onSelectTask: (id: Id<"taskTemplates">) => void;
  onDeselectTask: () => void;
  onAddTask: (taskTemplateId: Id<"taskTemplates">) => void;
  onRemoveTask: (taskTemplateId: Id<"taskTemplates">) => void;
  onCreateTask: () => void;
  onReorderTasks: (linkIds: Id<"serviceTaskTemplates">[]) => void;
  allTasks: TaskTemplateData[] | undefined;
}

function RoutineDetailView({
  routineId,
  routineName,
  routineTasks,
  selectedTaskId,
  onBack,
  onSelectTask,
  onDeselectTask,
  onAddTask,
  onRemoveTask,
  onCreateTask,
  onReorderTasks,
  allTasks,
}: RoutineDetailViewProps) {
  const isUnassigned = routineId === "unassigned";
  const existingTaskIds = routineTasks?.map((t) => t.taskTemplateId) ?? [];
  const availableTasks = allTasks?.filter((t) => !existingTaskIds.includes(t._id)) ?? [];

  const [activeId, setActiveId] = useState<string | null>(null);

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
    setActiveId(event.active.id.toString());
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id || !routineTasks) return;

    const oldIndex = routineTasks.findIndex((t) => t._id === active.id);
    const newIndex = routineTasks.findIndex((t) => t._id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(routineTasks, oldIndex, newIndex);
      onReorderTasks(newOrder.map((t) => t._id));
    }
  };

  const activeTask = routineTasks?.find((t) => t._id === activeId);

  return (
    <div className="w-64 flex-shrink-0 border-r border-gray-200 overflow-hidden flex flex-col bg-white">
      <div className="p-3 bg-gray-50 border-b border-gray-200">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm mb-2"
        >
          <span>←</span>
          <span>Volver</span>
        </button>
      </div>
      <div
        onClick={onDeselectTask}
        className={`p-3 border-b border-gray-200 cursor-pointer transition-colors ${
          selectedTaskId === null
            ? "bg-blue-500 text-white"
            : "hover:bg-gray-50"
        }`}
      >
        <div className={`font-bold text-base ${selectedTaskId === null ? "text-white" : "text-gray-900"}`}>
          {isUnassigned ? "Tareas sin asignar" : routineName ?? "Rutina"}
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {!isUnassigned && routineTasks && routineTasks.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={routineTasks.map((t) => t._id)}
              strategy={verticalListSortingStrategy}
            >
              {routineTasks.map((task) => (
                <SortableTaskItem
                  key={task._id}
                  task={task}
                  isSelected={selectedTaskId === task.taskTemplateId}
                  onSelect={() => onSelectTask(task.taskTemplateId)}
                  onRemove={() => onRemoveTask(task.taskTemplateId)}
                />
              ))}
            </SortableContext>
            <DragOverlay>
              {activeTask && (
                <div className="p-3 bg-white border-2 border-blue-400 rounded shadow-lg">
                  <div className="font-bold text-base text-gray-900">
                    {activeTask.taskTemplateName}
                  </div>
                  <div className="text-xs mt-0.5 text-gray-500">
                    Orden: {activeTask.order + 1}
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          <>
            {routineTasks?.map((task) => (
              <div
                key={task._id}
                onClick={() => onSelectTask(task.taskTemplateId)}
                className={`p-3 border-b border-gray-200 cursor-pointer transition-colors group ${
                  selectedTaskId === task.taskTemplateId
                    ? "bg-blue-500 text-white"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`font-bold text-base ${selectedTaskId === task.taskTemplateId ? "text-white" : "text-gray-900"}`}>
                    {task.taskTemplateName}
                  </div>
                </div>
                <div className={`text-xs mt-0.5 ${selectedTaskId === task.taskTemplateId ? "text-blue-100" : "text-gray-500"}`}>
                  Orden: {task.order + 1}
                </div>
              </div>
            ))}
          </>
        )}

        {routineTasks?.length === 0 && (
          <div className="p-4 text-gray-500 text-sm text-center">
            {isUnassigned
              ? "Todas las tareas estan asignadas a rutinas."
              : "Sin tareas en esta rutina."}
          </div>
        )}
      </div>

      {!isUnassigned && (
        <div className="p-3 border-t border-gray-200 bg-gray-50 space-y-2">
          {availableTasks.length > 0 && (
            <select
              className="w-full p-2 border border-gray-300 rounded text-sm"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  onAddTask(e.target.value as Id<"taskTemplates">);
                }
              }}
            >
              <option value="">+ Agregar tarea existente...</option>
              {availableTasks.map((task) => (
                <option key={task._id} value={task._id}>
                  {task.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={onCreateTask}
            className="w-full p-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
          >
            + Crear nueva tarea
          </button>
        </div>
      )}
    </div>
  );
}

interface SortableTaskItemProps {
  task: ServiceTaskTemplate;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

function SortableTaskItem({ task, isSelected, onSelect, onRemove }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 border-b border-gray-200 cursor-pointer transition-colors group ${
        isSelected ? "bg-blue-500 text-white" : "hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className={`cursor-grab active:cursor-grabbing px-1 ${
            isSelected ? "text-blue-200" : "text-gray-400"
          }`}
        >
          ⋮⋮
        </div>
        <div className="flex-1" onClick={onSelect}>
          <div className={`font-bold text-base ${isSelected ? "text-white" : "text-gray-900"}`}>
            {task.taskTemplateName}
          </div>
          <div className={`text-xs mt-0.5 ${isSelected ? "text-blue-100" : "text-gray-500"}`}>
            Orden: {task.order + 1}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={`opacity-0 group-hover:opacity-100 px-1 rounded text-xs ${
            isSelected
              ? "text-white hover:bg-blue-600"
              : "text-gray-400 hover:text-red-500 hover:bg-gray-100"
          }`}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
