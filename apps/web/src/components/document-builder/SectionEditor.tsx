"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import {
  type DocumentSection,
  type HeaderSection,
  type KPICardSection,
  type KPIGridSection,
  type DataTableSection,
  type GroupedSummarySection,
  type ChartSection,
  type PhotoGridSection,
  type TextBlockSection,
  type DividerSection,
  type MetricConfig,
  type TableColumn,
  SECTION_TYPES,
  AGGREGATION_TYPES,
  METRIC_FORMATS,
  GROUP_BY_FIELDS,
  CHART_TYPES,
  ENTITY_FIELDS,
} from "@/types/documentBuilder";

interface SectionEditorProps {
  section: DocumentSection | undefined;
  onUpdate: (updates: Partial<DocumentSection>) => void;
}

function HeaderEditor({
  section,
  onUpdate,
}: {
  section: HeaderSection;
  onUpdate: (updates: Partial<HeaderSection>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold mb-1">Titulo</label>
        <input
          type="text"
          value={section.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="w-full border-2 border-black px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={section.showLogo}
            onChange={(e) => onUpdate({ showLogo: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm">Mostrar logo</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={section.showDateRange}
            onChange={(e) => onUpdate({ showDateRange: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm">Mostrar rango de fechas</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={section.showGeneratedBy}
            onChange={(e) => onUpdate({ showGeneratedBy: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm">Mostrar &quot;Generado por&quot;</span>
        </label>
      </div>
    </div>
  );
}

function MetricEditor({
  metric,
  onUpdate,
}: {
  metric: MetricConfig;
  onUpdate: (updates: Partial<MetricConfig>) => void;
}) {
  const taskTemplates = useQuery(api.admin.taskTemplates.listActive);
  const selectedTaskId = metric.taskTemplateId;
  const fieldTemplates = useQuery(
    api.admin.fieldTemplates.listByTaskTemplate,
    selectedTaskId ? { taskTemplateId: selectedTaskId as Id<"taskTemplates"> } : "skip"
  );

  const numericFieldTypes = ["number", "currency", "slider", "calculated"];

  return (
    <div className="border-2 border-gray-200 p-3 space-y-3">
      <div>
        <label className="block text-xs font-bold mb-1">Etiqueta</label>
        <input
          type="text"
          value={metric.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="w-full border-2 border-black px-2 py-1 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-bold mb-1">Fuente</label>
        <select
          value={metric.source}
          onChange={(e) => onUpdate({
            source: e.target.value as MetricConfig["source"],
            fieldTemplateId: undefined,
          })}
          className="w-full border-2 border-black px-2 py-1 text-sm"
        >
          <option value="taskCount">Contar Tareas</option>
          <option value="fieldValue">Valor de Campo</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold mb-1">Tarea</label>
        <select
          value={metric.taskTemplateId ?? ""}
          onChange={(e) => onUpdate({
            taskTemplateId: e.target.value || undefined,
            fieldTemplateId: undefined,
          })}
          className="w-full border-2 border-black px-2 py-1 text-sm"
        >
          <option value="">Todas las tareas</option>
          {taskTemplates?.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {metric.source === "fieldValue" && (
        <div>
          <label className="block text-xs font-bold mb-1">Campo</label>
          <select
            value={metric.fieldTemplateId ?? ""}
            onChange={(e) => onUpdate({ fieldTemplateId: e.target.value || undefined })}
            className="w-full border-2 border-black px-2 py-1 text-sm"
            disabled={!selectedTaskId}
          >
            <option value="">Seleccionar campo</option>
            {fieldTemplates?.map((f) => (
              <option key={f._id} value={f._id}>
                {f.label} ({f.fieldType})
              </option>
            ))}
          </select>
          {!selectedTaskId && (
            <p className="text-xs text-amber-600 mt-1">Selecciona una tarea primero</p>
          )}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold mb-1">Agregacion</label>
        <select
          value={metric.aggregation}
          onChange={(e) => onUpdate({ aggregation: e.target.value as MetricConfig["aggregation"] })}
          className="w-full border-2 border-black px-2 py-1 text-sm"
        >
          {AGGREGATION_TYPES.map((agg) => (
            <option key={agg.value} value={agg.value}>
              {agg.label}
            </option>
          ))}
        </select>
      </div>

      {metric.source === "fieldValue" && metric.aggregation === "count" && (
        <div>
          <label className="block text-xs font-bold mb-1">Filtrar por valor (opcional)</label>
          <input
            type="text"
            value={metric.filter?.fieldValue ?? ""}
            onChange={(e) => onUpdate({
              filter: e.target.value ? { fieldValue: e.target.value } : undefined
            })}
            className="w-full border-2 border-black px-2 py-1 text-sm"
            placeholder="Ej: Si, Completado, etc."
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-bold mb-1">Formato</label>
        <select
          value={metric.format}
          onChange={(e) => onUpdate({ format: e.target.value as MetricConfig["format"] })}
          className="w-full border-2 border-black px-2 py-1 text-sm"
        >
          {METRIC_FORMATS.map((fmt) => (
            <option key={fmt.value} value={fmt.value}>
              {fmt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function KPICardEditor({
  section,
  onUpdate,
}: {
  section: KPICardSection;
  onUpdate: (updates: Partial<KPICardSection>) => void;
}) {
  return (
    <div className="space-y-4">
      <h4 className="font-bold text-sm">Metrica</h4>
      <MetricEditor
        metric={section.metric}
        onUpdate={(metricUpdates) =>
          onUpdate({ metric: { ...section.metric, ...metricUpdates } })
        }
      />
    </div>
  );
}

function KPIGridEditor({
  section,
  onUpdate,
}: {
  section: KPIGridSection;
  onUpdate: (updates: Partial<KPIGridSection>) => void;
}) {
  const addMetric = () => {
    const newMetric: MetricConfig = {
      id: crypto.randomUUID(),
      label: "Nueva Metrica",
      source: "taskCount",
      aggregation: "count",
      format: "number",
    };
    onUpdate({ metrics: [...section.metrics, newMetric] });
  };

  const updateMetric = (index: number, updates: Partial<MetricConfig>) => {
    const newMetrics = [...section.metrics];
    newMetrics[index] = { ...newMetrics[index], ...updates };
    onUpdate({ metrics: newMetrics });
  };

  const removeMetric = (index: number) => {
    onUpdate({ metrics: section.metrics.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold mb-1">Columnas</label>
        <select
          value={section.columns}
          onChange={(e) => onUpdate({ columns: Number(e.target.value) as 2 | 3 | 4 })}
          className="w-full border-2 border-black px-3 py-2"
        >
          <option value={2}>2 columnas</option>
          <option value={3}>3 columnas</option>
          <option value={4}>4 columnas</option>
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-sm">Metricas</h4>
          <button
            onClick={addMetric}
            className="text-sm text-blue-600 hover:underline"
          >
            + Agregar
          </button>
        </div>

        {section.metrics.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Sin metricas</p>
        ) : (
          <div className="space-y-3">
            {section.metrics.map((metric, index) => (
              <div key={metric.id} className="relative">
                <button
                  onClick={() => removeMetric(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                >
                  ×
                </button>
                <MetricEditor
                  metric={metric}
                  onUpdate={(updates) => updateMetric(index, updates)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DataTableEditor({
  section,
  onUpdate,
}: {
  section: DataTableSection;
  onUpdate: (updates: Partial<DataTableSection>) => void;
}) {
  const taskTemplates = useQuery(api.admin.taskTemplates.listActive);

  const addColumn = (type: "entity" | "field") => {
    const newColumn: TableColumn = {
      id: crypto.randomUUID(),
      label: type === "entity" ? "Nueva Columna" : "Campo",
      source: type === "entity" ? "entity" : "fieldValue",
      entityField: type === "entity" ? "date" : undefined,
    };
    onUpdate({ columns: [...section.columns, newColumn] });
  };

  const updateColumn = (index: number, updates: Partial<TableColumn>) => {
    const newColumns = [...section.columns];
    newColumns[index] = { ...newColumns[index], ...updates };
    onUpdate({ columns: newColumns });
  };

  const removeColumn = (index: number) => {
    onUpdate({ columns: section.columns.filter((_, i) => i !== index) });
  };

  const moveColumn = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= section.columns.length) return;
    const newColumns = [...section.columns];
    [newColumns[index], newColumns[newIndex]] = [newColumns[newIndex], newColumns[index]];
    onUpdate({ columns: newColumns });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => addColumn("entity")}
          className="flex-1 px-2 py-1 text-xs border-2 border-black hover:bg-gray-100"
        >
          + Entidad
        </button>
        <button
          onClick={() => addColumn("field")}
          className="flex-1 px-2 py-1 text-xs border-2 border-black hover:bg-gray-100"
        >
          + Campo
        </button>
      </div>

      {section.columns.length === 0 ? (
        <p className="text-sm text-gray-500 italic">Sin columnas</p>
      ) : (
        <div className="space-y-2">
          {section.columns.map((col, index) => (
            <ColumnEditor
              key={col.id}
              column={col}
              index={index}
              total={section.columns.length}
              taskTemplates={taskTemplates ?? []}
              onUpdate={(updates) => updateColumn(index, updates)}
              onRemove={() => removeColumn(index)}
              onMove={(dir) => moveColumn(index, dir)}
            />
          ))}
        </div>
      )}

      <div className="border-t pt-4">
        <label className="block text-sm font-bold mb-1">Limite de filas</label>
        <input
          type="number"
          value={section.limit ?? ""}
          onChange={(e) => onUpdate({ limit: e.target.value ? Number(e.target.value) : undefined })}
          className="w-full border-2 border-black px-3 py-2"
          placeholder="Sin limite"
        />
      </div>

      <div>
        <label className="block text-sm font-bold mb-1">Agrupar por</label>
        <select
          value={section.groupBy ?? ""}
          onChange={(e) => onUpdate({ groupBy: e.target.value as DataTableSection["groupBy"] || undefined })}
          className="w-full border-2 border-black px-3 py-2"
        >
          <option value="">Sin agrupar</option>
          {GROUP_BY_FIELDS.map((field) => (
            <option key={field.value} value={field.value}>
              {field.label}
            </option>
          ))}
        </select>
      </div>

      {section.groupBy && (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={section.showSubtotals ?? false}
            onChange={(e) => onUpdate({ showSubtotals: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm">Mostrar subtotales</span>
        </label>
      )}
    </div>
  );
}

function ColumnEditor({
  column,
  index,
  total,
  taskTemplates,
  onUpdate,
  onRemove,
  onMove,
}: {
  column: TableColumn;
  index: number;
  total: number;
  taskTemplates: Array<{ _id: string; name: string }>;
  onUpdate: (updates: Partial<TableColumn>) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
}) {
  const selectedTaskId = column.taskTemplateId;
  const fieldTemplates = useQuery(
    api.admin.fieldTemplates.listByTaskTemplate,
    selectedTaskId ? { taskTemplateId: selectedTaskId as Id<"taskTemplates"> } : "skip"
  );

  return (
    <div className="border-2 border-gray-200 p-2 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <button
            onClick={() => onMove("up")}
            disabled={index === 0}
            className="p-1 hover:bg-gray-100 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            onClick={() => onMove("down")}
            disabled={index === total - 1}
            className="p-1 hover:bg-gray-100 disabled:opacity-30"
          >
            ↓
          </button>
        </div>
        <button onClick={onRemove} className="text-red-500 text-sm">
          ×
        </button>
      </div>

      <div>
        <label className="block text-xs font-bold mb-1">Etiqueta</label>
        <input
          type="text"
          value={column.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="w-full border-2 border-black px-2 py-1 text-sm"
        />
      </div>

      {column.source === "entity" ? (
        <div>
          <label className="block text-xs font-bold mb-1">Campo de Entidad</label>
          <select
            value={column.entityField ?? ""}
            onChange={(e) => onUpdate({ entityField: e.target.value as TableColumn["entityField"] })}
            className="w-full border-2 border-black px-2 py-1 text-sm"
          >
            {ENTITY_FIELDS.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <div>
            <label className="block text-xs font-bold mb-1">Tarea</label>
            <select
              value={column.taskTemplateId ?? ""}
              onChange={(e) => onUpdate({
                taskTemplateId: e.target.value || undefined,
                fieldTemplateId: undefined,
              })}
              className="w-full border-2 border-black px-2 py-1 text-sm"
            >
              <option value="">Seleccionar tarea</option>
              {taskTemplates.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Campo</label>
            <select
              value={column.fieldTemplateId ?? ""}
              onChange={(e) => onUpdate({ fieldTemplateId: e.target.value || undefined })}
              className="w-full border-2 border-black px-2 py-1 text-sm"
              disabled={!selectedTaskId}
            >
              <option value="">Seleccionar campo</option>
              {fieldTemplates?.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
}

function GroupedSummaryEditor({
  section,
  onUpdate,
}: {
  section: GroupedSummarySection;
  onUpdate: (updates: Partial<GroupedSummarySection>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold mb-1">Titulo</label>
        <input
          type="text"
          value={section.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="w-full border-2 border-black px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-bold mb-1">Agrupar por</label>
        <select
          value={section.groupBy}
          onChange={(e) => onUpdate({ groupBy: e.target.value as GroupedSummarySection["groupBy"] })}
          className="w-full border-2 border-black px-3 py-2"
        >
          {GROUP_BY_FIELDS.map((field) => (
            <option key={field.value} value={field.value}>
              {field.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h4 className="font-bold text-sm mb-2">Metrica</h4>
        <MetricEditor
          metric={section.metric}
          onUpdate={(metricUpdates) =>
            onUpdate({ metric: { ...section.metric, ...metricUpdates } })
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold mb-1">Ordenar por</label>
          <select
            value={section.sortBy}
            onChange={(e) => onUpdate({ sortBy: e.target.value as "value" | "label" })}
            className="w-full border-2 border-black px-3 py-2"
          >
            <option value="value">Valor</option>
            <option value="label">Nombre</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Direccion</label>
          <select
            value={section.sortDirection}
            onChange={(e) => onUpdate({ sortDirection: e.target.value as "asc" | "desc" })}
            className="w-full border-2 border-black px-3 py-2"
          >
            <option value="desc">Descendente</option>
            <option value="asc">Ascendente</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold mb-1">Limite</label>
        <input
          type="number"
          value={section.limit ?? ""}
          onChange={(e) => onUpdate({ limit: e.target.value ? Number(e.target.value) : undefined })}
          className="w-full border-2 border-black px-3 py-2"
          placeholder="Sin limite"
        />
      </div>
    </div>
  );
}

function ChartEditor({
  section,
  onUpdate,
}: {
  section: ChartSection;
  onUpdate: (updates: Partial<ChartSection>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold mb-1">Tipo de grafico</label>
        <select
          value={section.chartType}
          onChange={(e) => onUpdate({ chartType: e.target.value as ChartSection["chartType"] })}
          className="w-full border-2 border-black px-3 py-2"
        >
          {CHART_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-bold mb-1">Eje X (Dimension)</label>
        <select
          value={section.xAxis.field}
          onChange={(e) => onUpdate({ xAxis: { field: e.target.value as ChartSection["xAxis"]["field"] } })}
          className="w-full border-2 border-black px-3 py-2"
        >
          {GROUP_BY_FIELDS.map((field) => (
            <option key={field.value} value={field.value}>
              {field.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h4 className="font-bold text-sm mb-2">Eje Y (Metrica)</h4>
        <MetricEditor
          metric={section.yAxis}
          onUpdate={(metricUpdates) =>
            onUpdate({ yAxis: { ...section.yAxis, ...metricUpdates } })
          }
        />
      </div>

      <div>
        <label className="block text-sm font-bold mb-1">Series (opcional)</label>
        <select
          value={section.series?.field ?? ""}
          onChange={(e) => onUpdate({
            series: e.target.value ? { field: e.target.value as ChartSection["xAxis"]["field"] } : undefined
          })}
          className="w-full border-2 border-black px-3 py-2"
        >
          <option value="">Sin series</option>
          {GROUP_BY_FIELDS.map((field) => (
            <option key={field.value} value={field.value}>
              {field.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PhotoGridEditor({
  section,
  onUpdate,
}: {
  section: PhotoGridSection;
  onUpdate: (updates: Partial<PhotoGridSection>) => void;
}) {
  const taskTemplates = useQuery(api.admin.taskTemplates.listActive);
  const fieldTemplates = useQuery(
    api.admin.fieldTemplates.listByTaskTemplate,
    section.taskTemplateId ? { taskTemplateId: section.taskTemplateId as Id<"taskTemplates"> } : "skip"
  );

  const attachmentFields = fieldTemplates?.filter(
    (f) => f.fieldType === "photo" || f.fieldType === "signature" || f.fieldType === "file"
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold mb-1">Tarea</label>
        <select
          value={section.taskTemplateId}
          onChange={(e) => onUpdate({
            taskTemplateId: e.target.value,
            fieldTemplateId: "",
          })}
          className="w-full border-2 border-black px-3 py-2"
        >
          <option value="">Seleccionar tarea</option>
          {taskTemplates?.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-bold mb-1">Campo de imagen</label>
        <select
          value={section.fieldTemplateId}
          onChange={(e) => onUpdate({ fieldTemplateId: e.target.value })}
          className="w-full border-2 border-black px-3 py-2"
          disabled={!section.taskTemplateId}
        >
          <option value="">Seleccionar campo</option>
          {attachmentFields?.map((f) => (
            <option key={f._id} value={f._id}>
              {f.label} ({f.fieldType})
            </option>
          ))}
        </select>
        {!section.taskTemplateId && (
          <p className="text-xs text-amber-600 mt-1">Selecciona una tarea primero</p>
        )}
        {section.taskTemplateId && attachmentFields?.length === 0 && (
          <p className="text-xs text-amber-600 mt-1">Esta tarea no tiene campos de imagen</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-bold mb-1">Columnas</label>
        <select
          value={section.columns}
          onChange={(e) => onUpdate({ columns: Number(e.target.value) as 2 | 3 | 4 })}
          className="w-full border-2 border-black px-3 py-2"
        >
          <option value={2}>2 columnas</option>
          <option value={3}>3 columnas</option>
          <option value={4}>4 columnas</option>
        </select>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={section.showMetadata}
          onChange={(e) => onUpdate({ showMetadata: e.target.checked })}
          className="w-4 h-4"
        />
        <span className="text-sm">Mostrar metadata (fecha, usuario, faena)</span>
      </label>
    </div>
  );
}

function TextBlockEditor({
  section,
  onUpdate,
}: {
  section: TextBlockSection;
  onUpdate: (updates: Partial<TextBlockSection>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold mb-1">Estilo</label>
        <select
          value={section.style}
          onChange={(e) => onUpdate({ style: e.target.value as TextBlockSection["style"] })}
          className="w-full border-2 border-black px-3 py-2"
        >
          <option value="normal">Normal</option>
          <option value="heading">Encabezado</option>
          <option value="note">Nota</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-bold mb-1">Contenido</label>
        <textarea
          value={section.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          className="w-full border-2 border-black px-3 py-2 h-32"
          placeholder="Escribe el contenido aqui..."
        />
      </div>
    </div>
  );
}

function DividerEditor({
  section,
  onUpdate,
}: {
  section: DividerSection;
  onUpdate: (updates: Partial<DividerSection>) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-bold mb-1">Estilo</label>
      <select
        value={section.style}
        onChange={(e) => onUpdate({ style: e.target.value as DividerSection["style"] })}
        className="w-full border-2 border-black px-3 py-2"
      >
        <option value="line">Linea</option>
        <option value="space">Espacio</option>
      </select>
    </div>
  );
}

export function SectionEditor({ section, onUpdate }: SectionEditorProps) {
  if (!section) {
    return (
      <div className="w-72 border-l-2 border-black bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-center px-6">
          Selecciona una seccion para configurarla
        </p>
      </div>
    );
  }

  const sectionType = SECTION_TYPES.find((s) => s.value === section.type);

  return (
    <div className="w-72 border-l-2 border-black bg-gray-50 flex flex-col">
      <div className="p-3 border-b-2 border-black">
        <div className="flex items-center gap-2">
          <span>{sectionType?.icon}</span>
          <h2 className="font-bold">{sectionType?.label}</h2>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {section.type === "header" && (
          <HeaderEditor section={section} onUpdate={onUpdate} />
        )}
        {section.type === "kpiCard" && (
          <KPICardEditor section={section} onUpdate={onUpdate} />
        )}
        {section.type === "kpiGrid" && (
          <KPIGridEditor section={section} onUpdate={onUpdate} />
        )}
        {section.type === "dataTable" && (
          <DataTableEditor section={section} onUpdate={onUpdate} />
        )}
        {section.type === "groupedSummary" && (
          <GroupedSummaryEditor section={section} onUpdate={onUpdate} />
        )}
        {section.type === "chart" && (
          <ChartEditor section={section} onUpdate={onUpdate} />
        )}
        {section.type === "photoGrid" && (
          <PhotoGridEditor section={section} onUpdate={onUpdate} />
        )}
        {section.type === "textBlock" && (
          <TextBlockEditor section={section} onUpdate={onUpdate} />
        )}
        {section.type === "divider" && (
          <DividerEditor section={section} onUpdate={onUpdate} />
        )}
      </div>
    </div>
  );
}
