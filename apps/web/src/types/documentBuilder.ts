import type { Id } from "@packages/backend/convex/_generated/dataModel";

export interface DocumentTemplateData {
  _id: Id<"documentTemplates">;
  _creationTime: number;
  name: string;
  description?: string;
  sections: string;
  globalFilters: string;
  createdBy: string;
  isGlobalTemplate: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface GlobalFilters {
  dateRange?: { start: number; end: number };
  customerIds?: string[];
  faenaIds?: string[];
  workOrderIds?: string[];
  serviceIds?: string[];
  taskTemplateIds?: string[];
  userIds?: string[];
}

export type SectionType =
  | "header"
  | "kpiCard"
  | "kpiGrid"
  | "dataTable"
  | "groupedSummary"
  | "chart"
  | "photoGrid"
  | "textBlock"
  | "divider";

export type AggregationType = "count" | "sum" | "avg" | "min" | "max" | "distinctCount";

export type MetricFormat = "number" | "percent" | "duration" | "currency";

export type GroupByField = "user" | "faena" | "customer" | "taskTemplate" | "date" | "workOrder" | "service";

export type EntityField = "customer" | "faena" | "workOrder" | "service" | "taskTemplate" | "user" | "date" | "dayNumber" | "status";

export type ChartType = "bar" | "line" | "pie";

export interface MetricConfig {
  id: string;
  label: string;
  source: "taskCount" | "fieldValue";
  taskTemplateId?: string;
  fieldTemplateId?: string;
  aggregation: AggregationType;
  filter?: { fieldValue: string };
  format: MetricFormat;
}

export interface TableColumn {
  id: string;
  label: string;
  source: "entity" | "fieldValue";
  entityField?: EntityField;
  taskTemplateId?: string;
  fieldTemplateId?: string;
}

export interface BaseSection {
  id: string;
  type: SectionType;
}

export interface HeaderSection extends BaseSection {
  type: "header";
  title: string;
  showLogo: boolean;
  showDateRange: boolean;
  showGeneratedBy: boolean;
}

export interface KPICardSection extends BaseSection {
  type: "kpiCard";
  metric: MetricConfig;
}

export interface KPIGridSection extends BaseSection {
  type: "kpiGrid";
  columns: 2 | 3 | 4;
  metrics: MetricConfig[];
}

export interface DataTableSection extends BaseSection {
  type: "dataTable";
  columns: TableColumn[];
  sortBy?: { column: string; direction: "asc" | "desc" };
  limit?: number;
  groupBy?: GroupByField;
  showSubtotals?: boolean;
}

export interface GroupedSummarySection extends BaseSection {
  type: "groupedSummary";
  title: string;
  groupBy: GroupByField;
  metric: MetricConfig;
  sortBy: "value" | "label";
  sortDirection: "asc" | "desc";
  limit?: number;
}

export interface ChartSection extends BaseSection {
  type: "chart";
  chartType: ChartType;
  xAxis: { field: GroupByField };
  yAxis: MetricConfig;
  series?: { field: GroupByField };
}

export interface PhotoGridSection extends BaseSection {
  type: "photoGrid";
  taskTemplateId: string;
  fieldTemplateId: string;
  columns: 2 | 3 | 4;
  showMetadata: boolean;
}

export interface TextBlockSection extends BaseSection {
  type: "textBlock";
  content: string;
  style: "normal" | "heading" | "note";
}

export interface DividerSection extends BaseSection {
  type: "divider";
  style: "line" | "space";
}

export type DocumentSection =
  | HeaderSection
  | KPICardSection
  | KPIGridSection
  | DataTableSection
  | GroupedSummarySection
  | ChartSection
  | PhotoGridSection
  | TextBlockSection
  | DividerSection;

export interface DocumentTemplate {
  name: string;
  description?: string;
  sections: DocumentSection[];
  globalFilters: GlobalFilters;
}

export const SECTION_TYPES = [
  { value: "header", label: "Encabezado", icon: "📄", description: "Titulo, logo y metadata" },
  { value: "kpiCard", label: "KPI Card", icon: "📊", description: "Metrica individual" },
  { value: "kpiGrid", label: "KPI Grid", icon: "📊", description: "Multiples metricas en grilla" },
  { value: "dataTable", label: "Tabla de Datos", icon: "📋", description: "Datos en filas con columnas" },
  { value: "groupedSummary", label: "Resumen Agrupado", icon: "📈", description: "Datos agrupados por dimension" },
  { value: "chart", label: "Grafico", icon: "📉", description: "Visualizacion grafica" },
  { value: "photoGrid", label: "Galeria de Fotos", icon: "🖼️", description: "Imagenes de campos adjuntos" },
  { value: "textBlock", label: "Bloque de Texto", icon: "📝", description: "Texto estatico o dinamico" },
  { value: "divider", label: "Separador", icon: "—", description: "Linea o espacio" },
] as const;

export const AGGREGATION_TYPES = [
  { value: "count", label: "Contar" },
  { value: "sum", label: "Sumar" },
  { value: "avg", label: "Promedio" },
  { value: "min", label: "Minimo" },
  { value: "max", label: "Maximo" },
  { value: "distinctCount", label: "Contar Unicos" },
] as const;

export const METRIC_FORMATS = [
  { value: "number", label: "Numero" },
  { value: "percent", label: "Porcentaje" },
  { value: "duration", label: "Duracion" },
  { value: "currency", label: "Moneda" },
] as const;

export const GROUP_BY_FIELDS = [
  { value: "user", label: "Usuario" },
  { value: "faena", label: "Faena" },
  { value: "customer", label: "Cliente" },
  { value: "taskTemplate", label: "Tarea" },
  { value: "date", label: "Fecha" },
  { value: "workOrder", label: "Orden de Trabajo" },
  { value: "service", label: "Servicio" },
] as const;

export const ENTITY_FIELDS = [
  { value: "customer", label: "Cliente" },
  { value: "faena", label: "Faena" },
  { value: "workOrder", label: "Orden de Trabajo" },
  { value: "service", label: "Servicio" },
  { value: "taskTemplate", label: "Tarea" },
  { value: "user", label: "Usuario" },
  { value: "date", label: "Fecha" },
  { value: "dayNumber", label: "Numero de Dia" },
  { value: "status", label: "Estado" },
] as const;

export const CHART_TYPES = [
  { value: "bar", label: "Barras" },
  { value: "line", label: "Lineas" },
  { value: "pie", label: "Pastel" },
] as const;

export function createDefaultSection(type: SectionType): DocumentSection {
  const id = crypto.randomUUID();

  switch (type) {
    case "header":
      return {
        id,
        type: "header",
        title: "Nuevo Documento",
        showLogo: true,
        showDateRange: true,
        showGeneratedBy: true,
      };
    case "kpiCard":
      return {
        id,
        type: "kpiCard",
        metric: {
          id: crypto.randomUUID(),
          label: "Nueva Metrica",
          source: "taskCount",
          aggregation: "count",
          format: "number",
        },
      };
    case "kpiGrid":
      return {
        id,
        type: "kpiGrid",
        columns: 3,
        metrics: [],
      };
    case "dataTable":
      return {
        id,
        type: "dataTable",
        columns: [],
        limit: 50,
      };
    case "groupedSummary":
      return {
        id,
        type: "groupedSummary",
        title: "Resumen",
        groupBy: "user",
        metric: {
          id: crypto.randomUUID(),
          label: "Total",
          source: "taskCount",
          aggregation: "count",
          format: "number",
        },
        sortBy: "value",
        sortDirection: "desc",
        limit: 10,
      };
    case "chart":
      return {
        id,
        type: "chart",
        chartType: "bar",
        xAxis: { field: "user" },
        yAxis: {
          id: crypto.randomUUID(),
          label: "Total",
          source: "taskCount",
          aggregation: "count",
          format: "number",
        },
      };
    case "photoGrid":
      return {
        id,
        type: "photoGrid",
        taskTemplateId: "",
        fieldTemplateId: "",
        columns: 4,
        showMetadata: true,
      };
    case "textBlock":
      return {
        id,
        type: "textBlock",
        content: "",
        style: "normal",
      };
    case "divider":
      return {
        id,
        type: "divider",
        style: "line",
      };
  }
}

export function parseDocumentSections(sectionsJson: string): DocumentSection[] {
  try {
    return JSON.parse(sectionsJson) as DocumentSection[];
  } catch {
    return [];
  }
}

export function parseGlobalFilters(filtersJson: string): GlobalFilters {
  try {
    return JSON.parse(filtersJson) as GlobalFilters;
  } catch {
    return {};
  }
}

export function stringifySections(sections: DocumentSection[]): string {
  return JSON.stringify(sections);
}

export function stringifyFilters(filters: GlobalFilters): string {
  return JSON.stringify(filters);
}
