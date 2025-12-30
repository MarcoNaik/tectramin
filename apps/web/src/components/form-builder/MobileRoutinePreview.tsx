"use client";

import { useState } from "react";
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
import { MobilePhoneFrame } from "./MobilePhoneFrame";

interface TaskPreview {
  id: string;
  name: string;
  fieldCount: number;
  fields: Array<{ label: string; fieldType: string }>;
}

const FIELD_TYPE_ICONS: Record<string, string> = {
  text: "Aa",
  number: "#",
  boolean: "✓",
  date: "📅",
  attachment: "📎",
  displayText: "T",
  select: "▼",
  userSelect: "👤",
  entitySelect: "🔗",
};

interface MobileRoutinePreviewProps {
  routineName: string;
  tasks: TaskPreview[];
  selectedTaskId?: string | null;
  onReorderTasks?: (taskIds: string[]) => void;
  onSelectTask?: (taskId: string) => void;
  onEditTask?: (taskId: string) => void;
}

function formatCurrentDate() {
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString("es-ES", { weekday: "long" }).toUpperCase();
  const fullDate = now.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  return { dayOfWeek, fullDate };
}

interface SortableTaskCardProps {
  task: TaskPreview;
  isSelected: boolean;
  onSelect: () => void;
  onEdit?: () => void;
}

function SortableTaskCard({ task, isSelected, onSelect, onEdit }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`border-b border-gray-200 cursor-pointer transition-colors ${
          isSelected ? "bg-blue-500" : "bg-white hover:bg-gray-50"
        } ${isSelected && task.fields.length > 0 ? "" : "last:border-b-0"}`}
        onClick={onSelect}
      >
        <div className="flex items-center p-3">
          <div
            {...attributes}
            {...listeners}
            className={`cursor-grab active:cursor-grabbing mr-2 select-none ${
              isSelected ? "text-blue-200" : "text-gray-400"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            ⋮⋮
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium ${isSelected ? "text-white" : "text-gray-700"}`}>
              {task.name}
            </div>
            {!isSelected && (
              <span className="text-xs text-gray-500">
                {task.fieldCount} campos
              </span>
            )}
          </div>
          {onEdit && (
            <span
              className={`text-xs ${isSelected ? "text-blue-100 hover:text-white" : "text-gray-400 hover:text-blue-600"}`}
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              Editar
            </span>
          )}
        </div>
      </div>
      {isSelected && task.fields.length > 0 && (
        <div className="fields-expand border-b border-gray-200 last:border-b-0">
          <div className="bg-blue-50">
            {task.fields.map((f, i) => (
              <div
                key={i}
                className="flex items-center px-3 py-0.5 border-t border-blue-100 first:border-t-0 group"
              >
                <span className="w-4 text-center text-[10px] text-blue-400">{FIELD_TYPE_ICONS[f.fieldType] ?? "?"}</span>
                <span className="text-[10px] text-blue-600 truncate ml-1.5 flex-1">{f.label}</span>
                {onEdit && (
                  <span
                    className="text-[10px] text-blue-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                  >
                    Editar
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCardOverlay({ task }: { task: TaskPreview }) {
  return (
    <div className="bg-white border-2 border-blue-400 rounded-lg shadow-lg p-3">
      <div className="flex items-center">
        <div className="text-gray-400 mr-2">⋮⋮</div>
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-700 mb-1">
            {task.name}
          </div>
          <span className="text-xs text-gray-500">
            {task.fieldCount} campos
          </span>
        </div>
      </div>
    </div>
  );
}

export function MobileRoutinePreview({ routineName, tasks, selectedTaskId, onReorderTasks, onSelectTask, onEditTask }: MobileRoutinePreviewProps) {
  const { dayOfWeek, fullDate } = formatCurrentDate();
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

    if (!over || active.id === over.id || !onReorderTasks) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(tasks, oldIndex, newIndex);
      onReorderTasks(newOrder.map((t) => t.id));
    }
  };

  const activeTask = tasks.find((t) => t.id === activeId);

  return (
    <div className="flex flex-col items-center justify-center flex-1">
      <MobilePhoneFrame>
        <div className="flex flex-col h-full -mx-5 -mt-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[11px] text-gray-500">Sincronizado</span>
            </div>
            <span className="text-base font-bold text-gray-900">Tectramin</span>
            <span className="text-[11px] text-gray-500">Cerrar Sesión</span>
          </div>

          <div className="flex flex-col items-center py-4 border-b border-gray-200">
            <span className="text-xs text-gray-500 tracking-wider">{dayOfWeek}</span>
            <span className="text-2xl font-bold text-gray-900 mt-1">{fullDate}</span>
            <span className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
              Hoy
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="text-lg font-semibold text-gray-700 mb-2">Sin Tareas</span>
                <span className="text-sm text-gray-500">
                  No hay tareas en esta rutina.
                  <br />
                  Agrega tareas desde el panel lateral.
                </span>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 px-3 py-3 border-b border-gray-200">
                  <span className="text-sm font-semibold text-gray-900">{routineName}</span>
                  <div className="text-xs text-gray-500 mt-1">ACME - Faena ejemplo</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Día 1</div>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={tasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {tasks.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        isSelected={selectedTaskId === task.id}
                        onSelect={() => onSelectTask?.(task.id)}
                        onEdit={onEditTask ? () => onEditTask(task.id) : undefined}
                      />
                    ))}
                  </SortableContext>
                  <DragOverlay>
                    {activeTask && <TaskCardOverlay task={activeTask} />}
                  </DragOverlay>
                </DndContext>
              </div>
            )}
          </div>
        </div>
      </MobilePhoneFrame>
    </div>
  );
}
