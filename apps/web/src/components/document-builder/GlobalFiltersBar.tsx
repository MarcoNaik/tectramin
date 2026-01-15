"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { GlobalFilters } from "@/types/documentBuilder";

interface GlobalFiltersBarProps {
  filters: GlobalFilters;
  onUpdate: (filters: GlobalFilters) => void;
}

function formatDateForInput(timestamp: number | undefined): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toISOString().split("T")[0];
}

function parseDateFromInput(dateString: string): number | undefined {
  if (!dateString) return undefined;
  return new Date(dateString + "T00:00:00.000Z").getTime();
}

export function GlobalFiltersBar({ filters, onUpdate }: GlobalFiltersBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const customers = useQuery(api.admin.customers.list);
  const faenas = useQuery(api.admin.faenas.list);
  const services = useQuery(api.admin.services.list);
  const taskTemplates = useQuery(api.admin.taskTemplates.listActive);

  const handleDateRangeChange = (field: "start" | "end", value: string) => {
    const timestamp = parseDateFromInput(value);
    const newRange = {
      start: field === "start" ? timestamp : filters.dateRange?.start,
      end: field === "end" ? timestamp : filters.dateRange?.end,
    };

    if (newRange.start === undefined && newRange.end === undefined) {
      const { dateRange, ...rest } = filters;
      onUpdate(rest);
    } else {
      onUpdate({
        ...filters,
        dateRange: {
          start: newRange.start ?? 0,
          end: newRange.end ?? Date.now(),
        },
      });
    }
  };

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  return (
    <div className="border-t-2 border-black bg-gray-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span className="font-bold text-sm">Filtros Globales</span>
          {activeFilterCount > 0 && (
            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transform transition-transform ${isExpanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 py-3 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1 text-gray-600">Fecha Inicio</label>
            <input
              type="date"
              value={formatDateForInput(filters.dateRange?.start)}
              onChange={(e) => handleDateRangeChange("start", e.target.value)}
              className="w-full border-2 border-black px-2 py-1 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 text-gray-600">Fecha Fin</label>
            <input
              type="date"
              value={formatDateForInput(filters.dateRange?.end)}
              onChange={(e) => handleDateRangeChange("end", e.target.value)}
              className="w-full border-2 border-black px-2 py-1 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 text-gray-600">Cliente</label>
            <select
              value={filters.customerIds?.[0] ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                onUpdate({
                  ...filters,
                  customerIds: value ? [value] : undefined,
                  faenaIds: undefined,
                });
              }}
              className="w-full border-2 border-black px-2 py-1 text-sm"
            >
              <option value="">Todos</option>
              {customers?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 text-gray-600">Faena</label>
            <select
              value={filters.faenaIds?.[0] ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                onUpdate({
                  ...filters,
                  faenaIds: value ? [value] : undefined,
                });
              }}
              className="w-full border-2 border-black px-2 py-1 text-sm"
              disabled={!filters.customerIds?.length}
            >
              <option value="">Todas</option>
              {faenas
                ?.filter((f) => !filters.customerIds?.length || filters.customerIds.includes(f.customerId))
                .map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 text-gray-600">Servicio</label>
            <select
              value={filters.serviceIds?.[0] ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                onUpdate({
                  ...filters,
                  serviceIds: value ? [value] : undefined,
                });
              }}
              className="w-full border-2 border-black px-2 py-1 text-sm"
            >
              <option value="">Todos</option>
              {services?.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 text-gray-600">Tarea</label>
            <select
              value={filters.taskTemplateIds?.[0] ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                onUpdate({
                  ...filters,
                  taskTemplateIds: value ? [value] : undefined,
                });
              }}
              className="w-full border-2 border-black px-2 py-1 text-sm"
            >
              <option value="">Todas</option>
              {taskTemplates?.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
