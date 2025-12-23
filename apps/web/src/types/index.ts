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
] as const;

export type FieldType = typeof FIELD_TYPES[number]["value"];
