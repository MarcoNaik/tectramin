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

export type MainView = "gridView" | "formBuilder" | "debug";

export type DebugTab = "customers" | "faenas" | "taskTemplates" | "services" | "workOrders" | "users";

export const FIELD_TYPES = [
  { value: "text", label: "Text", icon: "Aa" },
  { value: "number", label: "Number", icon: "#" },
  { value: "boolean", label: "Yes/No", icon: "✓" },
  { value: "date", label: "Date", icon: "📅" },
  { value: "attachment", label: "Attachment", icon: "📎" },
  { value: "displayText", label: "Display Text", icon: "T" },
  { value: "select", label: "Select", icon: "▼" },
  { value: "userSelect", label: "User Select", icon: "👤" },
] as const;

export type FieldType = typeof FIELD_TYPES[number]["value"];

export const OPERATORS_BY_FIELD_TYPE: Record<string, { value: string; label: string }[]> = {
  text: [
    { value: "equals", label: "Equals" },
    { value: "notEquals", label: "Does not equal" },
    { value: "contains", label: "Contains" },
    { value: "isEmpty", label: "Is empty" },
    { value: "isNotEmpty", label: "Is not empty" },
  ],
  number: [
    { value: "equals", label: "Equals" },
    { value: "notEquals", label: "Does not equal" },
    { value: "greaterThan", label: "Greater than" },
    { value: "lessThan", label: "Less than" },
    { value: "greaterOrEqual", label: "≥" },
    { value: "lessOrEqual", label: "≤" },
    { value: "isEmpty", label: "Is empty" },
    { value: "isNotEmpty", label: "Is not empty" },
  ],
  boolean: [{ value: "equals", label: "Equals" }],
  select: [
    { value: "equals", label: "Equals" },
    { value: "notEquals", label: "Does not equal" },
    { value: "includes", label: "Is any of" },
  ],
  userSelect: [
    { value: "equals", label: "Equals" },
    { value: "notEquals", label: "Does not equal" },
    { value: "includes", label: "Is any of" },
  ],
  date: [
    { value: "equals", label: "Equals" },
    { value: "notEquals", label: "Does not equal" },
    { value: "before", label: "Before" },
    { value: "after", label: "After" },
    { value: "onOrBefore", label: "On or before" },
    { value: "onOrAfter", label: "On or after" },
    { value: "isEmpty", label: "Is empty" },
    { value: "isNotEmpty", label: "Is not empty" },
  ],
  attachment: [
    { value: "isEmpty", label: "Is empty" },
    { value: "isNotEmpty", label: "Is not empty" },
  ],
};
