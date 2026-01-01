"use client";

import { useState, useMemo } from "react";
import { FilterBar, type FilterState } from "./FilterBar";
import { ResponsesTable } from "./ResponsesTable";
import { ImageGallery } from "./ImageGallery";

type ViewMode = "table" | "gallery";

export function DataVisualization() {
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [filters, setFilters] = useState<FilterState>({
    datePreset: "thisWeek",
    faenaId: null,
    userId: null,
    workOrderId: null,
    taskTemplateId: null,
    status: null,
  });

  const dateRange = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filters.datePreset) {
      case "today":
        return {
          startDate: today.getTime(),
          endDate: today.getTime() + 86400000 - 1,
        };
      case "thisWeek": {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return {
          startDate: startOfWeek.getTime(),
          endDate: endOfWeek.getTime() + 86400000 - 1,
        };
      }
      case "thisMonth": {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0
        );
        return {
          startDate: startOfMonth.getTime(),
          endDate: endOfMonth.getTime() + 86400000 - 1,
        };
      }
      case "allTime":
        return { startDate: undefined, endDate: undefined };
    }
  }, [filters.datePreset]);

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Visualizacion de Datos</h2>
        <div className="flex border-2 border-black">
          <button
            onClick={() => setViewMode("table")}
            className={`px-4 py-2 text-sm font-bold transition-colors border-r-2 border-black ${
              viewMode === "table"
                ? "bg-blue-500 text-white"
                : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            Tabla
          </button>
          <button
            onClick={() => setViewMode("gallery")}
            className={`px-4 py-2 text-sm font-bold transition-colors ${
              viewMode === "gallery"
                ? "bg-blue-500 text-white"
                : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            Imagenes
          </button>
        </div>
      </div>

      <div className="mb-4">
        <FilterBar filters={filters} onFiltersChange={setFilters} />
      </div>

      <div className="bg-white p-4 border-2 border-black flex-1 overflow-auto">
        {viewMode === "table" ? (
          <ResponsesTable filters={filters} dateRange={dateRange} />
        ) : (
          <ImageGallery filters={filters} dateRange={dateRange} />
        )}
      </div>
    </div>
  );
}
