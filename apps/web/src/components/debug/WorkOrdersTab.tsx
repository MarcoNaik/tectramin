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

function DayRow({ day, users, assign, unassign }: {
  day: { _id: Id<"workOrderDays">; dayDate: number; dayNumber: number; status: string; requiredPeople?: number; assignmentCount: number; taskCount: number };
  users: Array<{ _id: Id<"users">; fullName?: string; email: string; clerkId: string }>;
  assign: ReturnType<typeof useMutation>;
  unassign: ReturnType<typeof useMutation>;
}) {
  const requiredPeople = day.requiredPeople ?? 1;
  const assignments = useQuery(api.admin.assignments.listByWorkOrderDay, { workOrderDayId: day._id });
  const taskInstances = useQuery(api.admin.taskInstances.listByWorkOrderDay, { workOrderDayId: day._id });
  const [selectedUsers, setSelectedUsers] = useState<Record<number, Id<"users"> | "">>({});
  const [error, setError] = useState("");
  const [expandedInstance, setExpandedInstance] = useState<Id<"taskInstances"> | null>(null);

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

  const assignedUserIds = new Set(assignments?.map((a) => a.userId) ?? []);
  const availableUsers = users.filter((u) => !assignedUserIds.has(u._id));
  const [showAddUser, setShowAddUser] = useState(false);

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
      {error && <div className="text-red-500 text-xs mt-1 font-medium">{error}</div>}
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
      {taskInstances && taskInstances.length > 0 && (
        <div className="mt-3 border-t-2 border-black pt-2">
          <div className="text-xs font-bold text-gray-600 mb-1">Instancias de Tareas ({taskInstances.length}):</div>
          <div className="space-y-1">
            {taskInstances.map((ti) => (
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
  const assign = useMutation(api.admin.assignments.assign);
  const unassign = useMutation(api.admin.assignments.unassign);

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
                  {woDetails.service && <span> | Rutina: {woDetails.service.name}</span>}
                </div>
                <div className="text-sm font-bold text-gray-700">Días:</div>
                {woDetails.days.map((day) => (
                  <DayRow key={day._id} day={day} users={users ?? []} assign={assign} unassign={unassign} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
