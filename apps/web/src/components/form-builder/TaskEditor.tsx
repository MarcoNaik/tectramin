"use client";

import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { DebouncedInput } from "@/components/ui/DebouncedInput";
import type { ServiceTaskTemplate } from "@/types";

interface TaskEditorProps {
  taskTemplateId: Id<"taskTemplates">;
  serviceTaskTemplateId: Id<"serviceTaskTemplates">;
  taskName: string;
  orderNumber: number;
  allTasksInRoutine: ServiceTaskTemplate[];
  currentDependencies: Id<"serviceTaskTemplates">[];
  onClose: () => void;
  onUpdateName: (name: string) => void;
  onRemoveFromRoutine: () => void;
  onEditFields: () => void;
  onToggleDependency: (prereqId: Id<"serviceTaskTemplates">, isAdding: boolean) => void;
}

export function TaskEditor({
  serviceTaskTemplateId,
  taskName,
  orderNumber,
  allTasksInRoutine,
  currentDependencies,
  onClose,
  onUpdateName,
  onRemoveFromRoutine,
  onEditFields,
  onToggleDependency,
}: TaskEditorProps) {
  const availablePrerequisites = allTasksInRoutine.filter(
    (t) => t._id !== serviceTaskTemplateId
  );

  return (
    <div className="w-72 flex-shrink-0">
      <div className="border-l border-gray-200 bg-white h-full flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">Editar Tarea</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            &times;
          </button>
        </div>
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-bold text-lg">{orderNumber}</span>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Orden</div>
              <div className="text-sm font-medium text-gray-700">Posición {orderNumber} en la rutina</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre de la Tarea</label>
            <DebouncedInput
              value={taskName}
              onChange={onUpdateName}
              className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={onEditFields}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-bold"
          >
            Editar Campos
          </button>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-bold text-gray-700 text-sm mb-2">Prerequisitos</h4>
            <p className="text-xs text-gray-500 mb-3">
              Selecciona las tareas que deben completarse antes de esta
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availablePrerequisites.length === 0 ? (
                <p className="text-xs text-gray-400 italic">
                  No hay otras tareas en esta rutina
                </p>
              ) : (
                availablePrerequisites.map((task) => {
                  const isPrereq = currentDependencies.includes(task._id);
                  return (
                    <label
                      key={task._id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={isPrereq}
                        onChange={() => onToggleDependency(task._id, !isPrereq)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 flex-1">{task.taskTemplateName}</span>
                      <span className="text-xs text-gray-400">#{task.order + 1}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onRemoveFromRoutine}
            className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-bold"
          >
            Quitar de la Rutina
          </button>
        </div>
      </div>
    </div>
  );
}

export function TaskEditorPlaceholder() {
  return (
    <div className="w-72 flex-shrink-0">
      <div className="border-l border-gray-200 bg-gray-50 h-full flex items-center justify-center p-6">
        <p className="text-gray-400 text-center text-sm font-medium">
          Selecciona una tarea para editar sus propiedades
        </p>
      </div>
    </div>
  );
}
