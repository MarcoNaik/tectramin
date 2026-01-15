"use client";

import { type DocumentSection, SECTION_TYPES } from "@/types/documentBuilder";

interface DocumentCanvasProps {
  sections: DocumentSection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  onDeleteSection: (id: string) => void;
  onMoveSection: (id: string, direction: "up" | "down") => void;
}

function getSectionLabel(type: string): string {
  return SECTION_TYPES.find((s) => s.value === type)?.label ?? type;
}

function getSectionIcon(type: string): string {
  return SECTION_TYPES.find((s) => s.value === type)?.icon ?? "📄";
}

function SectionPreview({ section }: { section: DocumentSection }) {
  switch (section.type) {
    case "header":
      return (
        <div className="text-center py-4">
          <div className="text-xl font-bold">{section.title || "Titulo del Documento"}</div>
          {section.showDateRange && (
            <div className="text-sm text-gray-500 mt-1">[Rango de fechas]</div>
          )}
          {section.showGeneratedBy && (
            <div className="text-xs text-gray-400 mt-1">Generado por: [Usuario]</div>
          )}
        </div>
      );

    case "kpiCard":
      return (
        <div className="flex justify-center py-4">
          <div className="text-center border-2 border-dashed border-gray-300 px-8 py-4 rounded">
            <div className="text-3xl font-bold text-blue-600">--</div>
            <div className="text-sm text-gray-600">{section.metric.label}</div>
          </div>
        </div>
      );

    case "kpiGrid":
      return (
        <div className={`grid grid-cols-${section.columns} gap-4 py-4`}>
          {section.metrics.length === 0 ? (
            <div className="col-span-full text-center text-gray-400 py-4 border-2 border-dashed border-gray-300 rounded">
              Sin metricas configuradas
            </div>
          ) : (
            section.metrics.map((metric, i) => (
              <div key={metric.id} className="text-center border-2 border-dashed border-gray-300 px-4 py-3 rounded">
                <div className="text-2xl font-bold text-blue-600">--</div>
                <div className="text-sm text-gray-600">{metric.label}</div>
              </div>
            ))
          )}
        </div>
      );

    case "dataTable":
      return (
        <div className="py-4">
          <table className="w-full border-2 border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                {section.columns.length === 0 ? (
                  <th className="px-4 py-2 text-left text-gray-400">Sin columnas</th>
                ) : (
                  section.columns.map((col) => (
                    <th key={col.id} className="px-4 py-2 text-left text-sm font-bold">
                      {col.label}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={section.columns.length || 1} className="px-4 py-8 text-center text-gray-400">
                  [Datos de la tabla]
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      );

    case "groupedSummary":
      return (
        <div className="py-4">
          <div className="font-bold mb-2">{section.title}</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between border-b border-gray-200 py-1">
              <span className="text-gray-600">[Grupo 1]</span>
              <span className="font-bold">--</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 py-1">
              <span className="text-gray-600">[Grupo 2]</span>
              <span className="font-bold">--</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 py-1">
              <span className="text-gray-600">[Grupo 3]</span>
              <span className="font-bold">--</span>
            </div>
          </div>
        </div>
      );

    case "chart":
      return (
        <div className="py-4">
          <div className="h-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
            <span className="text-gray-400">
              Grafico de {section.chartType === "bar" ? "Barras" : section.chartType === "line" ? "Lineas" : "Pastel"}
            </span>
          </div>
        </div>
      );

    case "photoGrid":
      return (
        <div className="py-4">
          <div className={`grid grid-cols-${section.columns} gap-2`}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                <span className="text-gray-400 text-xs">[Foto]</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "textBlock":
      return (
        <div className={`py-4 ${section.style === "heading" ? "text-lg font-bold" : section.style === "note" ? "text-sm text-gray-600 italic" : ""}`}>
          {section.content || "[Texto del bloque]"}
        </div>
      );

    case "divider":
      return section.style === "line" ? (
        <hr className="my-4 border-t-2 border-gray-300" />
      ) : (
        <div className="h-8" />
      );

    default:
      return <div className="py-4 text-gray-400">Seccion desconocida</div>;
  }
}

export function DocumentCanvas({
  sections,
  selectedSectionId,
  onSelectSection,
  onDeleteSection,
  onMoveSection,
}: DocumentCanvasProps) {
  return (
    <div className="flex-1 overflow-auto bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        {sections.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">Agrega secciones desde el panel izquierdo</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map((section, index) => {
              const isSelected = section.id === selectedSectionId;
              return (
                <div
                  key={section.id}
                  className={`bg-white border-2 ${isSelected ? "border-blue-500 shadow-[4px_4px_0px_0px_#3B82F6]" : "border-black"} transition-all cursor-pointer relative group`}
                  onClick={() => onSelectSection(section.id)}
                >
                  <div className="absolute -top-3 left-3 bg-white px-2 text-xs font-bold text-gray-500 flex items-center gap-1">
                    <span>{getSectionIcon(section.type)}</span>
                    <span>{getSectionLabel(section.type)}</span>
                  </div>

                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveSection(section.id, "up");
                      }}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                      title="Mover arriba"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveSection(section.id, "down");
                      }}
                      disabled={index === sections.length - 1}
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                      title="Mover abajo"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSection(section.id);
                      }}
                      className="p-1 hover:bg-red-100 text-red-500 rounded"
                      title="Eliminar seccion"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>

                  <div className="p-4 pt-6">
                    <SectionPreview section={section} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
