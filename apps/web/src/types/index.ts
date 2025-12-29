"use client";

import type { Id } from "@packages/backend/convex/_generated/dataModel";

export interface FieldTemplateData {
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
  conditionLogic?: "AND" | "OR" | null;
  createdAt: number;
}

export interface FieldConditionData {
  _id: Id<"fieldConditions">;
  _creationTime: number;
  childFieldId: Id<"fieldTemplates">;
  parentFieldId: Id<"fieldTemplates">;
  operator: string;
  value: string | string[];
  conditionGroup: number;
  createdAt: number;
}

export interface RoutineWithTaskCount {
  _id: Id<"services">;
  name: string;
  taskCount: number;
  isActive: boolean;
}

export interface ServiceTaskTemplate {
  _id: Id<"serviceTaskTemplates">;
  taskTemplateId: Id<"taskTemplates">;
  taskTemplateName: string;
  order: number;
  isRequired: boolean;
  dayNumber?: number;
  dependsOn: Id<"serviceTaskTemplates">[];
  fieldCount: number;
}

export interface TaskTemplateData {
  _id: Id<"taskTemplates">;
  _creationTime: number;
  name: string;
  description?: string;
  category?: string;
  isRepeatable: boolean;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export type MainView = "gridView" | "formBuilder" | "debug" | "dataVisualization";

export type DatePreset = "today" | "thisWeek" | "thisMonth" | "allTime";

export type DebugTab = "customers" | "faenas" | "taskTemplates" | "services" | "workOrders" | "users";

export const FIELD_TYPES = [
  { value: "text", label: "Texto", icon: "Aa" },
  { value: "number", label: "Numero", icon: "#" },
  { value: "boolean", label: "Si/No", icon: "✓" },
  { value: "date", label: "Fecha", icon: "📅" },
  { value: "attachment", label: "Adjunto", icon: "📎" },
  { value: "displayText", label: "Texto de Visualizacion", icon: "T" },
  { value: "select", label: "Seleccion", icon: "▼" },
  { value: "userSelect", label: "Seleccion de Usuario", icon: "👤" },
] as const;

export type FieldType = typeof FIELD_TYPES[number]["value"];

export const OPERATORS_BY_FIELD_TYPE: Record<string, { value: string; label: string }[]> = {
  text: [
    { value: "equals", label: "Igual a" },
    { value: "notEquals", label: "No igual a" },
    { value: "contains", label: "Contiene" },
    { value: "isEmpty", label: "Esta vacio" },
    { value: "isNotEmpty", label: "No esta vacio" },
  ],
  number: [
    { value: "equals", label: "Igual a" },
    { value: "notEquals", label: "No igual a" },
    { value: "greaterThan", label: "Mayor que" },
    { value: "lessThan", label: "Menor que" },
    { value: "greaterOrEqual", label: "≥" },
    { value: "lessOrEqual", label: "≤" },
    { value: "isEmpty", label: "Esta vacio" },
    { value: "isNotEmpty", label: "No esta vacio" },
  ],
  boolean: [{ value: "equals", label: "Igual a" }],
  select: [
    { value: "equals", label: "Igual a" },
    { value: "notEquals", label: "No igual a" },
    { value: "includes", label: "Es cualquiera de" },
  ],
  userSelect: [
    { value: "equals", label: "Igual a" },
    { value: "notEquals", label: "No igual a" },
    { value: "includes", label: "Es cualquiera de" },
  ],
  date: [
    { value: "equals", label: "Igual a" },
    { value: "notEquals", label: "No igual a" },
    { value: "before", label: "Antes de" },
    { value: "after", label: "Despues de" },
    { value: "onOrBefore", label: "En o antes de" },
    { value: "onOrAfter", label: "En o despues de" },
    { value: "isEmpty", label: "Esta vacio" },
    { value: "isNotEmpty", label: "No esta vacio" },
  ],
  attachment: [
    { value: "isEmpty", label: "Esta vacio" },
    { value: "isNotEmpty", label: "No esta vacio" },
  ],
};
