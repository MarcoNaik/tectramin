"use client";

import { useState, useMemo } from "react";
import { FilterBar, type FilterState } from "./FilterBar";
import { ResponsesTable } from "./ResponsesTable";

export function DataVisualization() {
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
      <h2 className="text-2xl font-bold mb-4">Visualizacion de Datos</h2>

      <div className="mb-4">
        <FilterBar filters={filters} onFiltersChange={setFilters} />
      </div>

      <div className="bg-white p-4 border-2 border-black flex-1 overflow-auto">
        <ResponsesTable filters={filters} dateRange={dateRange} />
      </div>
    </div>
  );
}
