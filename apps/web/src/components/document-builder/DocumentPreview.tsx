"use client";

import { useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type {
  DocumentSection,
  GlobalFilters,
  MetricConfig,
  HeaderSection,
  KPICardSection,
  KPIGridSection,
  DataTableSection,
  GroupedSummarySection,
  ChartSection,
  PhotoGridSection,
  TextBlockSection,
  DividerSection,
} from "@/types/documentBuilder";

interface DocumentPreviewProps {
  sections: DocumentSection[];
  globalFilters: GlobalFilters;
  documentName: string;
  onClose: () => void;
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];

function formatMetricValue(value: number, format: MetricConfig["format"]): string {
  switch (format) {
    case "number":
      return value.toLocaleString("es-CL");
    case "percent":
      return `${(value * 100).toFixed(1)}%`;
    case "duration": {
      const hours = Math.floor(value / 60);
      const minutes = Math.round(value % 60);
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }
    case "currency":
      return `$${value.toLocaleString("es-CL")}`;
    default:
      return String(value);
  }
}

function HeaderPreview({
  section,
  globalFilters,
}: {
  section: HeaderSection;
  globalFilters: GlobalFilters;
}) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="text-center py-6 border-b-2 border-black print:border-gray-400">
      {section.showLogo && (
        <div className="mb-4 flex justify-center">
          <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs print:border print:border-gray-300">
            LOGO
          </div>
        </div>
      )}
      <h1 className="text-2xl font-bold">{section.title}</h1>
      {section.showDateRange && globalFilters.dateRange && (
        <p className="text-sm text-gray-600 mt-2">
          {formatDate(globalFilters.dateRange.start)} - {formatDate(globalFilters.dateRange.end)}
        </p>
      )}
      {section.showGeneratedBy && (
        <p className="text-xs text-gray-400 mt-1">
          Generado el {formatDate(Date.now())}
        </p>
      )}
    </div>
  );
}

function KPICardPreview({
  section,
  globalFilters,
}: {
  section: KPICardSection;
  globalFilters: GlobalFilters;
}) {
  const value = useQuery(api.admin.documentData.computeMetric, {
    metric: section.metric,
    filters: globalFilters,
  });

  return (
    <div className="flex justify-center py-4">
      <div className="text-center border-2 border-black px-8 py-4 print:border-gray-400">
        <div className="text-4xl font-bold text-blue-600 print:text-black">
          {value !== undefined ? formatMetricValue(value, section.metric.format) : "..."}
        </div>
        <div className="text-sm text-gray-600 mt-1">{section.metric.label}</div>
      </div>
    </div>
  );
}

function KPIGridPreview({
  section,
  globalFilters,
}: {
  section: KPIGridSection;
  globalFilters: GlobalFilters;
}) {
  const gridClass = section.columns === 2 ? "grid-cols-2" : section.columns === 3 ? "grid-cols-3" : "grid-cols-4";

  return (
    <div className={`grid ${gridClass} gap-4 py-4`}>
      {section.metrics.map((metric) => (
        <KPIMetricCard key={metric.id} metric={metric} globalFilters={globalFilters} />
      ))}
    </div>
  );
}

function KPIMetricCard({
  metric,
  globalFilters,
}: {
  metric: MetricConfig;
  globalFilters: GlobalFilters;
}) {
  const value = useQuery(api.admin.documentData.computeMetric, {
    metric,
    filters: globalFilters,
  });

  return (
    <div className="text-center border-2 border-black px-4 py-3 print:border-gray-400">
      <div className="text-2xl font-bold text-blue-600 print:text-black">
        {value !== undefined ? formatMetricValue(value, metric.format) : "..."}
      </div>
      <div className="text-sm text-gray-600">{metric.label}</div>
    </div>
  );
}

function DataTablePreview({
  section,
  globalFilters,
}: {
  section: DataTableSection;
  globalFilters: GlobalFilters;
}) {
  const data = useQuery(api.admin.documentData.getTableData, {
    columns: section.columns,
    filters: globalFilters,
    sortBy: section.sortBy,
    limit: section.limit,
  });

  if (!data) {
    return (
      <div className="py-4 text-center text-gray-500">Cargando datos...</div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-4 text-center text-gray-500">Sin datos para mostrar</div>
    );
  }

  return (
    <div className="py-4 overflow-x-auto">
      <table className="w-full border-2 border-black print:border-gray-400">
        <thead>
          <tr className="bg-gray-100">
            {section.columns.map((col) => (
              <th key={col.id} className="px-4 py-2 text-left text-sm font-bold border-b-2 border-black print:border-gray-400">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              {section.columns.map((col) => (
                <td key={col.id} className="px-4 py-2 text-sm border-b border-gray-200">
                  {row[col.id] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {section.limit && data.length >= section.limit && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          Mostrando {section.limit} de posiblemente mas filas
        </p>
      )}
    </div>
  );
}

function GroupedSummaryPreview({
  section,
  globalFilters,
}: {
  section: GroupedSummarySection;
  globalFilters: GlobalFilters;
}) {
  const data = useQuery(api.admin.documentData.computeGroupedMetric, {
    groupBy: section.groupBy,
    metric: section.metric,
    filters: globalFilters,
    sortBy: section.sortBy,
    sortDirection: section.sortDirection,
    limit: section.limit,
  });

  if (!data) {
    return (
      <div className="py-4 text-center text-gray-500">Cargando datos...</div>
    );
  }

  return (
    <div className="py-4">
      <h3 className="font-bold mb-3">{section.title}</h3>
      {data.length === 0 ? (
        <p className="text-gray-500 text-sm">Sin datos para mostrar</p>
      ) : (
        <div className="space-y-1">
          {data.map((item) => (
            <div
              key={item.groupKey}
              className="flex justify-between items-center py-2 border-b border-gray-200"
            >
              <span className="text-sm">{item.groupLabel}</span>
              <span className="font-bold">{formatMetricValue(item.value, section.metric.format)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChartPreview({
  section,
  globalFilters,
}: {
  section: ChartSection;
  globalFilters: GlobalFilters;
}) {
  const data = useQuery(api.admin.documentData.computeGroupedMetric, {
    groupBy: section.xAxis.field,
    metric: section.yAxis,
    filters: globalFilters,
    sortBy: "label",
    sortDirection: "asc",
    limit: 20,
  });

  if (!data) {
    return (
      <div className="py-4 h-64 flex items-center justify-center text-gray-500">
        Cargando grafico...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-4 h-64 flex items-center justify-center text-gray-500">
        Sin datos para el grafico
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: item.groupLabel,
    value: item.value,
  }));

  return (
    <div className="py-4">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {section.chartType === "bar" ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          ) : section.chartType === "line" ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          ) : (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: { name: string; percent: number }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PhotoGridPreview({
  section,
  globalFilters,
}: {
  section: PhotoGridSection;
  globalFilters: GlobalFilters;
}) {
  const photos = useQuery(
    api.admin.documentData.getPhotoGridData,
    section.taskTemplateId && section.fieldTemplateId
      ? {
          taskTemplateId: section.taskTemplateId,
          fieldTemplateId: section.fieldTemplateId,
          filters: globalFilters,
          limit: 20,
        }
      : "skip"
  );

  if (!section.taskTemplateId || !section.fieldTemplateId) {
    return (
      <div className="py-4 text-center text-gray-500">
        Configura la tarea y campo de imagen
      </div>
    );
  }

  if (!photos) {
    return (
      <div className="py-4 text-center text-gray-500">Cargando fotos...</div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="py-4 text-center text-gray-500">Sin fotos para mostrar</div>
    );
  }

  const gridClass = section.columns === 2 ? "grid-cols-2" : section.columns === 3 ? "grid-cols-3" : "grid-cols-4";

  return (
    <div className="py-4">
      <div className={`grid ${gridClass} gap-3`}>
        {photos.map((photo, index) => (
          <div key={index} className="border-2 border-black print:border-gray-400">
            {photo.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.url}
                alt={photo.fileName}
                className="w-full aspect-square object-cover"
              />
            ) : (
              <div className="w-full aspect-square bg-gray-100 flex items-center justify-center text-gray-400">
                Sin imagen
              </div>
            )}
            {section.showMetadata && (
              <div className="p-2 border-t-2 border-black text-xs print:border-gray-400">
                <div className="font-bold truncate">{photo.fileName}</div>
                <div className="text-gray-500">{photo.date}</div>
                <div className="text-gray-500 truncate">{photo.user}</div>
                <div className="text-gray-500 truncate">{photo.faena}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TextBlockPreview({ section }: { section: TextBlockSection }) {
  const styleClasses = {
    normal: "",
    heading: "text-lg font-bold",
    note: "text-sm text-gray-600 italic",
  };

  return (
    <div className={`py-4 ${styleClasses[section.style]}`}>
      {section.content || "[Texto del bloque]"}
    </div>
  );
}

function DividerPreview({ section }: { section: DividerSection }) {
  return section.style === "line" ? (
    <hr className="my-4 border-t-2 border-black print:border-gray-400" />
  ) : (
    <div className="h-8" />
  );
}

function SectionPreviewRenderer({
  section,
  globalFilters,
}: {
  section: DocumentSection;
  globalFilters: GlobalFilters;
}) {
  switch (section.type) {
    case "header":
      return <HeaderPreview section={section} globalFilters={globalFilters} />;
    case "kpiCard":
      return <KPICardPreview section={section} globalFilters={globalFilters} />;
    case "kpiGrid":
      return <KPIGridPreview section={section} globalFilters={globalFilters} />;
    case "dataTable":
      return <DataTablePreview section={section} globalFilters={globalFilters} />;
    case "groupedSummary":
      return <GroupedSummaryPreview section={section} globalFilters={globalFilters} />;
    case "chart":
      return <ChartPreview section={section} globalFilters={globalFilters} />;
    case "photoGrid":
      return <PhotoGridPreview section={section} globalFilters={globalFilters} />;
    case "textBlock":
      return <TextBlockPreview section={section} />;
    case "divider":
      return <DividerPreview section={section} />;
    default:
      return <div className="py-4 text-gray-400">Seccion desconocida</div>;
  }
}

export function DocumentPreview({
  sections,
  globalFilters,
  documentName,
  onClose,
}: DocumentPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${documentName}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            .page-break {
              page-break-after: always;
            }
            @media print {
              body { padding: 0; }
            }
            .border-2 { border: 2px solid #000; }
            .border-b { border-bottom: 1px solid #e5e7eb; }
            .border-b-2 { border-bottom: 2px solid #000; }
            .border-t-2 { border-top: 2px solid #000; }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .font-bold { font-weight: 700; }
            .text-2xl { font-size: 1.5rem; }
            .text-4xl { font-size: 2.25rem; }
            .text-sm { font-size: 0.875rem; }
            .text-xs { font-size: 0.75rem; }
            .text-lg { font-size: 1.125rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
            .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
            .py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
            .px-4 { padding-left: 1rem; padding-right: 1rem; }
            .px-8 { padding-left: 2rem; padding-right: 2rem; }
            .p-2 { padding: 0.5rem; }
            .mt-1 { margin-top: 0.25rem; }
            .mt-2 { margin-top: 0.5rem; }
            .mb-3 { margin-bottom: 0.75rem; }
            .mb-4 { margin-bottom: 1rem; }
            .my-4 { margin-top: 1rem; margin-bottom: 1rem; }
            .gap-3 { gap: 0.75rem; }
            .gap-4 { gap: 1rem; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            .flex { display: flex; }
            .justify-center { justify-content: center; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .space-y-1 > * + * { margin-top: 0.25rem; }
            .w-full { width: 100%; }
            .w-16 { width: 4rem; }
            .h-8 { height: 2rem; }
            .h-16 { height: 4rem; }
            .h-64 { height: 16rem; }
            .aspect-square { aspect-ratio: 1 / 1; }
            .object-cover { object-fit: cover; }
            .rounded { border-radius: 0.25rem; }
            .bg-white { background-color: #fff; }
            .bg-gray-50 { background-color: #f9fafb; }
            .bg-gray-100 { background-color: #f3f4f6; }
            .bg-gray-200 { background-color: #e5e7eb; }
            .text-gray-400 { color: #9ca3af; }
            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }
            .text-blue-600 { color: #2563eb; }
            .italic { font-style: italic; }
            .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            table { border-collapse: collapse; }
            hr { border: none; border-top: 2px solid #000; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-4xl h-[90vh] flex flex-col border-2 border-black">
        <div className="p-4 border-b-2 border-black flex items-center justify-between print:hidden">
          <h2 className="font-bold text-lg">Vista Previa: {documentName}</h2>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-500 text-white border-2 border-black hover:bg-blue-600 font-bold"
            >
              Imprimir / PDF
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border-2 border-black hover:bg-gray-100 font-bold"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 bg-gray-100">
          <div
            ref={printRef}
            className="bg-white border-2 border-black p-8 max-w-3xl mx-auto shadow-lg"
          >
            {sections.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                Agrega secciones al documento
              </div>
            ) : (
              sections.map((section) => (
                <SectionPreviewRenderer
                  key={section.id}
                  section={section}
                  globalFilters={globalFilters}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
