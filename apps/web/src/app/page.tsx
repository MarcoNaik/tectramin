"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

type Tab = "customers" | "faenas" | "services" | "taskTemplates" | "workOrders" | "users";

function TabButton({ tab, active, onClick, children }: { tab: Tab; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg ${active ? "bg-white text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-900"}`}
    >
      {children}
    </button>
  );
}

function CustomersTab() {
  const customers = useQuery(api.customers.list);
  const createCustomer = useMutation(api.customers.create);
  const removeCustomer = useMutation(api.customers.remove);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createCustomer({ name, email: email || undefined });
    setName("");
    setEmail("");
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Customers ({customers?.length ?? 0})</h3>
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name *" className="border px-3 py-2 rounded flex-1" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="border px-3 py-2 rounded flex-1" />
        <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded">Add</button>
      </div>
      <div className="space-y-2">
        {customers?.map((c) => (
          <div key={c._id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <span className="font-medium">{c.name}</span>
              {c.email && <span className="text-gray-500 ml-2">({c.email})</span>}
              <span className="text-xs text-gray-400 ml-2">{c._id}</span>
            </div>
            <button onClick={() => removeCustomer({ id: c._id })} className="text-red-500 text-sm">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaenasTab() {
  const customers = useQuery(api.customers.list);
  const allFaenas = useQuery(api.faenas.list);
  const createFaena = useMutation(api.faenas.create);
  const removeFaena = useMutation(api.faenas.remove);
  const [selectedCustomerId, setSelectedCustomerId] = useState<Id<"customers"> | "">("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  const handleCreate = async () => {
    if (!name.trim() || selectedCustomerId === "") return;
    await createFaena({ customerId: selectedCustomerId, name, location: location || undefined });
    setName("");
    setLocation("");
  };

  const getCustomerName = (customerId: Id<"customers">) => {
    return customers?.find((c) => c._id === customerId)?.name ?? "Unknown";
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Faenas ({allFaenas?.length ?? 0})</h3>
      <div className="flex gap-2">
        <select
          value={selectedCustomerId}
          onChange={(e) => setSelectedCustomerId(e.target.value as Id<"customers"> | "")}
          className="border px-3 py-2 rounded"
        >
          <option value="">Select customer...</option>
          {customers?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Faena Name *" className="border px-3 py-2 rounded flex-1" />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="border px-3 py-2 rounded flex-1" />
        <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded" disabled={!selectedCustomerId}>Add</button>
      </div>
      <div className="space-y-2">
        {allFaenas?.map((f) => (
          <div key={f._id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <span className="font-medium">{f.name}</span>
              <span className="text-gray-500 ml-2">@ {getCustomerName(f.customerId)}</span>
              {f.location && <span className="text-gray-400 ml-2">({f.location})</span>}
              <span className={`ml-2 text-xs px-2 py-0.5 rounded ${f.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {f.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <button onClick={() => removeFaena({ id: f._id })} className="text-red-500 text-sm">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskTemplatesTab() {
  const templates = useQuery(api.taskTemplates.list);
  const createTemplate = useMutation(api.taskTemplates.create);
  const removeTemplate = useMutation(api.taskTemplates.remove);
  const createField = useMutation(api.fieldTemplates.create);
  const removeField = useMutation(api.fieldTemplates.remove);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [isRepeatable, setIsRepeatable] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<Id<"taskTemplates"> | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  const templateWithFields = useQuery(api.taskTemplates.getWithFields, expandedTemplate ? { id: expandedTemplate } : "skip");

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createTemplate({ name, category: category || undefined, isRepeatable });
    setName("");
    setCategory("");
    setIsRepeatable(false);
  };

  const handleAddField = async () => {
    if (!newFieldLabel.trim() || !expandedTemplate) return;
    await createField({
      taskTemplateId: expandedTemplate,
      label: newFieldLabel,
      fieldType: newFieldType,
      isRequired: newFieldRequired,
    });
    setNewFieldLabel("");
    setNewFieldType("text");
    setNewFieldRequired(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Task Templates ({templates?.length ?? 0})</h3>
      <div className="flex gap-2 items-center">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template Name *" className="border px-3 py-2 rounded flex-1" />
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="border px-3 py-2 rounded w-32" />
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={isRepeatable} onChange={(e) => setIsRepeatable(e.target.checked)} />
          Repeatable
        </label>
        <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded">Add</button>
      </div>
      <div className="space-y-2">
        {templates?.map((t) => (
          <div key={t._id} className="border rounded overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer" onClick={() => setExpandedTemplate(expandedTemplate === t._id ? null : t._id)}>
              <div>
                <span className="font-medium">{t.name}</span>
                {t.category && <span className="text-gray-500 ml-2">[{t.category}]</span>}
                {t.isRepeatable && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Repeatable</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{expandedTemplate === t._id ? "▼" : "▶"}</span>
                <button onClick={(e) => { e.stopPropagation(); removeTemplate({ id: t._id }); }} className="text-red-500 text-sm">Delete</button>
              </div>
            </div>
            {expandedTemplate === t._id && templateWithFields && (
              <div className="p-3 bg-white border-t space-y-3">
                <div className="text-sm font-medium text-gray-700">Fields:</div>
                {templateWithFields.fields.map((f) => (
                  <div key={f._id} className="flex items-center justify-between p-2 bg-gray-100 rounded text-sm">
                    <span>
                      {f.label} <span className="text-gray-500">({f.fieldType})</span>
                      {f.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </span>
                    <button onClick={() => removeField({ id: f._id })} className="text-red-500">×</button>
                  </div>
                ))}
                <div className="flex gap-2 items-center">
                  <input value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} placeholder="Field Label" className="border px-2 py-1 rounded flex-1 text-sm" />
                  <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)} className="border px-2 py-1 rounded text-sm">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="date">Date</option>
                  </select>
                  <label className="flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={newFieldRequired} onChange={(e) => setNewFieldRequired(e.target.checked)} />
                    Required
                  </label>
                  <button onClick={handleAddField} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Add Field</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ServicesTab() {
  const services = useQuery(api.services.list);
  const templates = useQuery(api.taskTemplates.listActive);
  const createService = useMutation(api.services.create);
  const removeService = useMutation(api.services.remove);
  const addTaskTemplate = useMutation(api.services.addTaskTemplate);
  const removeTaskTemplate = useMutation(api.services.removeTaskTemplate);

  const [name, setName] = useState("");
  const [defaultDays, setDefaultDays] = useState("3");
  const [requiredPeople, setRequiredPeople] = useState("1");
  const [expandedService, setExpandedService] = useState<Id<"services"> | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Id<"taskTemplates"> | "">("");
  const [selectedDayNumber, setSelectedDayNumber] = useState<string>("all");

  const serviceWithTemplates = useQuery(api.services.getWithTaskTemplates, expandedService ? { id: expandedService } : "skip");
  const currentService = services?.find((s) => s._id === expandedService);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createService({ name, defaultDays: parseInt(defaultDays) || 3, requiredPeople: parseInt(requiredPeople) || 1 });
    setName("");
    setDefaultDays("3");
    setRequiredPeople("1");
  };

  const handleAddTemplate = async () => {
    if (!selectedTemplate || !expandedService) return;
    const order = (serviceWithTemplates?.taskTemplates.length ?? 0);
    const dayNumber = selectedDayNumber === "all" ? undefined : parseInt(selectedDayNumber);
    await addTaskTemplate({ serviceId: expandedService, taskTemplateId: selectedTemplate, order, isRequired: true, dayNumber });
    setSelectedTemplate("");
    setSelectedDayNumber("all");
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Services ({services?.length ?? 0})</h3>
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Service Name *" className="border px-3 py-2 rounded flex-1" />
        <input type="number" value={defaultDays} onChange={(e) => setDefaultDays(e.target.value)} placeholder="Days" className="border px-3 py-2 rounded w-20" min="1" />
        <input type="number" value={requiredPeople} onChange={(e) => setRequiredPeople(e.target.value)} placeholder="People" className="border px-3 py-2 rounded w-20" min="1" />
        <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded">Add</button>
      </div>
      <div className="space-y-2">
        {services?.map((s) => (
          <div key={s._id} className="border rounded overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer" onClick={() => setExpandedService(expandedService === s._id ? null : s._id)}>
              <div>
                <span className="font-medium">{s.name}</span>
                <span className="text-gray-500 ml-2">{s.defaultDays} days, {s.requiredPeople} people/day</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{expandedService === s._id ? "▼" : "▶"}</span>
                <button onClick={(e) => { e.stopPropagation(); removeService({ id: s._id }); }} className="text-red-500 text-sm">Delete</button>
              </div>
            </div>
            {expandedService === s._id && serviceWithTemplates && (
              <div className="p-3 bg-white border-t space-y-3">
                <div className="text-sm font-medium text-gray-700">Linked Task Templates:</div>
                {serviceWithTemplates.taskTemplates.length === 0 ? (
                  <div className="text-gray-500 text-sm">No templates linked yet</div>
                ) : (
                  serviceWithTemplates.taskTemplates.map((tt) => (
                    <div key={tt._id} className="flex items-center justify-between p-2 bg-gray-100 rounded text-sm">
                      <span>
                        {tt.taskTemplateName}
                        {tt.isRequired && <span className="text-red-500 ml-1">*</span>}
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {tt.dayNumber ? `Day ${tt.dayNumber} only` : "All days"}
                        </span>
                      </span>
                      <button onClick={() => removeTaskTemplate({ serviceId: s._id, taskTemplateId: tt.taskTemplateId })} className="text-red-500">×</button>
                    </div>
                  ))
                )}
                <div className="flex gap-2 items-center">
                  <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value as Id<"taskTemplates"> | "")} className="border px-2 py-1 rounded flex-1 text-sm">
                    <option value="">Select template...</option>
                    {templates?.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                  <select value={selectedDayNumber} onChange={(e) => setSelectedDayNumber(e.target.value)} className="border px-2 py-1 rounded text-sm">
                    <option value="all">All days</option>
                    {currentService && Array.from({ length: currentService.defaultDays }, (_, i) => (
                      <option key={i + 1} value={String(i + 1)}>Day {i + 1} only</option>
                    ))}
                  </select>
                  <button onClick={handleAddTemplate} className="bg-green-600 text-white px-3 py-1 rounded text-sm" disabled={!selectedTemplate}>Link</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkOrdersTab() {
  const workOrders = useQuery(api.workOrders.list);
  const customers = useQuery(api.customers.list);
  const faenas = useQuery(api.faenas.list);
  const services = useQuery(api.services.listActive);
  const users = useQuery(api.users.list);
  const createFromService = useMutation(api.workOrders.createFromService);
  const removeWorkOrder = useMutation(api.workOrders.remove);
  const updateStatus = useMutation(api.workOrders.updateStatus);
  const assign = useMutation(api.assignments.assign);
  const unassign = useMutation(api.assignments.unassign);

  const [selectedCustomer, setSelectedCustomer] = useState<Id<"customers"> | "">("");
  const [selectedFaena, setSelectedFaena] = useState<Id<"faenas"> | "">("");
  const [selectedService, setSelectedService] = useState<Id<"services"> | "">("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [expandedWO, setExpandedWO] = useState<Id<"workOrders"> | null>(null);

  const woDetails = useQuery(api.workOrders.getWithDetails, expandedWO ? { id: expandedWO } : "skip");

  const customerFaenas = faenas?.filter((f) => f.customerId === selectedCustomer) ?? [];

  const handleCreate = async () => {
    if (!selectedCustomer || !selectedFaena || !selectedService) return;
    await createFromService({
      serviceId: selectedService,
      customerId: selectedCustomer,
      faenaId: selectedFaena,
      startDate: new Date(startDate).getTime(),
    });
    setSelectedCustomer("");
    setSelectedFaena("");
    setSelectedService("");
  };

  const getCustomerName = (customerId: Id<"customers">) => customers?.find((c) => c._id === customerId)?.name ?? "?";
  const getFaenaName = (faenaId: Id<"faenas">) => faenas?.find((f) => f._id === faenaId)?.name ?? "?";

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Work Orders ({workOrders?.length ?? 0})</h3>
      <div className="text-xs text-gray-500 mb-2">Users available: {users?.length ?? 0}</div>
      <div className="grid grid-cols-5 gap-2">
        <select value={selectedCustomer} onChange={(e) => { setSelectedCustomer(e.target.value as Id<"customers"> | ""); setSelectedFaena(""); }} className="border px-2 py-2 rounded text-sm">
          <option value="">Customer...</option>
          {customers?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select value={selectedFaena} onChange={(e) => setSelectedFaena(e.target.value as Id<"faenas"> | "")} className="border px-2 py-2 rounded text-sm" disabled={!selectedCustomer}>
          <option value="">Faena...</option>
          {customerFaenas.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
        </select>
        <select value={selectedService} onChange={(e) => setSelectedService(e.target.value as Id<"services"> | "")} className="border px-2 py-2 rounded text-sm">
          <option value="">Service...</option>
          {services?.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border px-2 py-2 rounded text-sm" />
        <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded text-sm" disabled={!selectedCustomer || !selectedFaena || !selectedService}>Create</button>
      </div>
      <div className="space-y-2">
        {workOrders?.map((wo) => (
          <div key={wo._id} className="border rounded overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer" onClick={() => setExpandedWO(expandedWO === wo._id ? null : wo._id)}>
              <div>
                <span className="font-medium">{wo.name}</span>
                <span className="text-gray-500 ml-2">({getCustomerName(wo.customerId)} / {getFaenaName(wo.faenaId)})</span>
                <span className={`ml-2 text-xs px-2 py-0.5 rounded ${wo.status === "draft" ? "bg-yellow-100 text-yellow-700" : wo.status === "in_progress" ? "bg-blue-100 text-blue-700" : wo.status === "completed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                  {wo.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {wo.status === "draft" && <button onClick={(e) => { e.stopPropagation(); updateStatus({ id: wo._id, status: "scheduled" }); }} className="text-blue-500 text-sm">Schedule</button>}
                {wo.status === "scheduled" && <button onClick={(e) => { e.stopPropagation(); updateStatus({ id: wo._id, status: "in_progress" }); }} className="text-blue-500 text-sm">Start</button>}
                {wo.status === "in_progress" && <button onClick={(e) => { e.stopPropagation(); updateStatus({ id: wo._id, status: "completed" }); }} className="text-green-500 text-sm">Complete</button>}
                <button onClick={(e) => { e.stopPropagation(); removeWorkOrder({ id: wo._id }); }} className="text-red-500 text-sm">Delete</button>
                <span className="text-gray-400">{expandedWO === wo._id ? "▼" : "▶"}</span>
              </div>
            </div>
            {expandedWO === wo._id && woDetails && (
              <div className="p-3 bg-white border-t space-y-3">
                <div className="text-sm text-gray-600">
                  Customer: {woDetails.customer.name} | Faena: {woDetails.faena.name}
                  {woDetails.service && <span> | Service: {woDetails.service.name}</span>}
                </div>
                <div className="text-sm font-medium text-gray-700">Days:</div>
                {woDetails.days.map((day) => (
                  <DayRow key={day._id} day={day} users={users ?? []} assign={assign} unassign={unassign} requiredPeople={woDetails.service?.requiredPeople ?? 1} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayRow({ day, users, assign, unassign, requiredPeople }: {
  day: { _id: Id<"workOrderDays">; dayDate: number; dayNumber: number; status: string; assignmentCount: number; taskCount: number };
  users: Array<{ _id: Id<"users">; fullName?: string; email: string; clerkId: string }>;
  assign: any;
  unassign: any;
  requiredPeople: number;
}) {
  const assignments = useQuery(api.assignments.listByWorkOrderDay, { workOrderDayId: day._id });
  const taskInstances = useQuery(api.taskInstances.listByWorkOrderDay, { workOrderDayId: day._id });
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
    } catch (e: any) {
      setError(e.message || "Failed to assign");
    }
  };

  const handleUnassign = async (userId: Id<"users">) => {
    setError("");
    try {
      await unassign({ workOrderDayId: day._id, userId });
    } catch (e: any) {
      setError(e.message || "Failed to unassign");
    }
  };

  const assignedUserIds = new Set(assignments?.map((a) => a.userId) ?? []);
  const availableUsers = users.filter((u) => !assignedUserIds.has(u._id));
  const slotsNeeded = Math.max(0, requiredPeople - (assignments?.length ?? 0));

  return (
    <div className="p-2 bg-gray-100 rounded text-sm">
      <div className="flex items-center justify-between">
        <span>
          Day {day.dayNumber} - {new Date(day.dayDate).toLocaleDateString()}
          <span className={`ml-2 text-xs px-1 py-0.5 rounded ${day.status === "pending" ? "bg-gray-200" : day.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
            {day.status}
          </span>
          <span className="ml-2 text-xs text-gray-500">{day.taskCount} tasks</span>
          <span className="ml-2 text-xs text-gray-400">({assignments?.length ?? 0}/{requiredPeople} people)</span>
        </span>
      </div>
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
      {assignments && assignments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {assignments.map((a) => (
            <span key={a._id} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs flex items-center gap-1">
              {a.userFullName ?? a.userEmail}
              <button onClick={() => handleUnassign(a.userId)} className="text-blue-500 hover:text-red-500">×</button>
            </span>
          ))}
        </div>
      )}
      {slotsNeeded > 0 && (
        <div className="mt-2 space-y-1">
          {Array.from({ length: slotsNeeded }, (_, i) => (
            <div key={i} className="flex gap-2">
              <select
                value={selectedUsers[i] ?? ""}
                onChange={(e) => setSelectedUsers((prev) => ({ ...prev, [i]: e.target.value as Id<"users"> | "" }))}
                className="border px-2 py-1 rounded flex-1 text-xs"
              >
                <option value="">Person {(assignments?.length ?? 0) + i + 1} - Select user... ({availableUsers.length} available)</option>
                {availableUsers.map((u) => (
                  <option key={u._id} value={u._id}>{u.fullName ?? u.email} ({u.clerkId.slice(0, 10)}...)</option>
                ))}
              </select>
              <button onClick={() => handleAssign(i)} className="bg-green-600 text-white px-2 py-1 rounded text-xs" disabled={!selectedUsers[i]}>Assign</button>
            </div>
          ))}
        </div>
      )}
      {slotsNeeded === 0 && (assignments?.length ?? 0) >= requiredPeople && (
        <div className="mt-2 text-xs text-green-600">All {requiredPeople} people assigned</div>
      )}
      {taskInstances && taskInstances.length > 0 && (
        <div className="mt-3 border-t pt-2">
          <div className="text-xs font-medium text-gray-600 mb-1">Task Instances ({taskInstances.length}):</div>
          <div className="space-y-1">
            {taskInstances.map((ti) => (
              <div key={ti._id} className="bg-white border rounded">
                <div
                  className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedInstance(expandedInstance === ti._id ? null : ti._id)}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${ti.status === "completed" ? "bg-green-500" : "bg-yellow-500"}`} />
                    <span className="font-medium">{ti.taskTemplateName}</span>
                    <span className="text-gray-400">({ti.responseCount}/{ti.fieldCount} fields)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{ti.status}</span>
                    <span>{expandedInstance === ti._id ? "▼" : "▶"}</span>
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

function TaskInstanceDetails({ instanceId }: { instanceId: Id<"taskInstances"> }) {
  const data = useQuery(api.taskInstances.getWithResponses, { id: instanceId });

  if (!data) return <div className="p-2 text-xs text-gray-500">Loading...</div>;

  return (
    <div className="p-2 border-t bg-gray-50 text-xs space-y-1">
      <div className="text-gray-500">
        Started: {data.instance.startedAt ? new Date(data.instance.startedAt).toLocaleString() : "N/A"}
        {data.instance.completedAt && <span className="ml-2">| Completed: {new Date(data.instance.completedAt).toLocaleString()}</span>}
      </div>
      <div className="space-y-1 mt-2">
        {data.fields.map((field) => (
          <div key={field._id} className="flex justify-between items-start p-1 bg-white rounded border">
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

function UsersTab() {
  const { user } = useUser();
  const users = useQuery(api.users.list);
  const upsertFromClerk = useMutation(api.users.upsertFromClerk);
  const updateRole = useMutation(api.users.updateRole);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [testName, setTestName] = useState("");
  const [testEmail, setTestEmail] = useState("");

  const handleSyncCurrentUser = async () => {
    if (!user) return;
    setSyncStatus("syncing");
    try {
      await upsertFromClerk({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "",
        fullName: user.fullName ?? undefined,
      });
      setSyncStatus("success");
    } catch (e) {
      console.error("Sync error:", e);
      setSyncStatus("error");
    }
  };

  const handleCreateTestUser = async () => {
    if (!testEmail.trim()) return;
    const fakeClerkId = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await upsertFromClerk({
      clerkId: fakeClerkId,
      email: testEmail,
      fullName: testName || undefined,
    });
    setTestName("");
    setTestEmail("");
  };

  const alreadySynced = users?.some((u) => u.clerkId === user?.id);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Users ({users?.length ?? 0})</h3>
      <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
        <div className="text-sm font-medium text-yellow-800 mb-2">Your Clerk ID: {user?.id}</div>
        {alreadySynced ? (
          <div className="text-green-600 text-sm font-medium">You are already synced to the database</div>
        ) : (
          <button
            onClick={handleSyncCurrentUser}
            disabled={syncStatus === "syncing"}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {syncStatus === "syncing" ? "Syncing..." : "Sync Current User to Database"}
          </button>
        )}
        {syncStatus === "success" && <div className="text-green-600 text-sm mt-2">Synced successfully!</div>}
        {syncStatus === "error" && <div className="text-red-600 text-sm mt-2">Sync failed - check console</div>}
      </div>
      <div className="p-3 bg-blue-50 rounded border border-blue-200">
        <div className="text-sm font-medium text-blue-800 mb-2">Create Test User (for debugging)</div>
        <div className="flex gap-2">
          <input
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="Name"
            className="border px-3 py-2 rounded flex-1 text-sm"
          />
          <input
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Email *"
            className="border px-3 py-2 rounded flex-1 text-sm"
          />
          <button
            onClick={handleCreateTestUser}
            disabled={!testEmail.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            Add Test User
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {users?.map((u) => (
          <div key={u._id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <span className="font-medium">{u.fullName ?? u.email}</span>
              <span className="text-gray-500 ml-2">({u.email})</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded ${u.role === "admin" ? "bg-purple-100 text-purple-700" : u.role === "supervisor" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                {u.role}
              </span>
              <span className="text-xs text-gray-400 ml-2">ID: {u._id}</span>
              <span className="text-xs text-gray-400 ml-2">Clerk: {u.clerkId.slice(0, 15)}...</span>
            </div>
            <select
              value={u.role}
              onChange={(e) => updateRole({ id: u._id, role: e.target.value })}
              className="border px-2 py-1 rounded text-sm"
            >
              <option value="field_worker">Field Worker</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("customers");

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Debug Dashboard</h2>
      <div className="flex gap-1 border-b mb-4">
        <TabButton tab="customers" active={activeTab === "customers"} onClick={() => setActiveTab("customers")}>Customers</TabButton>
        <TabButton tab="faenas" active={activeTab === "faenas"} onClick={() => setActiveTab("faenas")}>Faenas</TabButton>
        <TabButton tab="taskTemplates" active={activeTab === "taskTemplates"} onClick={() => setActiveTab("taskTemplates")}>Task Templates</TabButton>
        <TabButton tab="services" active={activeTab === "services"} onClick={() => setActiveTab("services")}>Services</TabButton>
        <TabButton tab="workOrders" active={activeTab === "workOrders"} onClick={() => setActiveTab("workOrders")}>Work Orders</TabButton>
        <TabButton tab="users" active={activeTab === "users"} onClick={() => setActiveTab("users")}>Users</TabButton>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        {activeTab === "customers" && <CustomersTab />}
        {activeTab === "faenas" && <FaenasTab />}
        {activeTab === "taskTemplates" && <TaskTemplatesTab />}
        {activeTab === "services" && <ServicesTab />}
        {activeTab === "workOrders" && <WorkOrdersTab />}
        {activeTab === "users" && <UsersTab />}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100">
      <SignedOut>
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Welcome to Tectramin</h2>
            <p className="text-gray-600">Sign in to access the dashboard</p>
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <Dashboard />
      </SignedIn>
    </main>
  );
}
