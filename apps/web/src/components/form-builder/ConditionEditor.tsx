"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import type { FieldTemplateData, FieldConditionData } from "@/types";
import { OPERATORS_BY_FIELD_TYPE } from "@/types";

interface SelectOption {
  value: string;
  label: string;
}

function parseSelectOptions(displayStyle: string | undefined): SelectOption[] {
  if (!displayStyle) return [];
  try {
    const parsed = JSON.parse(displayStyle);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (opt): opt is SelectOption =>
          typeof opt === "object" &&
          opt !== null &&
          typeof opt.value === "string" &&
          typeof opt.label === "string"
      );
    }
    return [];
  } catch {
    return [];
  }
}

interface ConditionEditorProps {
  field: FieldTemplateData;
  allFields: FieldTemplateData[];
  conditions: FieldConditionData[];
  onConditionLogicChange: (logic: "AND" | "OR" | null) => void;
}

export function ConditionEditor({
  field,
  allFields,
  conditions,
  onConditionLogicChange,
}: ConditionEditorProps) {
  const createCondition = useMutation(api.admin.fieldConditions.create);
  const updateCondition = useMutation(api.admin.fieldConditions.update);
  const removeCondition = useMutation(api.admin.fieldConditions.remove);

  const availableParents = allFields.filter(
    (f) =>
      f._id !== field._id &&
      f.fieldType !== "displayText" &&
      f.order < field.order
  );

  const handleAddCondition = async () => {
    if (availableParents.length === 0) return;
    const parent = availableParents[0];
    const operators = OPERATORS_BY_FIELD_TYPE[parent.fieldType] ?? [];

    await createCondition({
      childFieldId: field._id,
      parentFieldId: parent._id,
      operator: operators[0]?.value ?? "equals",
      value: parent.fieldType === "boolean" ? "true" : "",
      conditionGroup: 0,
    });

    if (conditions.length === 0) {
      onConditionLogicChange("AND");
    }
  };

  const handleRemoveCondition = async (conditionId: Id<"fieldConditions">) => {
    await removeCondition({ id: conditionId });
    if (conditions.length <= 1) {
      onConditionLogicChange(null);
    }
  };

  const handleUpdateCondition = async (
    conditionId: Id<"fieldConditions">,
    updates: { operator?: string; value?: string | string[]; conditionGroup?: number }
  ) => {
    await updateCondition({ id: conditionId, ...updates });
  };

  const handleParentChange = async (
    condition: FieldConditionData,
    newParentId: Id<"fieldTemplates">
  ) => {
    const newParent = allFields.find((f) => f._id === newParentId);
    const operators = newParent ? OPERATORS_BY_FIELD_TYPE[newParent.fieldType] ?? [] : [];

    await removeCondition({ id: condition._id });
    await createCondition({
      childFieldId: field._id,
      parentFieldId: newParentId,
      operator: operators[0]?.value ?? "equals",
      value: newParent?.fieldType === "boolean" ? "true" : "",
      conditionGroup: condition.conditionGroup,
    });
  };

  return (
    <div className="space-y-3 pt-4 border-t border-gray-200">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-bold text-gray-700">Mostrar cuando</label>
        <button
          type="button"
          onClick={handleAddCondition}
          disabled={availableParents.length === 0}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          + Agregar condicion
        </button>
      </div>

      {conditions.length > 1 && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onConditionLogicChange("AND")}
            className={`px-2 py-1 text-xs rounded font-medium ${
              field.conditionLogic === "AND"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Todas (Y)
          </button>
          <button
            type="button"
            onClick={() => onConditionLogicChange("OR")}
            className={`px-2 py-1 text-xs rounded font-medium ${
              field.conditionLogic === "OR"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Cualquiera (O)
          </button>
        </div>
      )}

      {conditions.length === 0 ? (
        <p className="text-xs text-gray-500">Siempre visible (sin condiciones)</p>
      ) : (
        <div className="space-y-2">
          {conditions.map((condition, index) => (
            <ConditionRow
              key={condition._id}
              condition={condition}
              index={index}
              availableParents={availableParents}
              allFields={allFields}
              onParentChange={(newParentId) => handleParentChange(condition, newParentId)}
              onUpdate={(updates) => handleUpdateCondition(condition._id, updates)}
              onRemove={() => handleRemoveCondition(condition._id)}
              showLogic={index > 0}
              logic={field.conditionLogic ?? "AND"}
            />
          ))}
        </div>
      )}

      {availableParents.length === 0 && conditions.length === 0 && (
        <p className="text-xs text-gray-400 italic">
          No hay campos anteriores que puedan usarse como condiciones
        </p>
      )}
    </div>
  );
}

function ConditionRow({
  condition,
  index,
  availableParents,
  allFields,
  onParentChange,
  onUpdate,
  onRemove,
  showLogic,
  logic,
}: {
  condition: FieldConditionData;
  index: number;
  availableParents: FieldTemplateData[];
  allFields: FieldTemplateData[];
  onParentChange: (newParentId: Id<"fieldTemplates">) => void;
  onUpdate: (updates: { operator?: string; value?: string | string[] }) => void;
  onRemove: () => void;
  showLogic: boolean;
  logic: "AND" | "OR";
}) {
  const parentField = allFields.find((f) => f._id === condition.parentFieldId);
  const operators = parentField
    ? OPERATORS_BY_FIELD_TYPE[parentField.fieldType] ?? []
    : [];
  const needsValue = !["isEmpty", "isNotEmpty"].includes(condition.operator);

  return (
    <div className="p-2 bg-gray-50 rounded border border-gray-200 text-xs">
      {showLogic && (
        <span className="text-gray-500 uppercase text-[10px] font-medium block mb-1">
          {logic}
        </span>
      )}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1">
          <select
            value={condition.parentFieldId}
            onChange={(e) => onParentChange(e.target.value as Id<"fieldTemplates">)}
            className="flex-1 border rounded px-1 py-1 text-xs"
          >
            {availableParents.map((f) => (
              <option key={f._id} value={f._id}>
                {f.label}
              </option>
            ))}
            {!availableParents.find((f) => f._id === condition.parentFieldId) &&
              parentField && (
                <option value={condition.parentFieldId}>{parentField.label}</option>
              )}
          </select>

          <select
            value={condition.operator}
            onChange={(e) => onUpdate({ operator: e.target.value })}
            className="border rounded px-1 py-1 text-xs"
          >
            {operators.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 font-bold px-1"
          >
            ×
          </button>
        </div>

        {needsValue && (
          <ValueEditor
            parentField={parentField}
            condition={condition}
            onUpdate={onUpdate}
          />
        )}
      </div>
    </div>
  );
}

function ValueEditor({
  parentField,
  condition,
  onUpdate,
}: {
  parentField: FieldTemplateData | undefined;
  condition: FieldConditionData;
  onUpdate: (updates: { value: string | string[] }) => void;
}) {
  if (!parentField) return null;

  const value = Array.isArray(condition.value)
    ? condition.value.join(",")
    : condition.value;

  if (parentField.fieldType === "boolean") {
    return (
      <select
        value={value}
        onChange={(e) => onUpdate({ value: e.target.value })}
        className="border rounded px-2 py-1 text-xs w-full"
      >
        <option value="true">Si</option>
        <option value="false">No</option>
      </select>
    );
  }

  if (parentField.fieldType === "select") {
    const options = parseSelectOptions(parentField.displayStyle);
    const isMulti = condition.operator === "includes";

    if (isMulti) {
      const selectedValues = Array.isArray(condition.value)
        ? condition.value
        : [];
      return (
        <div className="flex flex-wrap gap-1">
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={selectedValues.includes(opt.value)}
                onChange={(e) => {
                  const newValues = e.target.checked
                    ? [...selectedValues, opt.value]
                    : selectedValues.filter((v) => v !== opt.value);
                  onUpdate({ value: newValues });
                }}
                className="w-3 h-3"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      );
    }

    return (
      <select
        value={value}
        onChange={(e) => onUpdate({ value: e.target.value })}
        className="border rounded px-2 py-1 text-xs w-full"
      >
        <option value="">Seleccionar...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (parentField.fieldType === "date") {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onUpdate({ value: e.target.value })}
        className="border rounded px-2 py-1 text-xs w-full"
      />
    );
  }

  return (
    <input
      type={parentField.fieldType === "number" ? "number" : "text"}
      value={value}
      onChange={(e) => onUpdate({ value: e.target.value })}
      placeholder="Valor..."
      className="border rounded px-2 py-1 text-xs w-full"
    />
  );
}
