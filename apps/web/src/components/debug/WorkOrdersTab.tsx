"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { format } from "date-fns";
import { dateStringToUTCMidnight, formatUTCDate } from "../../utils/dateUtils";

function TaskInstanceDetails({ instanceId }: { instanceId: Id<"taskInstances"> }) {
  const data = useQuery(api.admin.taskInstances.getWithResponses, { id: instanceId });

  if (!data) return <div className="p-2 text-xs text-gray-500">Cargando...</div>;

  return (
    <div className="p-2 border-t-2 border-black bg-gray-50 text-xs space-y-1">
      <div className="text-gray-500">
        Iniciado: {data.instance.startedAt ? new Date(data.instance.startedAt).toLocaleString() : "N/A"}
        {data.instance.completedAt && <span className="ml-2">| Completado: {new Date(data.instance.completedAt).toLocaleString()}</span>}
      </div>
      <div className="space-y-1 mt-2">
        {data.fields.map((field) => (
          <div key={field._id} className="flex justify-between items-start p-1 bg-white border-2 border-black">
            <span className="text-gray-700">
              {field.label}
              {field.isRequired && <span className="text-red-500 ml-0.5">*</span>}
              <span className="text-gray-400 ml-1">({field.fieldType})</span>
            </span>
            <span className={`font-mono ${field.response?.value ? "text-gray-900" : "text-gray-400 italic"}`}>
              {field.response?.value ?? "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoutineCard({
  routine,
  onRemove
}: {
  routine: { _id: Id<"workOrderDayServices">; serviceName: string; taskCount: number };
  onRemove: (id: Id<"workOrderDayServices">) => void;
}) {
  return (
    <div className="bg-white border-2 border-black px-3 py-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-bold">{routine.serviceName}</span>
        <button
          onClick={() => onRemove(routine._id)}
          className="text-gray-400 hover:text-red-500 font-bold ml-2"
          title="Quitar rutina"
        >
          ×
        </button>
      </div>
      <div className="text-gray-500 mt-1">{routine.taskCount} tareas</div>
    </div>
  );
}

function DayRow({
  day,
  users,
  services,
  taskTemplates,
  assign,
  unassign,
  addRoutine,
  removeRoutine,
  addStandaloneTask,
  removeStandaloneTask,
}: {
  day: {
    _id: Id<"workOrderDays">;
    dayDate: number;
    dayNumber: number;
    status: string;
    requiredPeople?: number;
    assignmentCount: number;
    routineCount: number;
    standaloneTaskCount: number;
    taskCount: number;
    completedTaskCount: number;
  };
  users: Array<{ _id: Id<"users">; fullName?: string; email: string; clerkId: string }>;
  services: Array<{ _id: Id<"services">; name: string }>;
  taskTemplates: Array<{ _id: Id<"taskTemplates">; name: string }>;
  assign: ReturnType<typeof useMutation>;
  unassign: ReturnType<typeof useMutation>;
  addRoutine: ReturnType<typeof useMutation>;
  removeRoutine: ReturnType<typeof useMutation>;
  addStandaloneTask: ReturnType<typeof useMutation>;
  removeStandaloneTask: ReturnType<typeof useMutation>;
}) {
  const requiredPeople = day.requiredPeople ?? 1;
  const assignments = useQuery(api.admin.assignments.listByWorkOrderDay, { workOrderDayId: day._id });
  const dayRoutines = useQuery(api.admin.workOrderDayServices.listByDay, { workOrderDayId: day._id });
  const standaloneTasks = useQuery(api.admin.workOrderDays.listStandaloneTasks, { workOrderDayId: day._id });
  const taskInstances = useQuery(api.admin.taskInstances.listByWorkOrderDay, { workOrderDayId: day._id });
  const [selectedUsers, setSelectedUsers] = useState<Record<number, Id<"users"> | "">>({});
  const [selectedService, setSelectedService] = useState<Id<"services"> | "">("");
  const [selectedTask, setSelectedTask] = useState<Id<"taskTemplates"> | "">("");
  const [error, setError] = useState("");
  const [expandedInstance, setExpandedInstance] = useState<Id<"taskInstances"> | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddRoutine, setShowAddRoutine] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  const handleAssign = async (slotIndex: number) => {
    const userId = selectedUsers[slotIndex];
    if (!userId) return;
    setError("");
    try {
      await assign({ workOrderDayId: day._id, userId });
      setSelectedUsers((prev) => ({ ...prev, [slotIndex]: "" }));
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to assign";
      setError(errorMessage);
    }
  };

  const handleUnassign = async (userId: Id<"users">) => {
    setError("");
    try {
      await unassign({ workOrderDayId: day._id, userId });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to unassign";
      setError(errorMessage);
    }
  };

  const handleAddRoutine = async () => {
    if (!selectedService) return;
    setError("");
    try {
      await addRoutine({ workOrderDayId: day._id, serviceId: selectedService });
      setSelectedService("");
      setShowAddRoutine(false);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to add routine";
      setError(errorMessage);
    }
  };

  const handleRemoveRoutine = async (workOrderDayServiceId: Id<"workOrderDayServices">) => {
    setError("");
    try {
      const result = await removeRoutine({ workOrderDayServiceId });
      if (result.orphanedCount > 0) {
        setError(`Rutina removida. ${result.orphanedCount} instancia(s) de tarea marcada(s) como huérfana(s).`);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to remove routine";
      setError(errorMessage);
    }
  };

  const assignedUserIds = new Set(assignments?.map((a) => a.userId) ?? []);
  const availableUsers = users.filter((u) => !assignedUserIds.has(u._id));

  const linkedServiceIds = new Set(dayRoutines?.map((r) => r.serviceId) ?? []);
  const availableServices = services.filter((s) => !linkedServiceIds.has(s._id));

  const standaloneTaskIds = new Set(standaloneTasks?.map((t) => t.taskTemplateId) ?? []);
  const availableTaskTemplates = taskTemplates.filter((t) => !standaloneTaskIds.has(t._id));

  const handleAddStandaloneTask = async () => {
    if (!selectedTask) return;
    setError("");
    try {
      await addStandaloneTask({ workOrderDayId: day._id, taskTemplateId: selectedTask });
      setSelectedTask("");
      setShowAddTask(false);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to add task";
      setError(errorMessage);
    }
  };

  const handleRemoveStandaloneTask = async (workOrderDayTaskTemplateId: Id<"workOrderDayTaskTemplates">) => {
    setError("");
    try {
      await removeStandaloneTask({ workOrderDayTaskTemplateId });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to remove task";
      setError(errorMessage);
    }
  };

  return (
    <div className="p-2 bg-gray-100 border-2 border-black text-sm">
      <div className="flex items-center justify-between">
        <span>
          Día {day.dayNumber} - {formatUTCDate(day.dayDate, "EEE, d MMM")}
          <span className={`ml-2 text-xs px-1 py-0.5 border border-black ${day.status === "pending" ? "bg-gray-200" : day.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
            {day.status}
          </span>
          <span className="ml-2 text-xs text-gray-500">{day.taskCount} tareas</span>
          <span className={`ml-2 text-xs font-bold ${(assignments?.length ?? 0) >= requiredPeople ? "text-green-600" : "text-orange-500"}`}>
            ({assignments?.length ?? 0}/{requiredPeople} personas)
          </span>
        </span>
      </div>

      {error && (
        <div className={`text-xs mt-1 font-medium ${error.includes("huérfana") ? "text-orange-600" : "text-red-500"}`}>
          {error}
        </div>
      )}

      {assignments && assignments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {assignments.map((a) => (
            <span key={a._id} className="bg-blue-100 text-blue-700 px-2 py-0.5 border border-blue-300 text-xs flex items-center gap-1 font-medium">
              {a.userFullName ?? a.userEmail}
              <button onClick={() => handleUnassign(a.userId)} className="text-blue-500 hover:text-red-500 font-bold">×</button>
            </span>
          ))}
        </div>
      )}

      {availableUsers.length > 0 && (
        <div className="mt-2">
          {showAddUser ? (
            <div className="flex gap-2">
              <select
                value={selectedUsers[0] ?? ""}
                onChange={(e) => setSelectedUsers((prev) => ({ ...prev, [0]: e.target.value as Id<"users"> | "" }))}
                className="border-2 border-black px-2 py-1 flex-1 text-xs"
              >
                <option value="">Seleccionar usuario... ({availableUsers.length} disponibles)</option>
                {availableUsers.map((u) => (
                  <option key={u._id} value={u._id}>{u.fullName ?? u.email}</option>
                ))}
              </select>
              <button onClick={() => { handleAssign(0); setShowAddUser(false); }} className="bg-green-500 text-white px-2 py-1 text-xs font-bold border-2 border-black hover:bg-green-600" disabled={!selectedUsers[0]}>Asignar</button>
              <button onClick={() => setShowAddUser(false)} className="text-gray-500 px-2 py-1 text-xs font-bold">Cancelar</button>
            </div>
          ) : (
            <button onClick={() => setShowAddUser(true)} className="text-blue-500 text-xs font-bold">+ Agregar persona</button>
          )}
        </div>
      )}

      <div className="mt-3 border-t-2 border-black pt-2">
        <div className="text-xs font-bold text-gray-700 mb-2">
          RUTINAS ({dayRoutines?.length ?? 0}):
        </div>
        {dayRoutines && dayRoutines.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {dayRoutines.map((routine) => (
              <RoutineCard
                key={routine._id}
                routine={routine}
                onRemove={handleRemoveRoutine}
              />
            ))}
          </div>
        )}
        {availableServices.length > 0 && (
          <div>
            {showAddRoutine ? (
              <div className="flex gap-2">
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value as Id<"services"> | "")}
                  className="border-2 border-black px-2 py-1 flex-1 text-xs"
                >
                  <option value="">Seleccionar rutina... ({availableServices.length} disponibles)</option>
                  {availableServices.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddRoutine}
                  className="bg-black text-white px-2 py-1 text-xs font-bold border-2 border-black hover:bg-gray-800"
                  disabled={!selectedService}
                >
                  Agregar
                </button>
                <button onClick={() => setShowAddRoutine(false)} className="text-gray-500 px-2 py-1 text-xs font-bold">Cancelar</button>
              </div>
            ) : (
              <button onClick={() => setShowAddRoutine(true)} className="text-gray-600 text-xs font-bold">+ Agregar Rutina</button>
            )}
          </div>
        )}
        {dayRoutines?.length === 0 && availableServices.length === 0 && (
          <div className="text-xs text-gray-400 italic">No hay rutinas disponibles</div>
        )}
      </div>

      <div className="mt-3 border-t-2 border-black pt-2">
        <div className="text-xs font-bold text-gray-700 mb-2">
          TAREAS INDEPENDIENTES ({standaloneTasks?.length ?? 0}):
        </div>
        {standaloneTasks && standaloneTasks.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {standaloneTasks.map((task) => (
              <div key={task._id} className="bg-white border-2 border-black px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{task.taskTemplateName}</span>
                  <button
                    onClick={() => handleRemoveStandaloneTask(task._id)}
                    className="text-gray-400 hover:text-red-500 font-bold ml-2"
                    title="Quitar tarea"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {availableTaskTemplates.length > 0 && (
          <div>
            {showAddTask ? (
              <div className="flex gap-2">
                <select
                  value={selectedTask}
                  onChange={(e) => setSelectedTask(e.target.value as Id<"taskTemplates"> | "")}
                  className="border-2 border-black px-2 py-1 flex-1 text-xs"
                >
                  <option value="">Seleccionar tarea... ({availableTaskTemplates.length} disponibles)</option>
                  {availableTaskTemplates.map((t) => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddStandaloneTask}
                  className="bg-black text-white px-2 py-1 text-xs font-bold border-2 border-black hover:bg-gray-800"
                  disabled={!selectedTask}
                >
                  Agregar
                </button>
                <button onClick={() => setShowAddTask(false)} className="text-gray-500 px-2 py-1 text-xs font-bold">Cancelar</button>
              </div>
            ) : (
              <button onClick={() => setShowAddTask(true)} className="text-gray-600 text-xs font-bold">+ Agregar Tarea</button>
            )}
          </div>
        )}
        {standaloneTasks?.length === 0 && availableTaskTemplates.length === 0 && (
          <div className="text-xs text-gray-400 italic">No hay tareas disponibles</div>
        )}
      </div>

      {taskInstances && taskInstances.length > 0 && (() => {
        const regularInstances = taskInstances.filter((ti) => !ti.isOrphaned);
        const orphanedInstances = taskInstances.filter((ti) => ti.isOrphaned);

        return (
          <>
            {regularInstances.length > 0 && (
              <div className="mt-3 border-t-2 border-black pt-2">
                <div className="text-xs font-bold text-gray-600 mb-1">Instancias de Tareas ({regularInstances.length}):</div>
                <div className="space-y-1">
                  {regularInstances.map((ti) => (
                    <div key={ti._id} className="bg-white border-2 border-black">
                      <div
                        className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedInstance(expandedInstance === ti._id ? null : ti._id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${ti.status === "completed" ? "bg-green-500" : "bg-yellow-500"}`} />
                          <span className="font-bold">{ti.taskTemplateName}</span>
                          <span className="text-gray-400">({ti.responseCount}/{ti.fieldCount} campos)</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{ti.status}</span>
                          <span className="font-bold">{expandedInstance === ti._id ? "▼" : "▶"}</span>
                        </div>
                      </div>
                      {expandedInstance === ti._id && (
                        <TaskInstanceDetails instanceId={ti._id} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {orphanedInstances.length > 0 && (
              <div className="mt-3 border-t-2 border-orange-400 pt-2">
                <div className="text-xs font-bold text-orange-600 mb-1 flex items-center gap-1">
                  <span>⚠️</span> TAREAS HUÉRFANAS ({orphanedInstances.length}):
                </div>
                <div className="text-xs text-orange-500 mb-2 italic">Estas tareas pertenecían a una rutina que fue removida. Solo lectura.</div>
                <div className="space-y-1">
                  {orphanedInstances.map((ti) => (
                    <div key={ti._id} className="bg-orange-50 border-2 border-orange-300">
                      <div
                        className="flex items-center justify-between p-2 cursor-pointer hover:bg-orange-100"
                        onClick={() => setExpandedInstance(expandedInstance === ti._id ? null : ti._id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-orange-500">⚠️</span>
                          <span className="font-bold text-orange-700">{ti.taskTemplateName}</span>
                          <span className="text-orange-400">({ti.responseCount}/{ti.fieldCount} campos)</span>
                          <span className="bg-orange-200 text-orange-700 text-xs px-1 py-0.5 border border-orange-400">solo lectura</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-orange-500">
                          <span>{ti.status}</span>
                          {ti.orphanedAt && <span className="text-orange-400">| huérfana desde {new Date(ti.orphanedAt).toLocaleDateString()}</span>}
                          <span className="font-bold">{expandedInstance === ti._id ? "▼" : "▶"}</span>
                        </div>
                      </div>
                      {expandedInstance === ti._id && (
                        <TaskInstanceDetails instanceId={ti._id} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

export function WorkOrdersTab() {
  const workOrders = useQuery(api.admin.workOrders.list);
  const customers = useQuery(api.admin.customers.list);
  const faenas = useQuery(api.admin.faenas.list);
  const services = useQuery(api.admin.services.listActive);
  const users = useQuery(api.shared.users.list);
  const createFromService = useMutation(api.admin.workOrders.createFromService);
  const removeWorkOrder = useMutation(api.admin.workOrders.remove);
  const updateStatus = useMutation(api.admin.workOrders.updateStatus);
  const taskTemplates = useQuery(api.admin.taskTemplates.list);
  const assign = useMutation(api.admin.assignments.assign);
  const unassign = useMutation(api.admin.assignments.unassign);
  const addRoutine = useMutation(api.admin.workOrderDayServices.addService);
  const removeRoutine = useMutation(api.admin.workOrderDayServices.removeService);
  const addStandaloneTask = useMutation(api.admin.workOrderDays.addTaskTemplate);
  const removeStandaloneTask = useMutation(api.admin.workOrderDays.removeStandaloneTask);

  const [selectedCustomer, setSelectedCustomer] = useState<Id<"customers"> | "">("");
  const [selectedFaena, setSelectedFaena] = useState<Id<"faenas"> | "">("");
  const [selectedService, setSelectedService] = useState<Id<"services"> | "">("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [requiredPeoplePerDay, setRequiredPeoplePerDay] = useState(1);
  const [expandedWO, setExpandedWO] = useState<Id<"workOrders"> | null>(null);

  const woDetails = useQuery(api.admin.workOrders.getWithDetails, expandedWO ? { id: expandedWO } : "skip");

  const customerFaenas = faenas?.filter((f) => f.customerId === selectedCustomer) ?? [];

  const handleCreate = async () => {
    if (!selectedCustomer || !selectedFaena || !selectedService) return;
    await createFromService({
      serviceId: selectedService,
      customerId: selectedCustomer,
      faenaId: selectedFaena,
      startDate: dateStringToUTCMidnight(startDate),
      endDate: dateStringToUTCMidnight(endDate),
      requiredPeoplePerDay,
    });
    setSelectedCustomer("");
    setSelectedFaena("");
    setSelectedService("");
    setRequiredPeoplePerDay(1);
  };

  const getCustomerName = (customerId: Id<"customers">) => customers?.find((c) => c._id === customerId)?.name ?? "?";
  const getFaenaName = (faenaId: Id<"faenas">) => faenas?.find((f) => f._id === faenaId)?.name ?? "?";

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Órdenes de Trabajo ({workOrders?.length ?? 0})</h3>
      <div className="text-xs text-gray-500 mb-2 font-medium">Usuarios disponibles: {users?.length ?? 0}</div>
      <div className="grid grid-cols-7 gap-2">
        <select value={selectedCustomer} onChange={(e) => { setSelectedCustomer(e.target.value as Id<"customers"> | ""); setSelectedFaena(""); }} className="border-2 border-black px-2 py-2 text-sm">
          <option value="">Cliente...</option>
          {customers?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select value={selectedFaena} onChange={(e) => setSelectedFaena(e.target.value as Id<"faenas"> | "")} className="border-2 border-black px-2 py-2 text-sm" disabled={!selectedCustomer}>
          <option value="">Faena...</option>
          {customerFaenas.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
        </select>
        <select value={selectedService} onChange={(e) => setSelectedService(e.target.value as Id<"services"> | "")} className="border-2 border-black px-2 py-2 text-sm">
          <option value="">Rutina...</option>
          {services?.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border-2 border-black px-2 py-2 text-sm" />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border-2 border-black px-2 py-2 text-sm" />
        <input type="number" value={requiredPeoplePerDay} onChange={(e) => setRequiredPeoplePerDay(Math.max(1, parseInt(e.target.value) || 1))} min={1} className="border-2 border-black px-2 py-2 text-sm" placeholder="Personas" title="Personas por día" />
        <button onClick={handleCreate} className="bg-blue-500 text-white px-4 py-2 text-sm font-bold border-2 border-black hover:bg-blue-600" disabled={!selectedCustomer || !selectedFaena || !selectedService}>Crear</button>
      </div>
      <div className="space-y-2">
        {workOrders?.map((wo) => (
          <div key={wo._id} className="border-2 border-black overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer" onClick={() => setExpandedWO(expandedWO === wo._id ? null : wo._id)}>
              <div>
                <span className="font-bold">{wo.name}</span>
                <span className="text-gray-500 ml-2">({getCustomerName(wo.customerId)} / {getFaenaName(wo.faenaId)})</span>
                <span className={`ml-2 text-xs px-2 py-0.5 border border-black ${wo.status === "draft" ? "bg-yellow-100 text-yellow-700" : wo.status === "in_progress" ? "bg-blue-100 text-blue-700" : wo.status === "completed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                  {wo.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {wo.status === "draft" && <button onClick={(e) => { e.stopPropagation(); updateStatus({ id: wo._id, status: "scheduled" }); }} className="text-blue-500 text-sm font-bold">Programar</button>}
                {wo.status === "scheduled" && <button onClick={(e) => { e.stopPropagation(); updateStatus({ id: wo._id, status: "in_progress" }); }} className="text-blue-500 text-sm font-bold">Iniciar</button>}
                {wo.status === "in_progress" && <button onClick={(e) => { e.stopPropagation(); updateStatus({ id: wo._id, status: "completed" }); }} className="text-green-500 text-sm font-bold">Completar</button>}
                <button onClick={(e) => { e.stopPropagation(); removeWorkOrder({ id: wo._id }); }} className="text-red-500 text-sm font-bold">Eliminar</button>
                <span className="text-gray-400 font-bold">{expandedWO === wo._id ? "▼" : "▶"}</span>
              </div>
            </div>
            {expandedWO === wo._id && woDetails && (
              <div className="p-3 bg-white border-t-2 border-black space-y-3">
                <div className="text-sm text-gray-600">
                  Customer: {woDetails.customer.name} | Faena: {woDetails.faena.name}
                  {woDetails.service && <span> | Rutina inicial: {woDetails.service.name}</span>}
                </div>
                <div className="text-sm font-bold text-gray-700">Días:</div>
                {woDetails.days.map((day) => (
                  <DayRow
                    key={day._id}
                    day={day}
                    users={users ?? []}
                    services={services ?? []}
                    taskTemplates={taskTemplates?.filter(t => t.isActive) ?? []}
                    assign={assign}
                    unassign={unassign}
                    addRoutine={addRoutine}
                    removeRoutine={removeRoutine}
                    addStandaloneTask={addStandaloneTask}
                    removeStandaloneTask={removeStandaloneTask}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
