"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

export function ServicesTab() {
  const services = useQuery(api.admin.services.list);
  const templates = useQuery(api.admin.taskTemplates.listActive);
  const createService = useMutation(api.admin.services.create);
  const removeService = useMutation(api.admin.services.remove);
  const addTaskTemplate = useMutation(api.admin.services.addTaskTemplate);
  const removeTaskTemplate = useMutation(api.admin.services.removeTaskTemplate);

  const [name, setName] = useState("");
  const [defaultDays, setDefaultDays] = useState("3");
  const [requiredPeople, setRequiredPeople] = useState("1");
  const [expandedService, setExpandedService] = useState<Id<"services"> | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Id<"taskTemplates"> | "">("");
  const [selectedDayNumber, setSelectedDayNumber] = useState<string>("all");

  const serviceWithTemplates = useQuery(api.admin.services.getWithTaskTemplates, expandedService ? { id: expandedService } : "skip");
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
      <h3 className="text-lg font-bold">Servicios ({services?.length ?? 0})</h3>
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del Servicio *" className="border-2 border-black px-3 py-2 flex-1" />
        <input type="number" value={defaultDays} onChange={(e) => setDefaultDays(e.target.value)} placeholder="Días" className="border-2 border-black px-3 py-2 w-20" min="1" />
        <input type="number" value={requiredPeople} onChange={(e) => setRequiredPeople(e.target.value)} placeholder="Personas" className="border-2 border-black px-3 py-2 w-20" min="1" />
        <button onClick={handleCreate} className="bg-blue-500 text-white px-4 py-2 font-bold border-2 border-black hover:bg-blue-600">Agregar</button>
      </div>
      <div className="space-y-2">
        {services?.map((s) => (
          <div key={s._id} className="border-2 border-black overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer" onClick={() => setExpandedService(expandedService === s._id ? null : s._id)}>
              <div>
                <span className="font-bold">{s.name}</span>
                <span className="text-gray-500 ml-2">{s.defaultDays} días, {s.requiredPeople} personas/día</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 font-bold">{expandedService === s._id ? "▼" : "▶"}</span>
                <button onClick={(e) => { e.stopPropagation(); removeService({ id: s._id }); }} className="text-red-500 text-sm font-bold hover:text-red-700">Eliminar</button>
              </div>
            </div>
            {expandedService === s._id && serviceWithTemplates && (
              <div className="p-3 bg-white border-t-2 border-black space-y-3">
                <div className="text-sm font-bold text-gray-700">Plantillas de Tareas Vinculadas:</div>
                {serviceWithTemplates.taskTemplates.length === 0 ? (
                  <div className="text-gray-500 text-sm">Sin plantillas vinculadas aún</div>
                ) : (
                  serviceWithTemplates.taskTemplates.map((tt) => (
                    <div key={tt._id} className="flex items-center justify-between p-2 bg-gray-100 border-2 border-black text-sm">
                      <span>
                        {tt.taskTemplateName}
                        {tt.isRequired && <span className="text-red-500 ml-1">*</span>}
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 border border-blue-300">
                          {tt.dayNumber ? `Solo día ${tt.dayNumber}` : "Todos los días"}
                        </span>
                      </span>
                      <button onClick={() => removeTaskTemplate({ serviceId: s._id, taskTemplateId: tt.taskTemplateId })} className="text-red-500 font-bold">×</button>
                    </div>
                  ))
                )}
                <div className="flex gap-2 items-center">
                  <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value as Id<"taskTemplates"> | "")} className="border-2 border-black px-2 py-1 flex-1 text-sm">
                    <option value="">Seleccionar plantilla...</option>
                    {templates?.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                  <select value={selectedDayNumber} onChange={(e) => setSelectedDayNumber(e.target.value)} className="border-2 border-black px-2 py-1 text-sm">
                    <option value="all">Todos los días</option>
                    {currentService && Array.from({ length: currentService.defaultDays }, (_, i) => (
                      <option key={i + 1} value={String(i + 1)}>Solo día {i + 1}</option>
                    ))}
                  </select>
                  <button onClick={handleAddTemplate} className="bg-green-500 text-white px-3 py-1 text-sm font-bold border-2 border-black hover:bg-green-600" disabled={!selectedTemplate}>Vincular</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
