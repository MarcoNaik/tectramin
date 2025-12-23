"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

type Tab = "customers" | "faenas" | "services" | "taskTemplates" | "formBuilder" | "workOrders" | "users" | "gridView";

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
  const customers = useQuery(api.admin.customers.list);
  const createCustomer = useMutation(api.admin.customers.create);
  const removeCustomer = useMutation(api.admin.customers.remove);
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
  const customers = useQuery(api.admin.customers.list);
  const allFaenas = useQuery(api.admin.faenas.list);
  const createFaena = useMutation(api.admin.faenas.create);
  const removeFaena = useMutation(api.admin.faenas.remove);
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
  const templates = useQuery(api.admin.taskTemplates.list);
  const createTemplate = useMutation(api.admin.taskTemplates.create);
  const removeTemplate = useMutation(api.admin.taskTemplates.remove);
  const createField = useMutation(api.admin.fieldTemplates.create);
  const removeField = useMutation(api.admin.fieldTemplates.remove);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [isRepeatable, setIsRepeatable] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<Id<"taskTemplates"> | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  const templateWithFields = useQuery(api.admin.taskTemplates.getWithFields, expandedTemplate ? { id: expandedTemplate } : "skip");

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
                    <option value="attachment">Attachment</option>
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

interface FieldTemplateData {
  _id: Id<"fieldTemplates">;
  _creationTime: number;
  taskTemplateId: Id<"taskTemplates">;
  label: string;
  fieldType: string;
  order: number;
  isRequired: boolean;
  defaultValue?: string;
  placeholder?: string;
  subheader?: string;
  displayStyle?: string;
  createdAt: number;
}

function MobilePhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative bg-gray-800 rounded-[40px] p-3 shadow-2xl">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10" />
      <div className="bg-white rounded-[32px] overflow-hidden" style={{ width: 375, minHeight: 600 }}>
        <div className="pt-12 px-4 pb-6 overflow-y-auto" style={{ maxHeight: 600 }}>
          {children}
        </div>
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-600 rounded-full" />
    </div>
  );
}

function InlineTextEditor({
  value,
  onSave,
  onCancel,
  placeholder,
  className,
}: {
  value: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
  className?: string;
}) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSave(editValue);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={() => onSave(editValue)}
      onKeyDown={handleKeyDown}
      className={`border-2 border-blue-500 rounded px-2 py-1 text-sm outline-none ${className || ""}`}
      placeholder={placeholder}
    />
  );
}

function DebouncedInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 300);
  };

  const handleBlur = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  return (
    <input
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
      placeholder={placeholder}
    />
  );
}

function SortableFieldWrapper({
  field,
  children,
}: {
  field: FieldTemplateData;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="mb-4">
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          className="mt-1 p-1 cursor-grab hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="5" r="1" fill="currentColor" />
            <circle cx="15" cy="5" r="1" fill="currentColor" />
            <circle cx="9" cy="12" r="1" fill="currentColor" />
            <circle cx="15" cy="12" r="1" fill="currentColor" />
            <circle cx="9" cy="19" r="1" fill="currentColor" />
            <circle cx="15" cy="19" r="1" fill="currentColor" />
          </svg>
        </button>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

function PreviewFieldText({
  field,
  editingProperty,
  onEditLabel,
  onEditPlaceholder,
  onSaveEdit,
  onCancelEdit,
  onSelect,
  isSelected,
}: {
  field: FieldTemplateData;
  editingProperty: "label" | "placeholder" | null;
  onEditLabel: () => void;
  onEditPlaceholder: () => void;
  onSaveEdit: (value: string) => void;
  onCancelEdit: () => void;
  onSelect: () => void;
  isSelected: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg p-2 -m-2 transition-colors ${isSelected ? "bg-blue-50 ring-2 ring-blue-300" : "hover:bg-gray-50"}`}
    >
      {editingProperty === "label" ? (
        <InlineTextEditor
          value={field.label}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          className="w-full mb-1.5"
        />
      ) : (
        <label
          className="block text-sm font-medium text-gray-700 mb-1.5 cursor-pointer hover:text-blue-600"
          onClick={(e) => { e.stopPropagation(); onEditLabel(); }}
        >
          {field.label}
          {field.isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {field.subheader && (
        <div className="text-xs text-gray-500 mb-1.5">{field.subheader}</div>
      )}
      {editingProperty === "placeholder" ? (
        <InlineTextEditor
          value={field.placeholder || ""}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          placeholder="Enter placeholder text..."
          className="w-full"
        />
      ) : (
        <div
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-gray-400 cursor-pointer hover:border-blue-400"
          onClick={(e) => { e.stopPropagation(); onEditPlaceholder(); }}
        >
          {field.placeholder || "Enter text..."}
        </div>
      )}
    </div>
  );
}

function PreviewFieldNumber({
  field,
  editingProperty,
  onEditLabel,
  onEditPlaceholder,
  onSaveEdit,
  onCancelEdit,
  onSelect,
  isSelected,
}: {
  field: FieldTemplateData;
  editingProperty: "label" | "placeholder" | null;
  onEditLabel: () => void;
  onEditPlaceholder: () => void;
  onSaveEdit: (value: string) => void;
  onCancelEdit: () => void;
  onSelect: () => void;
  isSelected: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg p-2 -m-2 transition-colors ${isSelected ? "bg-blue-50 ring-2 ring-blue-300" : "hover:bg-gray-50"}`}
    >
      {editingProperty === "label" ? (
        <InlineTextEditor
          value={field.label}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          className="w-full mb-1.5"
        />
      ) : (
        <label
          className="block text-sm font-medium text-gray-700 mb-1.5 cursor-pointer hover:text-blue-600"
          onClick={(e) => { e.stopPropagation(); onEditLabel(); }}
        >
          {field.label}
          {field.isRequired && <span className="text-red-500 ml-1">*</span>}
          <span className="ml-2 text-xs text-gray-400">#</span>
        </label>
      )}
      {field.subheader && (
        <div className="text-xs text-gray-500 mb-1.5">{field.subheader}</div>
      )}
      {editingProperty === "placeholder" ? (
        <InlineTextEditor
          value={field.placeholder || ""}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          placeholder="Enter placeholder text..."
          className="w-full"
        />
      ) : (
        <div
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-gray-400 cursor-pointer hover:border-blue-400"
          onClick={(e) => { e.stopPropagation(); onEditPlaceholder(); }}
        >
          {field.placeholder || "0"}
        </div>
      )}
    </div>
  );
}

function PreviewFieldBoolean({
  field,
  editingProperty,
  onEditLabel,
  onSaveEdit,
  onCancelEdit,
  onSelect,
  isSelected,
}: {
  field: FieldTemplateData;
  editingProperty: "label" | "placeholder" | null;
  onEditLabel: () => void;
  onSaveEdit: (value: string) => void;
  onCancelEdit: () => void;
  onSelect: () => void;
  isSelected: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg p-2 -m-2 transition-colors ${isSelected ? "bg-blue-50 ring-2 ring-blue-300" : "hover:bg-gray-50"}`}
    >
      <div className="flex items-center justify-between">
        {editingProperty === "label" ? (
          <InlineTextEditor
            value={field.label}
            onSave={onSaveEdit}
            onCancel={onCancelEdit}
            className="flex-1"
          />
        ) : (
          <label
            className="text-sm font-medium text-gray-700 cursor-pointer hover:text-blue-600"
            onClick={(e) => { e.stopPropagation(); onEditLabel(); }}
          >
            {field.label}
            {field.isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="w-11 h-6 bg-gray-200 rounded-full relative flex-shrink-0 ml-4">
          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow" />
        </div>
      </div>
      {field.subheader && (
        <div className="text-xs text-gray-500 mt-1">{field.subheader}</div>
      )}
    </div>
  );
}

function PreviewFieldDate({
  field,
  editingProperty,
  onEditLabel,
  onSaveEdit,
  onCancelEdit,
  onSelect,
  isSelected,
}: {
  field: FieldTemplateData;
  editingProperty: "label" | "placeholder" | null;
  onEditLabel: () => void;
  onSaveEdit: (value: string) => void;
  onCancelEdit: () => void;
  onSelect: () => void;
  isSelected: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg p-2 -m-2 transition-colors ${isSelected ? "bg-blue-50 ring-2 ring-blue-300" : "hover:bg-gray-50"}`}
    >
      {editingProperty === "label" ? (
        <InlineTextEditor
          value={field.label}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          className="w-full mb-1.5"
        />
      ) : (
        <label
          className="block text-sm font-medium text-gray-700 mb-1.5 cursor-pointer hover:text-blue-600"
          onClick={(e) => { e.stopPropagation(); onEditLabel(); }}
        >
          {field.label}
          {field.isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {field.subheader && (
        <div className="text-xs text-gray-500 mb-1.5">{field.subheader}</div>
      )}
      <div className="border border-gray-300 rounded-lg px-3 py-2.5 text-gray-400 flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>Select date...</span>
      </div>
    </div>
  );
}

function PreviewFieldAttachment({
  field,
  editingProperty,
  onEditLabel,
  onSaveEdit,
  onCancelEdit,
  onSelect,
  isSelected,
}: {
  field: FieldTemplateData;
  editingProperty: "label" | "placeholder" | null;
  onEditLabel: () => void;
  onSaveEdit: (value: string) => void;
  onCancelEdit: () => void;
  onSelect: () => void;
  isSelected: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg p-2 -m-2 transition-colors ${isSelected ? "bg-blue-50 ring-2 ring-blue-300" : "hover:bg-gray-50"}`}
    >
      {editingProperty === "label" ? (
        <InlineTextEditor
          value={field.label}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          className="w-full mb-1.5"
        />
      ) : (
        <label
          className="block text-sm font-medium text-gray-700 mb-1.5 cursor-pointer hover:text-blue-600"
          onClick={(e) => { e.stopPropagation(); onEditLabel(); }}
        >
          {field.label}
          {field.isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {field.subheader && (
        <div className="text-xs text-gray-500 mb-1.5">{field.subheader}</div>
      )}
      <div className="flex gap-2">
        <div className="flex-1 bg-gray-100 py-3 rounded-lg text-center border border-gray-200">
          <span className="text-xl">📷</span>
          <div className="text-xs text-gray-600 mt-1">Camera</div>
        </div>
        <div className="flex-1 bg-gray-100 py-3 rounded-lg text-center border border-gray-200">
          <span className="text-xl">🖼️</span>
          <div className="text-xs text-gray-600 mt-1">Gallery</div>
        </div>
        <div className="flex-1 bg-gray-100 py-3 rounded-lg text-center border border-gray-200">
          <span className="text-xl">📄</span>
          <div className="text-xs text-gray-600 mt-1">Document</div>
        </div>
      </div>
    </div>
  );
}

function PreviewFieldDisplayText({
  field,
  onSelect,
  isSelected,
}: {
  field: FieldTemplateData;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const isHeader = field.displayStyle === "header";
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg p-2 -m-2 transition-colors ${isSelected ? "bg-blue-50 ring-2 ring-blue-300" : "hover:bg-gray-50"}`}
    >
      <div className={isHeader ? "text-lg font-semibold text-gray-900" : "text-sm text-gray-700"}>
        {field.label}
      </div>
      {field.subheader && (
        <div className="text-xs text-gray-500 mt-0.5">{field.subheader}</div>
      )}
    </div>
  );
}

function PreviewField({
  field,
  editingProperty,
  onEditLabel,
  onEditPlaceholder,
  onSaveEdit,
  onCancelEdit,
  onSelect,
  isSelected,
}: {
  field: FieldTemplateData;
  editingProperty: "label" | "placeholder" | null;
  onEditLabel: () => void;
  onEditPlaceholder: () => void;
  onSaveEdit: (value: string) => void;
  onCancelEdit: () => void;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const commonProps = {
    field,
    editingProperty,
    onEditLabel,
    onSaveEdit,
    onCancelEdit,
    onSelect,
    isSelected,
  };

  switch (field.fieldType) {
    case "text":
      return <PreviewFieldText {...commonProps} onEditPlaceholder={onEditPlaceholder} />;
    case "number":
      return <PreviewFieldNumber {...commonProps} onEditPlaceholder={onEditPlaceholder} />;
    case "boolean":
      return <PreviewFieldBoolean {...commonProps} />;
    case "date":
      return <PreviewFieldDate {...commonProps} />;
    case "attachment":
      return <PreviewFieldAttachment {...commonProps} />;
    case "displayText":
      return <PreviewFieldDisplayText field={field} onSelect={onSelect} isSelected={isSelected} />;
    default:
      return <PreviewFieldText {...commonProps} onEditPlaceholder={onEditPlaceholder} />;
  }
}

const FIELD_TYPES = [
  { value: "text", label: "Text", icon: "Aa" },
  { value: "number", label: "Number", icon: "#" },
  { value: "boolean", label: "Yes/No", icon: "✓" },
  { value: "date", label: "Date", icon: "📅" },
  { value: "attachment", label: "Attachment", icon: "📎" },
  { value: "displayText", label: "Display Text", icon: "T" },
];

function DraggableFieldTypeBadge({ type }: { type: typeof FIELD_TYPES[number] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `new-field-${type.value}`,
    data: { type: "new-field", fieldType: type.value },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg cursor-grab hover:border-blue-400 hover:shadow-sm transition-all ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <span className="w-6 text-center text-gray-500 font-medium">{type.icon}</span>
      <span className="text-sm text-gray-700">{type.label}</span>
    </div>
  );
}

function FormBuilderTab() {
  const templates = useQuery(api.admin.taskTemplates.list);
  const [selectedTemplateId, setSelectedTemplateId] = useState<Id<"taskTemplates"> | null>(null);
  const [editingField, setEditingField] = useState<{
    fieldId: Id<"fieldTemplates">;
    property: "label" | "placeholder";
  } | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<Id<"fieldTemplates"> | null>(null);
  const [localFields, setLocalFields] = useState<FieldTemplateData[]>([]);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);

  const templateWithFields = useQuery(
    api.admin.taskTemplates.getWithFields,
    selectedTemplateId ? { id: selectedTemplateId } : "skip"
  );

  const updateField = useMutation(api.admin.fieldTemplates.update);
  const removeField = useMutation(api.admin.fieldTemplates.remove);
  const reorderFields = useMutation(api.admin.fieldTemplates.reorder);
  const createField = useMutation(api.admin.fieldTemplates.create);

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

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id?.toString();
    if (overId?.startsWith("drop-zone-")) {
      setActiveDropZone(overId);
    } else {
      setActiveDropZone(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDropZone(null);

    if (!over || !selectedTemplateId) return;

    const activeData = active.data.current;
    const overId = over.id.toString();

    if (activeData?.type === "new-field" && overId.startsWith("drop-zone-")) {
      const insertIndex = parseInt(overId.replace("drop-zone-", ""));
      const fieldType = activeData.fieldType as string;

      await createField({
        taskTemplateId: selectedTemplateId,
        label: `New ${fieldType} field`,
        fieldType,
        isRequired: false,
        order: insertIndex,
      });
      return;
    }

    if (active.id === over.id) return;

    const oldIndex = localFields.findIndex((f) => f._id === active.id);
    const newIndex = localFields.findIndex((f) => f._id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(localFields, oldIndex, newIndex);
    setLocalFields(newOrder);

    await reorderFields({
      taskTemplateId: selectedTemplateId,
      fieldIds: newOrder.map((f) => f._id),
    });
  };

  const handleFieldUpdate = async (
    fieldId: Id<"fieldTemplates">,
    updates: { label?: string; fieldType?: string; placeholder?: string; isRequired?: boolean; subheader?: string; displayStyle?: string }
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

  const selectedField = localFields.find((f) => f._id === selectedFieldId);
  const selectedTemplate = templates?.find((t) => t._id === selectedTemplateId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6" style={{ height: "calc(100vh - 220px)" }}>
        <div className="w-64 flex-shrink-0 border rounded-lg overflow-hidden flex flex-col bg-white">
          <div className="p-3 bg-gray-50 border-b font-medium text-gray-700">
            Task Templates ({templates?.length ?? 0})
          </div>
          <div className="overflow-y-auto flex-1">
            {templates?.map((t) => (
              <div
                key={t._id}
                onClick={() => {
                  setSelectedTemplateId(t._id);
                  setSelectedFieldId(null);
                  setEditingField(null);
                }}
                className={`p-3 border-b cursor-pointer transition-colors ${
                  selectedTemplateId === t._id
                    ? "bg-blue-50 border-l-4 border-l-blue-600"
                    : "hover:bg-gray-50 border-l-4 border-l-transparent"
                }`}
              >
                <div className="font-medium text-gray-900">{t.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{t.category || "Uncategorized"}</div>
              </div>
            ))}
            {templates?.length === 0 && (
              <div className="p-4 text-gray-500 text-sm text-center">
                No templates yet. Create one in the Task Templates tab.
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center py-4 overflow-auto">
          {selectedTemplateId && selectedTemplate ? (
            <>
              <div className="text-center mb-4">
                <h3 className="font-semibold text-gray-900">{selectedTemplate.name}</h3>
                <p className="text-sm text-gray-500">Drag fields into the phone, click to edit</p>
              </div>

              <div className="flex flex-wrap gap-2 mb-6 justify-center">
                {FIELD_TYPES.map((type) => (
                  <DraggableFieldTypeBadge key={type.value} type={type} />
                ))}
              </div>

              <MobilePhoneFrame>
                <div className="text-lg font-bold text-gray-900 mb-6">{selectedTemplate.name}</div>
                <FormDropZoneArea
                  localFields={localFields}
                  activeDropZone={activeDropZone}
                  editingField={editingField}
                  selectedFieldId={selectedFieldId}
                  setEditingField={setEditingField}
                  setSelectedFieldId={setSelectedFieldId}
                  handleFieldUpdate={handleFieldUpdate}
                />
                <div className="mt-6">
                  <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold opacity-50 cursor-not-allowed">
                    Mark Complete
                  </button>
                </div>
              </MobilePhoneFrame>
            </>
          ) : (
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
              <p className="text-lg">Select a template to start editing</p>
              <p className="text-sm mt-1">Choose from the list on the left</p>
            </div>
          )}
        </div>

        <div className="w-72 flex-shrink-0">
          {selectedField ? (
            <div className="border rounded-lg bg-white h-full flex flex-col">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="font-semibold text-gray-900">Edit Field</h3>
                <button
                  onClick={() => setSelectedFieldId(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  &times;
                </button>
              </div>
              <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                  <DebouncedInput
                    value={selectedField.label}
                    onChange={(value) => handleFieldUpdate(selectedField._id, { label: value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
                  <select
                    value={selectedField.fieldType}
                    onChange={(e) => handleFieldUpdate(selectedField._id, { fieldType: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Yes/No Toggle</option>
                    <option value="date">Date</option>
                    <option value="attachment">Attachment</option>
                    <option value="displayText">Display Text</option>
                  </select>
                </div>
                {selectedField.fieldType === "displayText" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Style</label>
                    <select
                      value={selectedField.displayStyle || "simple"}
                      onChange={(e) => handleFieldUpdate(selectedField._id, { displayStyle: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="header">Header (Large, Bold)</option>
                      <option value="simple">Simple (Normal Text)</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subheader</label>
                  <DebouncedInput
                    value={selectedField.subheader || ""}
                    onChange={(value) => handleFieldUpdate(selectedField._id, { subheader: value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional helper text..."
                  />
                </div>
                {(selectedField.fieldType === "text" || selectedField.fieldType === "number") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
                    <DebouncedInput
                      value={selectedField.placeholder || ""}
                      onChange={(value) => handleFieldUpdate(selectedField._id, { placeholder: value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter placeholder text..."
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="field-required-sidebar"
                    checked={selectedField.isRequired}
                    onChange={(e) => handleFieldUpdate(selectedField._id, { isRequired: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="field-required-sidebar" className="text-sm text-gray-700">
                    Required field
                  </label>
                </div>
              </div>
              <div className="p-4 border-t">
                <button
                  onClick={() => handleDeleteField(selectedField._id)}
                  className="w-full px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                >
                  Delete Field
                </button>
              </div>
            </div>
          ) : selectedTemplateId ? (
            <div className="border rounded-lg bg-gray-50 h-full flex items-center justify-center p-6">
              <p className="text-gray-400 text-center text-sm">
                Select a field to edit its properties
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </DndContext>
  );
}

function FormDropZoneArea({
  localFields,
  activeDropZone,
  editingField,
  selectedFieldId,
  setEditingField,
  setSelectedFieldId,
  handleFieldUpdate,
}: {
  localFields: FieldTemplateData[];
  activeDropZone: string | null;
  editingField: { fieldId: Id<"fieldTemplates">; property: "label" | "placeholder" } | null;
  selectedFieldId: Id<"fieldTemplates"> | null;
  setEditingField: (v: { fieldId: Id<"fieldTemplates">; property: "label" | "placeholder" } | null) => void;
  setSelectedFieldId: (v: Id<"fieldTemplates"> | null) => void;
  handleFieldUpdate: (id: Id<"fieldTemplates">, updates: { label?: string; placeholder?: string }) => void;
}) {
  return (
    <SortableContext items={localFields.map((f) => f._id)} strategy={verticalListSortingStrategy}>
      <DroppableZone id="drop-zone-0" isOver={activeDropZone === "drop-zone-0"} />
      {localFields.length > 0 ? (
        localFields.map((field, index) => (
          <div key={field._id}>
            <SortableFieldWrapper field={field}>
              <PreviewField
                field={field}
                editingProperty={editingField?.fieldId === field._id ? editingField.property : null}
                onEditLabel={() => setEditingField({ fieldId: field._id, property: "label" })}
                onEditPlaceholder={() => setEditingField({ fieldId: field._id, property: "placeholder" })}
                onSaveEdit={(value) => {
                  if (editingField) {
                    handleFieldUpdate(field._id, { [editingField.property]: value });
                    setEditingField(null);
                  }
                }}
                onCancelEdit={() => setEditingField(null)}
                onSelect={() => setSelectedFieldId(field._id)}
                isSelected={selectedFieldId === field._id}
              />
            </SortableFieldWrapper>
            <DroppableZone
              id={`drop-zone-${index + 1}`}
              isOver={activeDropZone === `drop-zone-${index + 1}`}
            />
          </div>
        ))
      ) : (
        <div className="text-gray-400 text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          Drag fields here to get started
        </div>
      )}
    </SortableContext>
  );
}

function DroppableZone({ id, isOver }: { id: string; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`transition-all rounded ${
        isOver
          ? "h-16 bg-blue-50 border-2 border-dashed border-blue-400 my-2"
          : "h-1 my-0"
      }`}
    />
  );
}

function ServicesTab() {
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
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [expandedWO, setExpandedWO] = useState<Id<"workOrders"> | null>(null);

  const woDetails = useQuery(api.admin.workOrders.getWithDetails, expandedWO ? { id: expandedWO } : "skip");

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
  const data = useQuery(api.admin.taskInstances.getWithResponses, { id: instanceId });

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
  requiredPeople: number;
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

function GridCellExpandedDetails({
  workOrderDayId,
  requiredPeople,
  tasks,
}: {
  workOrderDayId: Id<"workOrderDays">;
  requiredPeople: number;
  tasks: Array<{
    linkId: Id<"workOrderDayTaskTemplates">;
    taskTemplateId: Id<"taskTemplates">;
    name: string;
    isRequired: boolean;
  }>;
}) {
  const users = useQuery(api.shared.users.list);
  const assignments = useQuery(api.admin.assignments.listByWorkOrderDay, { workOrderDayId });
  const assign = useMutation(api.admin.assignments.assign);
  const unassign = useMutation(api.admin.assignments.unassign);

  const allTaskTemplates = useQuery(api.admin.taskTemplates.list);
  const addTask = useMutation(api.admin.workOrderDays.addTaskTemplate);
  const removeTask = useMutation(api.admin.workOrderDays.removeTaskTemplate);

  const [selectedUser, setSelectedUser] = useState<Id<"users"> | "">("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState("");

  const [selectedTask, setSelectedTask] = useState<Id<"taskTemplates"> | "">("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskError, setTaskError] = useState("");

  const assignedUserIds = new Set(assignments?.map((a) => a.userId) ?? []);
  const availableUsers = users?.filter((u) => !assignedUserIds.has(u._id)) ?? [];
  const slotsNeeded = Math.max(0, requiredPeople - (assignments?.length ?? 0));

  const assignedTaskIds = new Set(tasks.map((t) => t.taskTemplateId));
  const availableTasks = allTaskTemplates?.filter((t) => !assignedTaskIds.has(t._id) && t.isActive) ?? [];

  const handleAssign = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedUser) return;

    setError("");
    setIsAssigning(true);
    try {
      await assign({ workOrderDayId, userId: selectedUser });
      setSelectedUser("");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to assign";
      setError(errorMessage);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async (e: React.MouseEvent, userId: Id<"users">) => {
    e.stopPropagation();
    setError("");
    try {
      await unassign({ workOrderDayId, userId });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to unassign";
      setError(errorMessage);
    }
  };

  const handleAddTask = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedTask) return;

    setTaskError("");
    setIsAddingTask(true);
    try {
      await addTask({ workOrderDayId, taskTemplateId: selectedTask });
      setSelectedTask("");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add task";
      setTaskError(errorMessage);
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleRemoveTask = async (e: React.MouseEvent, taskTemplateId: Id<"taskTemplates">) => {
    e.stopPropagation();
    setTaskError("");
    try {
      await removeTask({ workOrderDayId, taskTemplateId });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to remove task";
      setTaskError(errorMessage);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t-2 border-black space-y-3" onClick={(e) => e.stopPropagation()}>
      {error && (
        <div className="text-xs text-black bg-white border-2 border-black p-2 font-medium">{error}</div>
      )}

      <div>
        <div className="text-xs font-bold text-black border-b-2 border-black pb-1 mb-2">
          Assigned ({assignments?.length ?? 0}/{requiredPeople})
        </div>
        {!assignments ? (
          <div className="text-xs text-gray-500">Loading...</div>
        ) : assignments.length === 0 ? (
          <div className="text-xs text-gray-500">No one assigned</div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {assignments.map((a) => (
              <span
                key={a._id}
                className="text-xs border-2 border-black bg-white px-2 py-1 flex items-center gap-1 font-medium"
              >
                {a.userFullName || a.userEmail}
                <button
                  onClick={(e) => handleUnassign(e, a.userId)}
                  className="text-black hover:text-red-500 font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {slotsNeeded > 0 && availableUsers.length > 0 && (
          <div className="flex gap-1 mt-2">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value as Id<"users"> | "")}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 border-2 border-black px-2 py-1 text-xs bg-white outline-none focus:border-blue-500"
            >
              <option value="">Select user...</option>
              {availableUsers.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.fullName || u.email}
                </option>
              ))}
            </select>
            <button
              onClick={handleAssign}
              disabled={!selectedUser || isAssigning}
              className="border-2 border-black bg-blue-500 text-white px-3 py-1 text-xs font-bold disabled:opacity-50 hover:bg-blue-600"
            >
              {isAssigning ? "..." : "Add"}
            </button>
          </div>
        )}

        {slotsNeeded === 0 && (
          <div className="text-xs text-black font-bold mt-1">✓ All slots filled</div>
        )}
      </div>

      <div>
        <div className="text-xs font-bold text-black border-b-2 border-black pb-1 mb-2">Tasks ({tasks.length})</div>
        {taskError && (
          <div className="text-xs text-black bg-white border-2 border-black p-2 font-medium mb-1">{taskError}</div>
        )}
        {tasks.length === 0 ? (
          <div className="text-xs text-gray-500">No tasks</div>
        ) : (
          <div className="space-y-1">
            {tasks.map((task) => (
              <div
                key={task.linkId}
                className="flex items-center justify-between text-xs border-2 border-black bg-white px-2 py-1"
              >
                <span className="truncate font-medium">{task.name}</span>
                <button
                  onClick={(e) => handleRemoveTask(e, task.taskTemplateId)}
                  className="text-black hover:text-red-500 font-bold ml-1 flex-shrink-0"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {availableTasks.length > 0 && (
          <div className="flex gap-1 mt-2">
            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value as Id<"taskTemplates"> | "")}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 border-2 border-black px-2 py-1 text-xs bg-white outline-none focus:border-blue-500"
            >
              <option value="">Add task...</option>
              {availableTasks.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddTask}
              disabled={!selectedTask || isAddingTask}
              className="border-2 border-black bg-blue-500 text-white px-3 py-1 text-xs font-bold disabled:opacity-50 hover:bg-blue-600"
            >
              {isAddingTask ? "..." : "Add"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function GridCell({
  data,
  isExpanded,
  onToggle,
  onEmptyClick,
}: {
  data: WorkOrderDayGridData | undefined;
  isExpanded: boolean;
  onToggle: () => void;
  onEmptyClick?: () => void;
}) {
  if (!data) {
    return (
      <div
        className="w-40 flex-shrink-0 h-32 border-2 border-black border-dashed bg-white p-2 flex items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-solid transition-colors group"
        onClick={onEmptyClick}
      >
        <span className="text-gray-400 text-xs font-bold group-hover:text-blue-500">+ Add Work Order</span>
      </div>
    );
  }

  const statusIcons: Record<string, string> = {
    draft: "○",
    scheduled: "◐",
    in_progress: "►",
    completed: "✓",
    cancelled: "✕",
    pending: "…",
  };

  return (
    <div
      className={`flex-shrink-0 border-2 border-black bg-white p-3 cursor-pointer transition-all hover:bg-blue-50 ${
        isExpanded ? "w-72 shadow-[4px_4px_0px_0px_#000] z-20" : "w-40 h-32"
      }`}
      onClick={onToggle}
    >
      <div className="text-sm font-semibold truncate text-black" title={data.workOrderName}>
        {data.workOrderName}
      </div>

      <div className="flex items-center gap-2 mt-1">
        <span className="text-base">{statusIcons[data.workOrderStatus] || statusIcons.pending}</span>
        <span className="text-xs font-bold border border-black px-1">D{data.dayNumber}</span>
      </div>

      <div className="text-xs text-gray-500 mt-1">
        {data.assignmentCount}/{data.requiredPeople} people
      </div>

      <div className="text-xs text-gray-500 mt-0.5">
        {data.completedTaskCount}/{data.taskCount} tasks
      </div>

      {!isExpanded && data.assignedUsers.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {data.assignedUsers.slice(0, 3).map((user, i) => (
            <span key={i} className="w-5 h-5 border-2 border-black text-xs font-bold flex items-center justify-center bg-white">
              {user.fullName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
            </span>
          ))}
          {data.assignedUsers.length > 3 && (
            <span className="text-xs font-bold text-gray-600">+{data.assignedUsers.length - 3}</span>
          )}
        </div>
      )}

      {isExpanded && (
        <GridCellExpandedDetails
          workOrderDayId={data._id}
          requiredPeople={data.requiredPeople}
          tasks={data.tasks}
        />
      )}
    </div>
  );
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
  const spanWidth = days.length * 160;

  const renderAssignmentSlots = (day: WorkOrderDayGridData) => {
    const slots = [];
    for (let i = 0; i < day.requiredPeople; i++) {
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
      className="flex-shrink-0 border-2 border-black bg-white h-32 overflow-hidden cursor-pointer hover:shadow-[2px_2px_0px_0px_#000] transition-shadow"
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
            className={`w-40 flex-shrink-0 p-3 flex flex-col justify-center gap-2 ${
              idx < days.length - 1 ? "border-r border-dashed border-gray-300" : ""
            }`}
          >
            <div className="flex flex-wrap gap-1">
              {renderAssignmentSlots(day)}
            </div>
            {day.taskCount > 0 && (
              <div className="text-[10px] text-gray-400">{day.taskCount} task{day.taskCount !== 1 ? "s" : ""}</div>
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
      className="w-40 flex-shrink-0 h-32 border-r border-b border-gray-200 bg-gray-50/50 p-2 flex items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors group"
      onClick={onClick}
    >
      <span className="text-transparent text-xs font-bold group-hover:text-blue-500 transition-colors">+ Add</span>
    </div>
  );
}

type UserData = {
  _id: Id<"users">;
  fullName?: string;
  email: string;
};

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
  requiredPeople,
  allUsers,
  onRemoveShared,
}: {
  sharedUsers: Array<Id<"users">>;
  requiredPeople: number;
  allUsers: UserData[];
  onRemoveShared: (userId: Id<"users">) => void;
}) {
  const slots: Array<React.ReactNode> = [];
  for (let i = 0; i < requiredPeople; i++) {
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
      <div className="text-sm font-bold mb-2">All Days</div>
      <div className="text-xs text-gray-500 mb-3">Drop here to assign to every day</div>
      <div className="flex gap-2 flex-wrap">{slots}</div>
    </div>
  );
}

function DayColumn({
  day,
  sharedUserCount,
  requiredPeople,
  dayUsers,
  allUsers,
  onRemove,
}: {
  day: { _id: Id<"workOrderDays">; dayDate: number; dayNumber: number };
  sharedUserCount: number;
  requiredPeople: number;
  dayUsers: Array<Id<"users">>;
  allUsers: UserData[];
  onRemove: (dayId: Id<"workOrderDays">, userId: Id<"users">) => void;
}) {
  const availableSlots = Math.max(0, requiredPeople - sharedUserCount);
  const slots: Array<React.ReactNode> = [];

  for (let i = 0; i < availableSlots; i++) {
    const userId = dayUsers[i];
    const user = userId ? allUsers.find((u) => u._id === userId) : undefined;
    slots.push(
      <DroppableSlot
        key={`day-${day._id}-${i}`}
        id={`day-${day._id}-slot-${i}`}
        user={user}
        onRemove={userId ? () => onRemove(day._id, userId) : undefined}
      />
    );
  }

  const dateStr = new Date(day.dayDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex-shrink-0 w-32 border-r border-gray-200 p-3">
      <div className="text-xs font-bold text-gray-600 mb-3">{dateStr}</div>
      <div className="flex flex-wrap gap-2">{slots}</div>
      {availableSlots === 0 && (
        <div className="text-xs text-gray-400 italic">Filled by shared</div>
      )}
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
  requiredPeople,
  dayUsers,
  allUsers,
  onRemove,
  onUserClick,
}: {
  day: { _id: Id<"workOrderDays">; dayDate: number; dayNumber: number };
  sharedUserCount: number;
  requiredPeople: number;
  dayUsers: Array<Id<"users">>;
  allUsers: UserData[];
  onRemove: (dayId: Id<"workOrderDays">, userId: Id<"users">) => void;
  onUserClick: (userId: Id<"users">, userName: string) => void;
}) {
  const availableSlots = Math.max(0, requiredPeople - sharedUserCount);
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

  const dateStr = new Date(day.dayDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex-shrink-0 w-32 border-r border-gray-200 p-3">
      <div className="text-xs font-bold text-gray-600 mb-3">{dateStr}</div>
      <div className="flex flex-wrap gap-2">{slots}</div>
      {availableSlots === 0 && (
        <div className="text-xs text-gray-400 italic">Filled by shared</div>
      )}
    </div>
  );
}

type TaskTemplateData = {
  _id: Id<"taskTemplates">;
  name: string;
};

function DraggableTaskCard({ template }: { template: TaskTemplateData }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${template._id}`,
    data: { type: "task", taskTemplateId: template._id, taskName: template.name },
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
          {template.name[0]?.toUpperCase()}
        </span>
        <span className="font-medium text-sm truncate max-w-[120px]">{template.name}</span>
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
  const activeTemplates = allTaskTemplates?.filter((t) => t.isActive) ?? [];
  const addTask = useMutation(api.admin.workOrderDays.addTaskTemplate);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskTemplateId = active.data.current?.taskTemplateId as Id<"taskTemplates">;
    const taskName = active.data.current?.taskName as string;
    if (!taskTemplateId) return;

    const overId = over.id.toString();
    if (overId.startsWith("task-day-")) {
      const dayId = overId.replace("task-day-", "") as Id<"workOrderDays">;
      try {
        await addTask({ workOrderDayId: dayId, taskTemplateId });
      } catch (err) {
        if (err instanceof Error && err.message.includes("already assigned")) {
          setErrorMessage(`"${taskName}" is already assigned to this day`);
        } else {
          setErrorMessage("Failed to add task");
        }
      }
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex-1 flex overflow-hidden relative">
        {errorMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 border-2 border-black shadow-[4px_4px_0px_0px_#000] text-sm font-medium animate-pulse">
            {errorMessage}
          </div>
        )}

        <div className="w-56 border-r-2 border-black flex flex-col">
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="text-sm font-bold">Available Tasks</div>
            <div className="text-xs text-gray-500">Drag to add to a day</div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeTemplates.map((template) => (
              <DraggableTaskCard key={template._id} template={template} />
            ))}
            {activeTemplates.length === 0 && (
              <div className="text-xs text-gray-400 italic text-center py-4">
                No active task templates
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 bg-gray-50 border-b-2 border-black">
            <div className="text-sm font-bold">Day Tasks</div>
            <div className="text-xs text-gray-500">Drop tasks on each day</div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <div className="flex min-w-max">
              {days.map((day) => (
                <TaskDayColumnDroppable key={day._id} day={day} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
}

function TaskDayColumnDroppable({
  day,
}: {
  day: { _id: Id<"workOrderDays">; dayDate: number; dayNumber: number };
}) {
  const dayData = useQuery(api.admin.workOrderDays.getWithTaskTemplates, { id: day._id });
  const removeTask = useMutation(api.admin.workOrderDays.removeTaskTemplate);
  const { setNodeRef, isOver } = useDroppable({
    id: `task-day-${day._id}`,
  });

  const dayTasks = dayData?.taskTemplates ?? [];

  const handleRemoveTask = (taskTemplateId: Id<"taskTemplates">) => {
    removeTask({ workOrderDayId: day._id, taskTemplateId });
  };

  const dateStr = new Date(day.dayDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-48 border-r border-gray-200 p-3 min-h-[200px] transition-colors ${
        isOver ? "bg-blue-50" : ""
      }`}
    >
      <div className="text-xs font-bold text-gray-600 mb-3">{dateStr}</div>
      <div className="space-y-2">
        {dayTasks.map((task) => (
          <div
            key={task._id}
            className="border-2 border-black bg-white p-2 flex items-center justify-between group"
          >
            <span className="text-sm truncate">{task.taskTemplateName}</span>
            <button
              onClick={() => handleRemoveTask(task.taskTemplateId)}
              className="text-gray-400 hover:text-red-500 font-bold ml-1 opacity-0 group-hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
        {dayTasks.length === 0 && (
          <div className={`text-xs italic text-center py-4 border-2 border-dashed rounded transition-colors ${
            isOver ? "border-blue-400 text-blue-500" : "border-gray-300 text-gray-400"
          }`}>
            {isOver ? "Drop here" : "Drop tasks here"}
          </div>
        )}
      </div>
    </div>
  );
}

function AssignmentDetailPanel({
  detail,
  onClose,
}: {
  detail: {
    dayId: Id<"workOrderDays">;
    userId: Id<"users">;
    userName: string;
    dayNumber: number;
    dayDate: number;
  };
  onClose: () => void;
}) {
  const taskInstances = useQuery(api.admin.taskInstances.listByWorkOrderDay, {
    workOrderDayId: detail.dayId,
  });
  const users = useQuery(api.shared.users.list);

  const user = users?.find((u) => u._id === detail.userId);
  const userClerkId = user?.clerkId;

  const userTaskInstances = useMemo(() => {
    if (!taskInstances || !userClerkId) return [];
    return taskInstances.filter((t) => t.userId === userClerkId);
  }, [taskInstances, userClerkId]);

  const dateStr = new Date(detail.dayDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="w-80 border-l-2 border-black flex flex-col bg-white">
      <div className="p-4 border-b-2 border-black flex items-center justify-between bg-gray-50">
        <div>
          <div className="text-sm font-bold">{detail.userName}</div>
          <div className="text-xs text-gray-500">Day {detail.dayNumber} • {dateStr}</div>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 border-2 border-black flex items-center justify-center font-bold hover:bg-gray-100 text-sm"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-sm font-bold mb-3">Task Instances</div>
        {!taskInstances ? (
          <div className="text-xs text-gray-400">Loading...</div>
        ) : userTaskInstances.length === 0 ? (
          <div className="text-xs text-gray-400 italic">
            No tasks completed by this user yet
          </div>
        ) : (
          <div className="space-y-3">
            {userTaskInstances.map((instance) => (
              <TaskInstanceCard key={instance._id} instance={instance} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskInstanceCard({
  instance,
}: {
  instance: {
    _id: Id<"taskInstances">;
    taskTemplateName: string;
    status: string;
    responseCount: number;
    fieldCount: number;
    completedAt?: number;
  };
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const details = useQuery(
    api.admin.taskInstances.getWithResponses,
    isExpanded ? { id: instance._id } : "skip"
  );

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 border-yellow-500 text-yellow-700",
    completed: "bg-green-100 border-green-500 text-green-700",
  };

  return (
    <div className="border-2 border-black bg-white">
      <div
        className="p-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="font-medium text-sm">{instance.taskTemplateName}</div>
          <span className={`text-xs px-2 py-0.5 border rounded ${statusColors[instance.status] || "bg-gray-100"}`}>
            {instance.status}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {instance.responseCount}/{instance.fieldCount} fields filled
        </div>
        {instance.completedAt && (
          <div className="text-xs text-gray-400 mt-0.5">
            Completed {new Date(instance.completedAt).toLocaleTimeString()}
          </div>
        )}
      </div>

      {isExpanded && details && (
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          {details.fields.length === 0 ? (
            <div className="text-xs text-gray-400 italic">No fields</div>
          ) : (
            <div className="space-y-2">
              {details.fields.map((field) => (
                <div key={field._id} className="text-xs">
                  <div className="font-medium text-gray-600">{field.label}</div>
                  <div className="text-gray-800 mt-0.5">
                    {field.response?.value || <span className="text-gray-400 italic">Not answered</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type ModalTab = "people" | "tasks";

type AssignmentDetailView = {
  dayId: Id<"workOrderDays">;
  userId: Id<"users">;
  userName: string;
  dayNumber: number;
  dayDate: number;
} | null;

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

  const requiredPeople = workOrderDetails?.service?.requiredPeople ?? 1;
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
                <h3 className="text-lg font-bold">Manage Work Order</h3>
                {workOrderDetails && (
                  <div className="text-sm text-gray-600">
                    {workOrderDetails.workOrder.name} • {workOrderDetails.faena.name} • {workOrderDetails.customer.name}
                  </div>
                )}
                {workOrderDetails && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {days.length} days • {requiredPeople} people per day
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
                People
              </button>
              <button
                onClick={() => { setActiveTab("tasks"); setAssignmentDetail(null); }}
                className={`flex-1 px-4 py-2 text-sm font-bold border-l-2 border-black transition-colors ${
                  activeTab === "tasks"
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-gray-100"
                }`}
              >
                Tasks
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
                        <div className="text-sm font-bold">Available</div>
                        <div className="text-xs text-gray-500">Drag to assign</div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {availableUsers.map((user) => (
                          <DraggableUserCard key={user._id} user={user} />
                        ))}
                        {availableUsers.length === 0 && (
                          <div className="text-xs text-gray-400 italic text-center py-4">
                            All users assigned
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden">
                      <SharedAssignmentRow
                        sharedUsers={sharedUsers}
                        requiredPeople={requiredPeople}
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
                              requiredPeople={requiredPeople}
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
              <div className="text-gray-500">Loading...</div>
            </div>
          )}

          <div className="p-4 border-t-2 border-black">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 border-2 border-black bg-blue-500 text-white font-bold hover:bg-blue-600"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
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
    <div className="p-3 bg-gray-50 border border-gray-200">
      <div className="text-xs font-bold mb-2">
        Day {day.dayNumber} - {new Date(day.dayDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
      </div>
      {dayTasks.length > 0 && (
        <div className="space-y-1 mb-2">
          {dayTasks.map((task) => (
            <div key={task._id} className="flex items-center justify-between text-xs bg-white border px-2 py-1">
              <span>{task.taskTemplateName}</span>
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
            className="flex-1 border px-2 py-1 text-xs"
          >
            <option value="">Add task...</option>
            {availableTasks.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </select>
          <button
            onClick={handleAddTask}
            disabled={!selectedTask}
            className="border-2 border-black bg-white px-2 py-1 text-xs font-bold hover:bg-gray-100 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}
    </div>
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

  const selectedServiceData = services?.find((s) => s._id === selectedService);
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
      if (service) {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(end.getDate() + service.defaultDays - 1);
        setEndDate(formatDateForInput(end.getTime()));
        if (!name) {
          const customerName = customers?.find((c) => c._id === customerId)?.name ?? "";
          setName(`${service.name} - ${customerName}`);
        }
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
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-xl z-50 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Create Work Order</h3>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-blue-900">{faena?.name}</div>
            <div className="text-xs text-blue-700">{faena?.customerName}</div>
            <div className="text-xs text-blue-600 mt-1">
              Starting: {new Date(startDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service *</label>
            <select
              value={selectedService}
              onChange={(e) => handleServiceChange(e.target.value as Id<"services"> | "")}
              className="w-full border px-3 py-2 rounded-lg text-sm"
            >
              <option value="">Select a service...</option>
              {services?.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.defaultDays} days, {s.requiredPeople} people)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Order Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter work order name"
              className="w-full border px-3 py-2 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDateStr}
                disabled
                className="w-full border px-3 py-2 rounded-lg text-sm bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDateStr}
                className="w-full border px-3 py-2 rounded-lg text-sm"
              />
            </div>
          </div>

          {selectedServiceData && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <div className="font-medium text-gray-700">Service Details</div>
              <div className="text-gray-600 mt-1">
                Default duration: {selectedServiceData.defaultDays} days
              </div>
              <div className="text-gray-600">
                Required people: {selectedServiceData.requiredPeople} per day
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={3}
              className="w-full border px-3 py-2 rounded-lg text-sm resize-none"
            />
          </div>
        </div>

        <div className="p-4 border-t space-y-2">
          <button
            onClick={() => handleSubmit(true)}
            disabled={!selectedService || !name.trim() || !endDate || isSubmitting}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create & Assign People"}
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={!selectedService || !name.trim() || !endDate || isSubmitting}
              className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Only
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
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">New Faena</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 text-xl">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value as Id<"customers"> | "")}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="">Select customer...</option>
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
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                + Add new customer
              </button>
            ) : (
              <div className="mt-3 p-3 bg-gray-50 rounded border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">New Customer</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCustomer(false);
                      setNewCustomerName("");
                      setNewCustomerEmail("");
                      setNewCustomerPhone("");
                    }}
                    className="text-gray-400 hover:text-gray-600 text-sm"
                  >
                    Cancel
                  </button>
                </div>
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Customer name *"
                  className="w-full border px-3 py-2 rounded text-sm"
                />
                <input
                  type="email"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  placeholder="Email (optional)"
                  className="w-full border px-3 py-2 rounded text-sm"
                />
                <input
                  type="tel"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  className="w-full border px-3 py-2 rounded text-sm"
                />
                <button
                  type="button"
                  onClick={handleCreateCustomer}
                  disabled={!newCustomerName.trim() || isCreatingCustomer}
                  className="w-full bg-gray-800 text-white py-1.5 rounded text-sm font-medium disabled:opacity-50"
                >
                  {isCreatingCustomer ? "Creating..." : "Create Customer"}
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Faena Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Site Alpha"
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Santiago, Chile"
              className="w-full border px-3 py-2 rounded"
            />
          </div>
        </div>

        <div className="p-4 border-t">
          <button
            onClick={handleCreate}
            disabled={!customerId || !name.trim() || isCreating}
            className="w-full bg-blue-600 text-white py-2 rounded font-medium disabled:opacity-50"
          >
            {isCreating ? "Creating..." : "Create Faena"}
          </button>
        </div>
      </div>
    </>
  );
}

function DashboardGridTab() {
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + 30);
    return { start: today.getTime(), end: end.getTime() };
  });
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

  const gridData = useQuery(api.admin.dashboardGrid.getGridData, {
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

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

  const goToPrevWeek = () => {
    setDateRange((prev) => ({
      start: prev.start - 7 * 24 * 60 * 60 * 1000,
      end: prev.end - 7 * 24 * 60 * 60 * 1000,
    }));
  };

  const goToNextWeek = () => {
    setDateRange((prev) => ({
      start: prev.start + 7 * 24 * 60 * 60 * 1000,
      end: prev.end + 7 * 24 * 60 * 60 * 1000,
    }));
  };

  const formatDayHeader = (timestamp: number) => {
    const date = new Date(timestamp);
    const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
    const day = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "short" });
    return { weekday, day, month };
  };

  const formatDateRange = () => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  };

  if (!gridData) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-64 mx-auto" />
        <div className="flex h-[500px]">
          <div className="w-48 flex-shrink-0 bg-gray-100 animate-pulse" />
          <div className="flex-1 bg-gray-50 animate-pulse" />
        </div>
      </div>
    );
  }

  if (gridData.faenas.length === 0) {
    return (
      <>
        <div className="text-center py-12 text-gray-500">
          <div className="text-lg font-medium">No faenas found</div>
          <div className="text-sm mt-1">Create a faena to get started</div>
          <button
            onClick={() => setFaenaDrawerOpen(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
          >
            + Create Faena
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevWeek}
          className="border-2 border-black px-4 py-2 font-bold bg-white hover:bg-blue-500 hover:text-white transition-colors"
        >
          ← Prev Week
        </button>
        <span className="text-lg font-bold text-black">{formatDateRange()}</span>
        <button
          onClick={goToNextWeek}
          className="border-2 border-black px-4 py-2 font-bold bg-white hover:bg-blue-500 hover:text-white transition-colors"
        >
          Next Week →
        </button>
      </div>

      <div className="flex border-2 border-black overflow-hidden" style={{ height: "calc(100vh - 280px)", minHeight: "400px" }}>
        <div className="w-48 flex-shrink-0 border-r-2 border-black bg-white z-10 overflow-y-auto">
          <div className="h-14 border-b-2 border-black bg-white p-2 font-bold text-sm flex items-center sticky top-0">
            Faenas
          </div>
          {gridData.faenas.map((faena) => (
            <div key={faena._id} className="h-32 p-3 border-b-2 border-black flex flex-col justify-center">
              <div className="font-bold text-base truncate text-black" title={faena.name}>{faena.name}</div>
              <div className="text-xs text-gray-500 truncate" title={faena.customerName}>{faena.customerName}</div>
            </div>
          ))}
          <div
            className="h-16 p-2 border-b border-gray-200 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors group"
            onClick={() => setFaenaDrawerOpen(true)}
          >
            <span className="text-sm text-gray-300 group-hover:text-blue-500 font-medium transition-colors">+ Add Faena</span>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <div className="inline-flex flex-col min-w-full">
            <div className="flex sticky top-0 bg-white z-5">
              {daysInRange.map((day) => {
                const { weekday, day: dayNum, month } = formatDayHeader(day);
                const isToday = new Date(day).toDateString() === new Date().toDateString();
                return (
                  <div
                    key={day}
                    className={`w-40 flex-shrink-0 h-14 border-b-2 border-r-2 border-black p-2 text-center ${
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
                <div key={faena._id} className="flex">
                  {spans.map((span, spanIndex) => {
                    if (span.type === "empty") {
                      return (
                        <EmptyCell
                          key={`empty-${span.dayTimestamp}`}
                          onClick={() => openDrawer(faena, span.dayTimestamp)}
                        />
                      );
                    }
                    return (
                      <WorkOrderSpan
                        key={`span-${spanIndex}-${span.workOrderId}`}
                        days={span.days}
                        onSpanClick={(workOrderId) => setEditingWorkOrderId(workOrderId)}
                      />
                    );
                  })}
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

      <div className="text-xs text-gray-600 text-center font-medium">
        Showing {gridData.faenas.length} faenas • {gridData.workOrderDays.length} work order days in range
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
  );
}

function UsersTab() {
  const { user } = useUser();
  const users = useQuery(api.shared.users.list);
  const upsertFromClerk = useMutation(api.shared.users.upsertFromClerk);
  const updateRole = useMutation(api.shared.users.updateRole);
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
  const [activeTab, setActiveTab] = useState<Tab>("gridView");

  return (
    <div className={activeTab === "gridView" ? "max-w-full mx-auto p-4" : "max-w-6xl mx-auto p-4"}>
      <h2 className="text-2xl font-bold mb-4">{activeTab === "gridView" ? "Dashboard" : "Debug Dashboard"}</h2>
      <div className="flex gap-1 border-b mb-4 overflow-x-auto">
        <TabButton tab="gridView" active={activeTab === "gridView"} onClick={() => setActiveTab("gridView")}>Grid View</TabButton>
        <TabButton tab="customers" active={activeTab === "customers"} onClick={() => setActiveTab("customers")}>Customers</TabButton>
        <TabButton tab="faenas" active={activeTab === "faenas"} onClick={() => setActiveTab("faenas")}>Faenas</TabButton>
        <TabButton tab="taskTemplates" active={activeTab === "taskTemplates"} onClick={() => setActiveTab("taskTemplates")}>Task Templates</TabButton>
        <TabButton tab="formBuilder" active={activeTab === "formBuilder"} onClick={() => setActiveTab("formBuilder")}>Form Builder</TabButton>
        <TabButton tab="services" active={activeTab === "services"} onClick={() => setActiveTab("services")}>Services</TabButton>
        <TabButton tab="workOrders" active={activeTab === "workOrders"} onClick={() => setActiveTab("workOrders")}>Work Orders</TabButton>
        <TabButton tab="users" active={activeTab === "users"} onClick={() => setActiveTab("users")}>Users</TabButton>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        {activeTab === "gridView" && <DashboardGridTab />}
        {activeTab === "customers" && <CustomersTab />}
        {activeTab === "faenas" && <FaenasTab />}
        {activeTab === "taskTemplates" && <TaskTemplatesTab />}
        {activeTab === "formBuilder" && <FormBuilderTab />}
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
