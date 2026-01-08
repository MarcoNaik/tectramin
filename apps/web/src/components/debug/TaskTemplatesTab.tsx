"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

export function TaskTemplatesTab() {
  const templates = useQuery(api.admin.taskTemplates.list);
  const createTemplate = useMutation(api.admin.taskTemplates.create);
  const removeTemplate = useMutation(api.admin.taskTemplates.remove);
  const createField = useMutation(api.admin.fieldTemplates.create);
  const removeField = useMutation(api.admin.fieldTemplates.remove);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [readme, setReadme] = useState("");
  const [isRepeatable, setIsRepeatable] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<Id<"taskTemplates"> | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  const templateWithFields = useQuery(api.admin.taskTemplates.getWithFields, expandedTemplate ? { id: expandedTemplate } : "skip");

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createTemplate({ name, category: category || undefined, readme: readme || undefined, isRepeatable });
    setName("");
    setCategory("");
    setReadme("");
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
      <h3 className="text-lg font-bold">Plantillas de Tareas ({templates?.length ?? 0})</h3>
      <div className="flex gap-2 items-center flex-wrap">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de Plantilla *" className="border-2 border-black px-3 py-2 flex-1" />
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Categoría" className="border-2 border-black px-3 py-2 w-32" />
        <label className="flex items-center gap-1 text-sm font-medium">
          <input type="checkbox" checked={isRepeatable} onChange={(e) => setIsRepeatable(e.target.checked)} />
          Repetible
        </label>
        <button onClick={handleCreate} className="bg-blue-500 text-white px-4 py-2 font-bold border-2 border-black hover:bg-blue-600">Agregar</button>
      </div>
      <div className="flex gap-2 items-start">
        <textarea value={readme} onChange={(e) => setReadme(e.target.value)} placeholder="Readme (instrucciones detalladas)" className="border-2 border-black px-3 py-2 flex-1" rows={2} />
      </div>
      <div className="space-y-2">
        {templates?.map((t) => (
          <div key={t._id} className="border-2 border-black overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer" onClick={() => setExpandedTemplate(expandedTemplate === t._id ? null : t._id)}>
              <div>
                <span className="font-bold">{t.name}</span>
                {t.category && <span className="text-gray-500 ml-2">[{t.category}]</span>}
                {t.isRepeatable && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 border border-purple-300">Repetible</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 font-bold">{expandedTemplate === t._id ? "▼" : "▶"}</span>
                <button onClick={(e) => { e.stopPropagation(); removeTemplate({ id: t._id }); }} className="text-red-500 text-sm font-bold hover:text-red-700">Eliminar</button>
              </div>
            </div>
            {expandedTemplate === t._id && templateWithFields && (
              <div className="p-3 bg-white border-t-2 border-black space-y-3">
                {t.readme && (
                  <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded border border-gray-200">
                    <span className="font-medium">Readme:</span> {t.readme}
                  </div>
                )}
                <div className="text-sm font-bold text-gray-700">Campos:</div>
                {templateWithFields.fields.map((f) => (
                  <div key={f._id} className="flex items-center justify-between p-2 bg-gray-100 border-2 border-black text-sm">
                    <span>
                      {f.label} <span className="text-gray-500">({f.fieldType})</span>
                      {f.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </span>
                    <button onClick={() => removeField({ id: f._id })} className="text-red-500 font-bold">×</button>
                  </div>
                ))}
                <div className="flex gap-2 items-center">
                  <input value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} placeholder="Etiqueta del Campo" className="border-2 border-black px-2 py-1 flex-1 text-sm" />
                  <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)} className="border-2 border-black px-2 py-1 text-sm">
                    <option value="text">Texto</option>
                    <option value="number">Número</option>
                    <option value="boolean">Booleano</option>
                    <option value="date">Fecha</option>
                    <option value="attachment">Adjunto</option>
                  </select>
                  <label className="flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={newFieldRequired} onChange={(e) => setNewFieldRequired(e.target.checked)} />
                    Requerido
                  </label>
                  <button onClick={handleAddField} className="bg-green-500 text-white px-3 py-1 text-sm font-bold border-2 border-black hover:bg-green-600">Agregar Campo</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
