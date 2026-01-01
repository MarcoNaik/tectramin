"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
} from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useDraggable, useDroppable } from "@dnd-kit/core";

type WorkOrderDayGridData = {
  _id: Id<"workOrderDays">;
  faenaId: Id<"faenas">;
  dayDate: number;
  workOrderId: Id<"workOrders">;
  workOrderName: string;
  workOrderStatus: string;
  dayStatus: string;
  dayNumber: number;
  assignmentCount: number;
  taskCount: number;
  completedTaskCount: number;
  assignedUsers: Array<{
    userId: Id<"users">;
    fullName?: string;
    email: string;
  }>;
  tasks: Array<{
    linkId: Id<"workOrderDayTaskTemplates">;
    taskTemplateId: Id<"taskTemplates">;
    name: string;
    isRequired: boolean;
  }>;
};

type GridSpan =
  | { type: "empty"; dayTimestamp: number }
  | { type: "workOrder"; days: WorkOrderDayGridData[]; workOrderId: Id<"workOrders"> };

type UserData = {
  _id: Id<"users">;
  fullName?: string;
  email: string;
};

type ModalTab = "people" | "tasks";

type AssignmentDetailView = {
  dayId: Id<"workOrderDays">;
  userId: Id<"users">;
  userName: string;
  dayNumber: number;
  dayDate: number;
} | null;

function groupDaysIntoSpans(
  daysInRange: number[],
  cellMap: Map<string, WorkOrderDayGridData>,
  faenaId: Id<"faenas">
): GridSpan[] {
  const spans: GridSpan[] = [];
  let i = 0;

  while (i < daysInRange.length) {
    const day = daysInRange[i];
    const key = `${faenaId}-${day}`;
    const cellData = cellMap.get(key);

    if (!cellData) {
      spans.push({ type: "empty", dayTimestamp: day });
      i++;
    } else {
      const workOrderDays: WorkOrderDayGridData[] = [cellData];
      const workOrderId = cellData.workOrderId;
      let j = i + 1;
      while (j < daysInRange.length) {
        const nextKey = `${faenaId}-${daysInRange[j]}`;
        const nextCell = cellMap.get(nextKey);
        if (nextCell && nextCell.workOrderId === workOrderId) {
          workOrderDays.push(nextCell);
          j++;
        } else {
          break;
        }
      }
      spans.push({ type: "workOrder", days: workOrderDays, workOrderId });
      i = j;
    }
  }
  return spans;
}

function WorkOrderSpan({
  days,
  onSpanClick,
}: {
  days: WorkOrderDayGridData[];
  onSpanClick: (workOrderId: Id<"workOrders">) => void;
}) {
  const statusIcons: Record<string, string> = {
    draft: "○",
    scheduled: "◐",
    in_progress: "►",
    completed: "✓",
    cancelled: "✕",
    pending: "…",
  };

  const firstDay = days[0];
  const spanWidth = days.length * 160 - 4;

  const renderAssignmentSlots = (day: WorkOrderDayGridData) => {
    const slots = [];
    for (let i = 0; i < 1; i++) {
      const user = day.assignedUsers[i];
      if (user) {
        slots.push(
          <span key={i} className="w-5 h-5 border-2 border-black text-xs font-bold flex items-center justify-center bg-white">
            {user.fullName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
          </span>
        );
      } else {
        slots.push(
          <span key={i} className="w-5 h-5 border-2 border-dashed border-gray-300 text-xs flex items-center justify-center">
          </span>
        );
      }
    }
    return slots;
  };

  return (
    <div
      className="flex-shrink-0 border-2 border-black bg-white h-[calc(8rem-4px)] overflow-hidden cursor-pointer hover:shadow-[2px_2px_0px_0px_#000] transition-shadow m-[2px]"
      style={{ width: spanWidth }}
      onClick={() => onSpanClick(firstDay.workOrderId)}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-black">
        <span className="text-base">{statusIcons[firstDay.workOrderStatus] || statusIcons.pending}</span>
        <div className="text-sm font-bold truncate text-black flex-1" title={firstDay.workOrderName}>
          {firstDay.workOrderName}
        </div>
      </div>
      <div className="flex h-[96px]">
        {days.map((day, idx) => (
          <div
            key={day._id}
            className={`flex-1 p-3 flex flex-col justify-center gap-2 ${
              idx < days.length - 1 ? "border-r border-dashed border-gray-300" : ""
            }`}
          >
            <div className="flex flex-wrap gap-1">
              {renderAssignmentSlots(day)}
            </div>
            {day.taskCount > 0 && (
              <div className="text-[10px] text-gray-400">{day.taskCount} tarea{day.taskCount !== 1 ? "s" : ""}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyCell({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="w-40 flex-shrink-0 h-32 border-r border-b border-gray-200 bg-gray-50/50 p-2 flex items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-2 hover:border-blue-500 transition-all group"
      onClick={onClick}
    >
      <span className="text-transparent text-xs font-bold group-hover:text-blue-500 transition-colors">+ Agregar</span>
    </div>
  );
}

function DroppableSlot({
  id,
  user,
  onRemove,
}: {
  id: string;
  user?: UserData;
  onRemove?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  if (user) {
    return (
      <div
        ref={setNodeRef}
        className="w-12 h-12 border-2 border-black bg-white font-bold flex items-center justify-center relative group text-sm"
      >
        {user.fullName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-black text-white text-xs hidden group-hover:flex items-center justify-center rounded-full"
          >
            ×
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`w-12 h-12 border-2 border-dashed transition-colors ${
        isOver ? "border-blue-500 bg-blue-50" : "border-gray-300"
      }`}
    />
  );
}

function DraggableUserCard({ user }: { user: UserData }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `user-${user._id}`,
    data: { type: "user", userId: user._id },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`border-2 border-black p-2 bg-white cursor-grab select-none ${
        isDragging ? "opacity-50 shadow-[4px_4px_0px_0px_#000] z-50" : "hover:shadow-[2px_2px_0px_0px_#000]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 border-2 border-black font-bold flex items-center justify-center text-sm bg-gray-50">
          {user.fullName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
        </span>
        <span className="font-medium text-sm truncate max-w-[120px]">{user.fullName || user.email}</span>
      </div>
    </div>
  );
}

function SharedAssignmentRow({
  sharedUsers,
  allUsers,
  onRemoveShared,
}: {
  sharedUsers: Array<Id<"users">>;
  allUsers: UserData[];
  onRemoveShared: (userId: Id<"users">) => void;
}) {
  const slots: Array<React.ReactNode> = [];
  for (let i = 0; i < 1; i++) {
    const userId = sharedUsers[i];
    const user = userId ? allUsers.find((u) => u._id === userId) : undefined;
    slots.push(
      <DroppableSlot
        key={`shared-${i}`}
        id={`shared-slot-${i}`}
        user={user}
        onRemove={userId ? () => onRemoveShared(userId) : undefined}
      />
    );
  }

  return (
    <div className="border-b-2 border-black p-4 bg-gray-50">
      <div className="text-sm font-bold mb-2">Todos los Dias</div>
      <div className="text-xs text-gray-500 mb-3">Arrastra aqui para asignar a todos los dias</div>
      <div className="flex gap-2 flex-wrap">{slots}</div>
    </div>
  );
}

function ClickableUserSlot({
  id,
  user,
  onRemove,
  onClick,
}: {
  id: string;
  user?: UserData;
  onRemove?: () => void;
  onClick?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  if (user) {
    return (
      <div
        ref={setNodeRef}
        className="w-12 h-12 border-2 border-black bg-white font-bold flex items-center justify-center relative group text-sm cursor-pointer hover:bg-blue-50"
        onClick={onClick}
      >
        {user.fullName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-black text-white text-xs hidden group-hover:flex items-center justify-center rounded-full"
          >
            ×
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`w-12 h-12 border-2 border-dashed transition-colors ${
        isOver ? "border-blue-500 bg-blue-50" : "border-gray-300"
      }`}
    />
  );
}

function DayColumnWithClick({
  day,
  sharedUserCount,
  dayUsers,
  allUsers,
  onRemove,
  onUserClick,
}: {
  day: { _id: Id<"workOrderDays">; dayDate: number; dayNumber: number };
  sharedUserCount: number;
  dayUsers: Array<Id<"users">>;
  allUsers: UserData[];
  onRemove: (dayId: Id<"workOrderDays">, userId: Id<"users">) => void;
  onUserClick: (userId: Id<"users">, userName: string) => void;
}) {
  const availableSlots = Math.max(0, 1 - sharedUserCount);
  const slots: Array<React.ReactNode> = [];

  for (let i = 0; i < availableSlots; i++) {
    const userId = dayUsers[i];
    const user = userId ? allUsers.find((u) => u._id === userId) : undefined;
    slots.push(
      <ClickableUserSlot
        key={`day-${day._id}-${i}`}
        id={`day-${day._id}-slot-${i}`}
        user={user}
        onRemove={userId ? () => onRemove(day._id, userId) : undefined}
        onClick={user ? () => onUserClick(userId, user.fullName || user.email) : undefined}
      />
    );
  }

  const dateStr = new Date(day.dayDate).toLocaleDateString("es-CL", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex-shrink-0 w-32 border-r border-gray-200 p-3">
      <div className="text-xs font-bold text-gray-600 mb-3">{dateStr}</div>
      <div className="flex flex-wrap gap-2">{slots}</div>
      {availableSlots === 0 && (
        <div className="text-xs text-gray-400 italic">Cubierto por compartidos</div>
      )}
    </div>
  );
}

function AssignmentDetailPanel({
  detail,
  onClose,
}: {
  detail: NonNullable<AssignmentDetailView>;
  onClose: () => void;
}) {
  const instances = useQuery(api.admin.taskInstances.listByDayAndUser, {
    workOrderDayId: detail.dayId,
    userId: detail.userId,
  });

  return (
    <div className="w-80 border-l-2 border-black bg-white flex flex-col">
      <div className="p-4 border-b-2 border-black flex items-center justify-between">
        <div>
          <div className="font-bold">{detail.userName}</div>
          <div className="text-xs text-gray-500">Dia {detail.dayNumber}</div>
        </div>
        <button onClick={onClose} className="text-xl font-bold hover:text-gray-600">×</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-sm font-bold mb-2">Progreso de Tareas</div>
        {!instances ? (
          <div className="text-xs text-gray-500">Cargando...</div>
        ) : instances.length === 0 ? (
          <div className="text-xs text-gray-500">Sin tareas asignadas</div>
        ) : (
          <div className="space-y-2">
            {instances.map((inst) => (
              <div key={inst._id} className="border-2 border-black p-2">
                <div className="text-sm font-bold">{inst.taskTemplateName}</div>
                <div className={`text-xs mt-1 ${inst.status === "completed" ? "text-green-600" : "text-gray-500"}`}>
                  {inst.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TasksTabContent({
  days,
}: {
  days: Array<{ _id: Id<"workOrderDays">; dayDate: number; dayNumber: number }>;
}) {
  const allTaskTemplates = useQuery(api.admin.taskTemplates.list);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-56 border-r-2 border-black flex flex-col">
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="text-sm font-bold">Tareas Disponibles</div>
            <div className="text-xs text-gray-500">Gestionar tareas por dia</div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {allTaskTemplates?.filter(t => t.isActive).map((template) => (
              <div key={template._id} className="border-2 border-black p-2 bg-white">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 border-2 border-black font-bold flex items-center justify-center text-sm bg-gray-50">
                    {template.name[0]?.toUpperCase()}
                  </span>
                  <span className="font-medium text-sm truncate max-w-[120px]">{template.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-4">
            {days.map((day) => (
              <WorkOrderDayTasks key={day._id} day={day} />
            ))}
          </div>
        </div>
      </div>
    </DndContext>
  );
}

function WorkOrderDayTasks({
  day,
}: {
  day: { _id: Id<"workOrderDays">; dayDate: number; dayNumber: number };
}) {
  const allTaskTemplates = useQuery(api.admin.taskTemplates.list);
  const dayData = useQuery(api.admin.workOrderDays.getWithTaskTemplates, { id: day._id });
  const addTask = useMutation(api.admin.workOrderDays.addTaskTemplate);
  const removeTask = useMutation(api.admin.workOrderDays.removeTaskTemplate);

  const [selectedTask, setSelectedTask] = useState<Id<"taskTemplates"> | "">("");

  const dayTasks = dayData?.taskTemplates ?? [];
  const assignedTaskIds = new Set(dayTasks.map((t) => t.taskTemplateId));
  const availableTasks = allTaskTemplates?.filter((t) => !assignedTaskIds.has(t._id) && t.isActive) ?? [];

  const handleAddTask = async () => {
    if (!selectedTask) return;
    try {
      await addTask({ workOrderDayId: day._id, taskTemplateId: selectedTask });
      setSelectedTask("");
    } catch {}
  };

  const handleRemoveTask = async (taskTemplateId: Id<"taskTemplates">) => {
    try {
      await removeTask({ workOrderDayId: day._id, taskTemplateId });
    } catch {}
  };

  return (
    <div className="p-3 bg-gray-50 border-2 border-black min-w-[200px]">
      <div className="text-xs font-bold mb-2">
        Dia {day.dayNumber} - {new Date(day.dayDate).toLocaleDateString("es-CL", { weekday: "short", month: "short", day: "numeric" })}
      </div>
      {dayTasks.length > 0 && (
        <div className="space-y-1 mb-2">
          {dayTasks.map((task) => (
            <div key={task._id} className="flex items-center justify-between text-xs bg-white border-2 border-black px-2 py-1">
              <span className="font-medium">{task.taskTemplateName}</span>
              <button onClick={() => handleRemoveTask(task.taskTemplateId)} className="text-gray-400 hover:text-red-500 font-bold">×</button>
            </div>
          ))}
        </div>
      )}
      {availableTasks.length > 0 && (
        <div className="flex gap-1">
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value as Id<"taskTemplates"> | "")}
            className="flex-1 border-2 border-black px-2 py-1 text-xs"
          >
            <option value="">Agregar tarea...</option>
            {availableTasks.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </select>
          <button
            onClick={handleAddTask}
            disabled={!selectedTask}
            className="border-2 border-black bg-white px-2 py-1 text-xs font-bold hover:bg-gray-100 disabled:opacity-50"
          >
            Agregar
          </button>
        </div>
      )}
    </div>
  );
}

function WorkOrderAssignmentModal({
  isOpen,
  onClose,
  workOrderId,
}: {
  isOpen: boolean;
  onClose: () => void;
  workOrderId: Id<"workOrders"> | null;
}) {
  const workOrderDetails = useQuery(
    api.admin.workOrders.getWithDetails,
    workOrderId ? { id: workOrderId } : "skip"
  );
  const users = useQuery(api.shared.users.list);
  const assign = useMutation(api.admin.assignments.assign);
  const unassign = useMutation(api.admin.assignments.unassign);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [activeTab, setActiveTab] = useState<ModalTab>("people");
  const [sharedUsers, setSharedUsers] = useState<Array<Id<"users">>>([]);
  const [dayAssignments, setDayAssignments] = useState<Map<Id<"workOrderDays">, Array<Id<"users">>>>(new Map());
  const [assignmentDetail, setAssignmentDetail] = useState<AssignmentDetailView>(null);

  const allUsers: UserData[] = users ?? [];
  const days = workOrderDetails?.days ?? [];

  useEffect(() => {
    if (!workOrderDetails || !users) return;

    const userAssignmentCounts = new Map<Id<"users">, number>();
    const newDayAssignments = new Map<Id<"workOrderDays">, Array<Id<"users">>>();

    for (const day of workOrderDetails.days) {
      const dayUserIds: Array<Id<"users">> = [];
      if (day.assignments) {
        for (const a of day.assignments) {
          dayUserIds.push(a.userId);
          userAssignmentCounts.set(a.userId, (userAssignmentCounts.get(a.userId) ?? 0) + 1);
        }
      }
      newDayAssignments.set(day._id, dayUserIds);
    }

    const totalDays = workOrderDetails.days.length;
    const newSharedUsers: Array<Id<"users">> = [];
    for (const [userId, count] of userAssignmentCounts) {
      if (count === totalDays) {
        newSharedUsers.push(userId);
      }
    }

    for (const sharedUserId of newSharedUsers) {
      for (const [dayId, dayUserIds] of newDayAssignments) {
        const filtered = dayUserIds.filter((id) => id !== sharedUserId);
        newDayAssignments.set(dayId, filtered);
      }
    }

    setSharedUsers(newSharedUsers);
    setDayAssignments(newDayAssignments);
  }, [workOrderDetails, users]);

  const sharedUserIds = new Set(sharedUsers);
  const availableUsers = allUsers.filter((u) => !sharedUserIds.has(u._id));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !workOrderDetails) return;

    const userId = active.data.current?.userId as Id<"users">;
    if (!userId) return;

    const overId = over.id.toString();

    if (overId.startsWith("shared-slot-")) {
      setSharedUsers((prev) => [...prev, userId]);
      setDayAssignments((prev) => {
        const updated = new Map(prev);
        for (const [dayId, dayUserIds] of updated) {
          updated.set(dayId, dayUserIds.filter((id) => id !== userId));
        }
        return updated;
      });
      for (const day of workOrderDetails.days) {
        assign({ workOrderDayId: day._id, userId });
      }
    } else if (overId.startsWith("day-")) {
      const parts = overId.split("-");
      const dayId = parts[1] as Id<"workOrderDays">;
      setDayAssignments((prev) => {
        const updated = new Map(prev);
        const current = updated.get(dayId) ?? [];
        if (current.includes(userId)) return prev;
        updated.set(dayId, [...current, userId]);
        return updated;
      });
      assign({ workOrderDayId: dayId, userId });
    }
  };

  const handleRemoveShared = (userId: Id<"users">) => {
    if (!workOrderDetails) return;
    setSharedUsers((prev) => prev.filter((id) => id !== userId));
    for (const day of workOrderDetails.days) {
      unassign({ workOrderDayId: day._id, userId });
    }
  };

  const handleRemoveFromDay = (dayId: Id<"workOrderDays">, userId: Id<"users">) => {
    setDayAssignments((prev) => {
      const updated = new Map(prev);
      const current = updated.get(dayId) ?? [];
      updated.set(dayId, current.filter((id) => id !== userId));
      return updated;
    });
    unassign({ workOrderDayId: dayId, userId });
  };

  if (!isOpen || !workOrderId) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_#000] w-[90%] h-[90vh] flex flex-col">
          <div className="p-4 border-b-2 border-black bg-white">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold">Gestionar Orden de Trabajo</h3>
                {workOrderDetails && (
                  <div className="text-sm text-gray-600">
                    {workOrderDetails.workOrder.name} • {workOrderDetails.faena.name} • {workOrderDetails.customer.name}
                  </div>
                )}
                {workOrderDetails && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {days.length} dias
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 border-2 border-black flex items-center justify-center font-bold hover:bg-gray-100"
              >
                ×
              </button>
            </div>
            <div className="flex border-2 border-black">
              <button
                onClick={() => { setActiveTab("people"); setAssignmentDetail(null); }}
                className={`flex-1 px-4 py-2 text-sm font-bold transition-colors ${
                  activeTab === "people"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-gray-100"
                }`}
              >
                Personas
              </button>
              <button
                onClick={() => { setActiveTab("tasks"); setAssignmentDetail(null); }}
                className={`flex-1 px-4 py-2 text-sm font-bold border-l-2 border-black transition-colors ${
                  activeTab === "tasks"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-gray-100"
                }`}
              >
                Tareas
              </button>
            </div>
          </div>

          {workOrderDetails ? (
            <div className="flex-1 flex overflow-hidden">
              {activeTab === "people" ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <div className="flex-1 flex overflow-hidden">
                    <div className="w-56 border-r-2 border-black flex flex-col">
                      <div className="p-3 border-b border-gray-200 bg-gray-50">
                        <div className="text-sm font-bold">Disponibles</div>
                        <div className="text-xs text-gray-500">Arrastra para asignar</div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {availableUsers.map((user) => (
                          <DraggableUserCard key={user._id} user={user} />
                        ))}
                        {availableUsers.length === 0 && (
                          <div className="text-xs text-gray-400 italic text-center py-4">
                            Todos los usuarios asignados
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden">
                      <SharedAssignmentRow
                        sharedUsers={sharedUsers}
                        allUsers={allUsers}
                        onRemoveShared={handleRemoveShared}
                      />

                      <div className="flex-1 overflow-x-auto">
                        <div className="flex min-w-max">
                          {days.map((day) => (
                            <DayColumnWithClick
                              key={day._id}
                              day={day}
                              sharedUserCount={sharedUsers.length}
                              dayUsers={dayAssignments.get(day._id) ?? []}
                              allUsers={allUsers}
                              onRemove={handleRemoveFromDay}
                              onUserClick={(userId, userName) => {
                                setAssignmentDetail({
                                  dayId: day._id,
                                  userId,
                                  userName,
                                  dayNumber: day.dayNumber,
                                  dayDate: day.dayDate,
                                });
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </DndContext>
              ) : (
                <TasksTabContent days={days} />
              )}

              {assignmentDetail && (
                <AssignmentDetailPanel
                  detail={assignmentDetail}
                  onClose={() => setAssignmentDetail(null)}
                />
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-gray-500">Cargando...</div>
            </div>
          )}

          <div className="p-4 border-t-2 border-black">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 border-2 border-black bg-blue-500 text-white font-bold hover:bg-blue-600"
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function WorkOrderDrawer({
  isOpen,
  onClose,
  faena,
  startDate,
  onCreatedAndAssign,
}: {
  isOpen: boolean;
  onClose: () => void;
  faena: { _id: Id<"faenas">; name: string; customerName: string } | null;
  startDate: number;
  onCreatedAndAssign?: (workOrderId: Id<"workOrders">) => void;
}) {
  const services = useQuery(api.admin.services.listActive);
  const customers = useQuery(api.admin.customers.list);
  const faenas = useQuery(api.admin.faenas.list);
  const createWorkOrder = useMutation(api.admin.workOrders.create);

  const [selectedService, setSelectedService] = useState<Id<"services"> | "">("");
  const [name, setName] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const faenaData = faenas?.find((f) => f._id === faena?._id);
  const customerId = faenaData?.customerId;

  const formatDateForInput = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toISOString().split("T")[0];
  };

  const startDateStr = formatDateForInput(startDate);

  const handleServiceChange = (serviceId: Id<"services"> | "") => {
    setSelectedService(serviceId);
    if (serviceId) {
      const service = services?.find((s) => s._id === serviceId);
      if (service && !name) {
        const customerName = customers?.find((c) => c._id === customerId)?.name ?? "";
        setName(`${service.name} - ${customerName}`);
      }
    }
  };

  const resetForm = () => {
    setSelectedService("");
    setName("");
    setEndDate("");
    setNotes("");
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (andAssign: boolean) => {
    if (!faena || !selectedService || !customerId) return;

    setError("");
    setIsSubmitting(true);

    try {
      const workOrderId = await createWorkOrder({
        customerId,
        faenaId: faena._id,
        serviceId: selectedService,
        name: name.trim() || `Work Order - ${faena.name}`,
        startDate: new Date(startDateStr).getTime(),
        endDate: new Date(endDate).getTime(),
        notes: notes.trim() || undefined,
      });

      handleClose();
      if (andAssign && onCreatedAndAssign) {
        onCreatedAndAssign(workOrderId);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to create work order";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={handleClose} />
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-xl z-50 flex flex-col border-l-2 border-black">
        <div className="p-4 border-b-2 border-black flex items-center justify-between">
          <h3 className="text-lg font-bold">Crear Orden de Trabajo</h3>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 text-xl font-bold">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-blue-50 p-3 border-2 border-blue-200">
            <div className="text-sm font-bold text-blue-900">{faena?.name}</div>
            <div className="text-xs text-blue-700">{faena?.customerName}</div>
            <div className="text-xs text-blue-600 mt-1">
              Inicio: {new Date(startDate).toLocaleDateString("es-CL", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 border-2 border-red-200 text-sm font-medium">{error}</div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Rutina *</label>
            <select
              value={selectedService}
              onChange={(e) => handleServiceChange(e.target.value as Id<"services"> | "")}
              className="w-full border-2 border-black px-3 py-2 text-sm"
            >
              <option value="">Seleccionar rutina...</option>
              {services?.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre de Orden de Trabajo *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ingrese nombre de orden de trabajo"
              className="w-full border-2 border-black px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de Inicio</label>
              <input
                type="date"
                value={startDateStr}
                disabled
                className="w-full border-2 border-black px-3 py-2 text-sm bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de Termino *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDateStr}
                className="w-full border-2 border-black px-3 py-2 text-sm"
              />
            </div>
          </div>


          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas opcionales..."
              rows={3}
              className="w-full border-2 border-black px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>

        <div className="p-4 border-t-2 border-black space-y-2">
          <button
            onClick={() => handleSubmit(true)}
            disabled={!selectedService || !name.trim() || !endDate || isSubmitting}
            className="w-full px-4 py-2 bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-black"
          >
            {isSubmitting ? "Creando..." : "Crear y Asignar Personas"}
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border-2 border-black text-sm font-bold hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={!selectedService || !name.trim() || !endDate || isSubmitting}
              className="flex-1 px-4 py-2 border-2 border-black text-sm font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Solo Crear
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function FaenaDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const customers = useQuery(api.admin.customers.list);
  const createFaena = useMutation(api.admin.faenas.create);
  const createCustomer = useMutation(api.admin.customers.create);

  const [customerId, setCustomerId] = useState<Id<"customers"> | "">("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  const resetForm = () => {
    setCustomerId("");
    setName("");
    setLocation("");
    setError("");
    setShowNewCustomer(false);
    setNewCustomerName("");
    setNewCustomerEmail("");
    setNewCustomerPhone("");
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) return;

    setError("");
    setIsCreatingCustomer(true);
    try {
      const newId = await createCustomer({
        name: newCustomerName.trim(),
        email: newCustomerEmail.trim() || undefined,
        phone: newCustomerPhone.trim() || undefined,
      });
      setCustomerId(newId);
      setShowNewCustomer(false);
      setNewCustomerName("");
      setNewCustomerEmail("");
      setNewCustomerPhone("");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create customer";
      setError(errorMessage);
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleCreate = async () => {
    if (!customerId || !name.trim()) return;

    setError("");
    setIsCreating(true);
    try {
      await createFaena({
        customerId,
        name: name.trim(),
        location: location.trim() || undefined,
      });
      resetForm();
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create faena";
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={handleClose} />
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col border-l-2 border-black">
        <div className="p-4 border-b-2 border-black flex items-center justify-between">
          <h2 className="text-lg font-bold">Nueva Faena</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 text-xl font-bold">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 border-2 border-red-200 font-medium">{error}</div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Cliente *</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value as Id<"customers"> | "")}
              className="w-full border-2 border-black px-3 py-2"
            >
              <option value="">Seleccionar cliente...</option>
              {customers?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>

            {!showNewCustomer ? (
              <button
                type="button"
                onClick={() => setShowNewCustomer(true)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Agregar nuevo cliente
              </button>
            ) : (
              <div className="mt-3 p-3 bg-gray-50 border-2 border-black space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700">Nuevo Cliente</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCustomer(false);
                      setNewCustomerName("");
                      setNewCustomerEmail("");
                      setNewCustomerPhone("");
                    }}
                    className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                  >
                    Cancelar
                  </button>
                </div>
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Nombre del cliente *"
                  className="w-full border-2 border-black px-3 py-2 text-sm"
                />
                <input
                  type="email"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  placeholder="Email (opcional)"
                  className="w-full border-2 border-black px-3 py-2 text-sm"
                />
                <input
                  type="tel"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="Telefono (opcional)"
                  className="w-full border-2 border-black px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={handleCreateCustomer}
                  disabled={!newCustomerName.trim() || isCreatingCustomer}
                  className="w-full bg-black text-white py-1.5 text-sm font-bold disabled:opacity-50"
                >
                  {isCreatingCustomer ? "Creando..." : "Crear Cliente"}
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre de Faena *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej., Sitio Alpha"
              className="w-full border-2 border-black px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Ubicacion</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="ej., Santiago, Chile"
              className="w-full border-2 border-black px-3 py-2"
            />
          </div>
        </div>

        <div className="p-4 border-t-2 border-black">
          <button
            onClick={handleCreate}
            disabled={!customerId || !name.trim() || isCreating}
            className="w-full bg-blue-500 text-white py-2 font-bold disabled:opacity-50 border-2 border-black"
          >
            {isCreating ? "Creando..." : "Crear Faena"}
          </button>
        </div>
      </div>
    </>
  );
}

type WeekChunk = { start: number; end: number };

function getWeekChunkKey(chunk: WeekChunk): string {
  return `${chunk.start}-${chunk.end}`;
}

function useThrottle<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  const lastRun = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return ((...args: unknown[]) => {
    const now = Date.now();
    if (now - lastRun.current >= delay) {
      lastRun.current = now;
      fn(...args);
    } else if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        lastRun.current = Date.now();
        timeoutRef.current = null;
        fn(...args);
      }, delay - (now - lastRun.current));
    }
  }) as T;
}

function WeekDataLoader({
  chunk,
  onData,
}: {
  chunk: WeekChunk;
  onData: (key: string, data: { faenas: Array<{ _id: Id<"faenas">; name: string; customerName: string; isActive: boolean }>; workOrderDays: WorkOrderDayGridData[] } | undefined) => void;
}) {
  const data = useQuery(api.admin.dashboardGrid.getGridData, {
    startDate: chunk.start,
    endDate: chunk.end,
  });

  const key = getWeekChunkKey(chunk);

  useEffect(() => {
    onData(key, data);
  }, [key, data, onData]);

  return null;
}

export function GridView() {
  const [weekChunks, setWeekChunks] = useState<WeekChunk[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - 7);
    const end = new Date(today);
    end.setDate(end.getDate() + 7);
    return [{ start: start.getTime(), end: end.getTime() }];
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolled = useRef(false);
  const isLoadingRef = useRef(false);
  const chunkDataRef = useRef<Map<string, { faenas: Array<{ _id: Id<"faenas">; name: string; customerName: string; isActive: boolean }>; workOrderDays: WorkOrderDayGridData[] }>>(new Map());
  const [dataVersion, setDataVersion] = useState(0);

  const [editingWorkOrderId, setEditingWorkOrderId] = useState<Id<"workOrders"> | null>(null);
  const [faenaDrawerOpen, setFaenaDrawerOpen] = useState(false);
  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    faena: { _id: Id<"faenas">; name: string; customerName: string } | null;
    startDate: number;
  }>({ isOpen: false, faena: null, startDate: 0 });

  const openDrawer = (faena: { _id: Id<"faenas">; name: string; customerName: string }, startDate: number) => {
    setDrawerState({ isOpen: true, faena, startDate });
  };

  const closeDrawer = () => {
    setDrawerState({ isOpen: false, faena: null, startDate: 0 });
  };

  const handleChunkData = useCallback((key: string, data: { faenas: Array<{ _id: Id<"faenas">; name: string; customerName: string; isActive: boolean }>; workOrderDays: WorkOrderDayGridData[] } | undefined) => {
    if (data) {
      const prev = chunkDataRef.current.get(key);
      if (!prev || JSON.stringify(prev) !== JSON.stringify(data)) {
        chunkDataRef.current.set(key, data);
        setDataVersion((n) => n + 1);
      }
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- dataVersion triggers recomputation when ref data changes
  const gridData = useMemo(() => {
    if (chunkDataRef.current.size === 0) return null;

    const allFaenas = new Map<string, { _id: Id<"faenas">; name: string; customerName: string; isActive: boolean }>();
    const allWorkOrderDays: WorkOrderDayGridData[] = [];

    chunkDataRef.current.forEach((data) => {
      data.faenas.forEach((f) => allFaenas.set(f._id, f));
      allWorkOrderDays.push(...data.workOrderDays);
    });

    return {
      faenas: Array.from(allFaenas.values()).sort((a, b) => a.name.localeCompare(b.name)),
      workOrderDays: allWorkOrderDays,
    };
  }, [dataVersion, weekChunks]);

  const dateRange = useMemo(() => {
    if (weekChunks.length === 0) return { start: 0, end: 0 };
    const starts = weekChunks.map((c) => c.start);
    const ends = weekChunks.map((c) => c.end);
    return { start: Math.min(...starts), end: Math.max(...ends) };
  }, [weekChunks]);

  const daysInRange = useMemo(() => {
    const days: number[] = [];
    const current = new Date(dateRange.start);
    current.setHours(0, 0, 0, 0);
    const endDate = new Date(dateRange.end);
    endDate.setHours(0, 0, 0, 0);

    while (current <= endDate) {
      days.push(current.getTime());
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [dateRange]);

  const cellMap = useMemo(() => {
    const map = new Map<string, WorkOrderDayGridData>();
    gridData?.workOrderDays.forEach((day) => {
      const dayStart = new Date(day.dayDate);
      dayStart.setHours(0, 0, 0, 0);
      const key = `${day.faenaId}-${dayStart.getTime()}`;
      map.set(key, day);
    });
    return map;
  }, [gridData?.workOrderDays]);

  const loadMoreRight = () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    setWeekChunks((prev) => {
      const lastChunk = prev[prev.length - 1];
      const newStart = lastChunk.end + 24 * 60 * 60 * 1000;
      const newEnd = newStart + 6 * 24 * 60 * 60 * 1000;
      return [...prev, { start: newStart, end: newEnd }];
    });

    setTimeout(() => {
      isLoadingRef.current = false;
    }, 300);
  };

  const loadMoreLeft = () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    const scrollContainer = scrollContainerRef.current;
    const currentScrollLeft = scrollContainer?.scrollLeft ?? 0;

    setWeekChunks((prev) => {
      const firstChunk = prev[0];
      const newEnd = firstChunk.start - 24 * 60 * 60 * 1000;
      const newStart = newEnd - 6 * 24 * 60 * 60 * 1000;
      return [{ start: newStart, end: newEnd }, ...prev];
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollContainer) {
          scrollContainer.scrollLeft = currentScrollLeft + (7 * 160);
        }
        setTimeout(() => {
          isLoadingRef.current = false;
        }, 300);
      });
    });
  };

  const checkScrollPosition = () => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !hasInitialScrolled.current || isLoadingRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
    const scrollRight = scrollWidth - scrollLeft - clientWidth;

    if (scrollRight < 400) {
      loadMoreRight();
    }

    if (scrollLeft < 400) {
      loadMoreLeft();
    }
  };

  const throttledScrollCheck = useThrottle(checkScrollPosition, 150);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !gridData) return;

    if (!hasInitialScrolled.current) {
      hasInitialScrolled.current = true;
      const dayWidth = 160;
      const todayIndex = 7;
      const centerOffset = (scrollContainer.clientWidth / 2) - (dayWidth / 2);
      const scrollPosition = (todayIndex * dayWidth) - centerOffset;
      scrollContainer.scrollLeft = Math.max(0, scrollPosition);
    }

    const handleScroll = () => throttledScrollCheck();
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [gridData, throttledScrollCheck]);

  const formatDayHeader = (timestamp: number) => {
    const date = new Date(timestamp);
    const weekday = date.toLocaleDateString("es-CL", { weekday: "short" });
    const day = date.getDate();
    const month = date.toLocaleDateString("es-CL", { month: "short" });
    return { weekday, day, month };
  };

  const chunkLoaders = weekChunks.map((chunk) => (
    <WeekDataLoader
      key={getWeekChunkKey(chunk)}
      chunk={chunk}
      onData={handleChunkData}
    />
  ));

  if (!gridData) {
    return (
      <>
        {chunkLoaders}
        <div className="space-y-4 p-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-64 mx-auto" />
          <div className="flex h-[500px]">
            <div className="w-48 flex-shrink-0 bg-gray-100 animate-pulse" />
            <div className="flex-1 bg-gray-50 animate-pulse" />
          </div>
        </div>
      </>
    );
  }

  if (gridData.faenas.length === 0) {
    return (
      <>
        {chunkLoaders}
        <div className="text-center py-12 text-gray-500">
          <div className="text-lg font-bold">No se encontraron faenas</div>
          <div className="text-sm mt-1">Crea una faena para comenzar</div>
          <button
            onClick={() => setFaenaDrawerOpen(true)}
            className="mt-4 px-4 py-2 bg-blue-500 text-white font-bold hover:bg-blue-600 border-2 border-black"
          >
            + Crear Faena
          </button>
        </div>
        <FaenaDrawer
          isOpen={faenaDrawerOpen}
          onClose={() => setFaenaDrawerOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      {chunkLoaders}
      <div className="h-full flex flex-col">
      <div className="flex overflow-hidden flex-1" style={{ minHeight: "400px" }}>
        <div className="w-48 flex-shrink-0 border-r border-gray-200 bg-white z-10 overflow-y-auto">
          <div className="h-14 border-b border-gray-200 bg-white p-2 font-bold text-sm flex items-center sticky top-0">
            Faenas
          </div>
          {gridData.faenas.map((faena) => (
            <div key={faena._id} className="h-32 p-3 border-b border-gray-200 flex flex-col justify-center">
              <div className="font-bold text-base truncate text-black" title={faena.name}>{faena.name}</div>
              <div className="text-xs text-gray-500 truncate" title={faena.customerName}>{faena.customerName}</div>
            </div>
          ))}
          <div
            className="h-16 p-2 border-b border-gray-200 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors group"
            onClick={() => setFaenaDrawerOpen(true)}
          >
            <span className="text-sm text-gray-300 group-hover:text-blue-500 font-bold transition-colors">+ Agregar Faena</span>
          </div>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-x-auto overflow-y-auto">
          <div className="inline-flex flex-col min-w-full">
            <div className="flex sticky top-0 bg-white z-5">
              {daysInRange.map((day) => {
                const { weekday, day: dayNum, month } = formatDayHeader(day);
                const isToday = new Date(day).toDateString() === new Date().toDateString();
                return (
                  <div
                    key={day}
                    className={`w-40 flex-shrink-0 h-14 border-b border-r border-gray-200 p-2 text-center ${
                      isToday ? "bg-blue-500 text-white" : "bg-white"
                    }`}
                  >
                    <div className={`text-xs font-bold ${isToday ? "text-white" : "text-black"}`}>{weekday}</div>
                    <div className={`text-sm font-bold ${isToday ? "text-white" : "text-black"}`}>
                      {month} {dayNum}
                    </div>
                  </div>
                );
              })}
            </div>

            {gridData.faenas.map((faena) => {
              const spans = groupDaysIntoSpans(daysInRange, cellMap, faena._id);
              return (
                <div key={faena._id} className="relative h-32">
                  <div className="absolute inset-0 flex">
                    {daysInRange.map((day) => (
                      <div
                        key={day}
                        className="w-40 flex-shrink-0 h-full border-r border-b border-gray-200 bg-gray-50/50 cursor-pointer hover:bg-blue-50 transition-colors group flex items-center justify-center"
                        onClick={() => openDrawer(faena, day)}
                      >
                        <span className="text-xs font-bold text-transparent group-hover:text-blue-500 transition-colors">+ Agregar Orden de Trabajo</span>
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex pointer-events-none">
                    {spans.map((span, spanIndex) => {
                      if (span.type === "empty") {
                        const emptyIndex = daysInRange.indexOf(span.dayTimestamp);
                        return (
                          <div
                            key={`empty-${span.dayTimestamp}`}
                            className="w-40 flex-shrink-0"
                          />
                        );
                      }
                      return (
                        <div key={`span-${spanIndex}-${span.workOrderId}`} className="pointer-events-auto">
                          <WorkOrderSpan
                            days={span.days}
                            onSpanClick={(workOrderId) => setEditingWorkOrderId(workOrderId)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="flex h-16">
              {daysInRange.map((day) => (
                <div key={day} className="w-40 flex-shrink-0 border-r border-b border-gray-200 bg-gray-50/30" />
              ))}
            </div>
          </div>
        </div>
      </div>


      <WorkOrderDrawer
        isOpen={drawerState.isOpen}
        onClose={closeDrawer}
        faena={drawerState.faena}
        startDate={drawerState.startDate}
        onCreatedAndAssign={(workOrderId) => setEditingWorkOrderId(workOrderId)}
      />

      <FaenaDrawer
        isOpen={faenaDrawerOpen}
        onClose={() => setFaenaDrawerOpen(false)}
      />

      <WorkOrderAssignmentModal
        isOpen={editingWorkOrderId !== null}
        onClose={() => setEditingWorkOrderId(null)}
        workOrderId={editingWorkOrderId}
      />
      </div>
    </>
  );
}
