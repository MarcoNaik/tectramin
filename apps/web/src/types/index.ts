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
  taskTemplateDescription?: string;
  taskTemplateReadme?: string;
  order: number;
  isRequired: boolean;
  isRepeatable: boolean;
  dayNumber?: number;
  dependsOn: Id<"serviceTaskTemplates">[];
  fieldCount: number;
  fields: Array<{ label: string; fieldType: string }>;
}

export interface TaskTemplateData {
  _id: Id<"taskTemplates">;
  _creationTime: number;
  name: string;
  description?: string;
  readme?: string;
  category?: string;
  isRepeatable: boolean;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export type MainView = "gridView" | "formBuilder" | "debug" | "dataVisualization";

export type DatePreset = "today" | "thisWeek" | "thisMonth" | "allTime";

export type DebugTab = "customers" | "faenas" | "taskTemplates" | "services" | "workOrders" | "users" | "lookupEntities";

export const FIELD_TYPES = [
  { value: "text", label: "Texto", icon: "Aa" },
  { value: "number", label: "Numero", icon: "#" },
  { value: "boolean", label: "Si/No", icon: "✓" },
  { value: "date", label: "Fecha", icon: "📅" },
  { value: "attachment", label: "Adjunto", icon: "📎" },
  { value: "displayText", label: "Texto de Visualizacion", icon: "T" },
  { value: "select", label: "Seleccion", icon: "▼" },
  { value: "userSelect", label: "Seleccion de Usuario", icon: "👤" },
  { value: "entitySelect", label: "Seleccion de Entidad", icon: "🔗" },
  { value: "taskInstanceSelect", label: "Seleccion de Instancia", icon: "📋" },
  { value: "coordenated", label: "Geolocalizacion", icon: "📍" },
] as const;

export const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Texto",
  number: "Numero",
  boolean: "Si/No",
  date: "Fecha",
  attachment: "Adjunto",
  displayText: "Texto de Visualizacion",
  select: "Seleccion",
  multiSelect: "Seleccion Multiple",
  userSelect: "Seleccion de Usuario",
  multiUserSelect: "Seleccion Multiple de Usuarios",
  entitySelect: "Seleccion de Entidad",
  multiEntitySelect: "Seleccion Multiple de Entidades",
  taskInstanceSelect: "Seleccion de Instancia",
  coordenated: "Geolocalizacion",
};

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
  entitySelect: [
    { value: "equals", label: "Igual a" },
    { value: "notEquals", label: "No igual a" },
    { value: "includes", label: "Es cualquiera de" },
  ],
  multiSelect: [
    { value: "includesAny", label: "Incluye cualquiera de" },
    { value: "includesAll", label: "Incluye todos" },
    { value: "isEmpty", label: "Esta vacio" },
    { value: "isNotEmpty", label: "No esta vacio" },
  ],
  multiUserSelect: [
    { value: "includesAny", label: "Incluye cualquiera de" },
    { value: "includesAll", label: "Incluye todos" },
    { value: "isEmpty", label: "Esta vacio" },
    { value: "isNotEmpty", label: "No esta vacio" },
  ],
  multiEntitySelect: [
    { value: "includesAny", label: "Incluye cualquiera de" },
    { value: "includesAll", label: "Incluye todos" },
    { value: "isEmpty", label: "Esta vacio" },
    { value: "isNotEmpty", label: "No esta vacio" },
  ],
  coordenated: [
    { value: "isEmpty", label: "Esta vacio" },
    { value: "isNotEmpty", label: "No esta vacio" },
  ],
  taskInstanceSelect: [
    { value: "equals", label: "Igual a" },
    { value: "notEquals", label: "No igual a" },
    { value: "isEmpty", label: "Esta vacio" },
    { value: "isNotEmpty", label: "No esta vacio" },
  ],
};
