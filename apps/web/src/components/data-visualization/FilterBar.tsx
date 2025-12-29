"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import type { DatePreset } from "@/types";

const datePresets: Array<{ value: DatePreset; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "thisWeek", label: "Esta Semana" },
  { value: "thisMonth", label: "Este Mes" },
  { value: "allTime", label: "Todo" },
];

const statusOptions = [
  { value: "", label: "Todos los Estados" },
  { value: "draft", label: "En Progreso" },
  { value: "completed", label: "Completada" },
];

export interface FilterState {
  datePreset: DatePreset;
  faenaId: Id<"faenas"> | null;
  userId: string | null;
  workOrderId: Id<"workOrders"> | null;
  taskTemplateId: Id<"taskTemplates"> | null;
  status: string | null;
}

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const options = useQuery(api.admin.dataVisualization.getFilterOptions);

  const workOrdersForFaena = filters.faenaId
    ? options?.workOrders.filter((wo) => wo.faenaId === filters.faenaId)
    : options?.workOrders;

  const handleChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters };

    if (key === "datePreset") {
      newFilters.datePreset = value as DatePreset;
    } else if (key === "faenaId") {
      newFilters.faenaId = value ? (value as Id<"faenas">) : null;
      newFilters.workOrderId = null;
    } else if (key === "userId") {
      newFilters.userId = value || null;
    } else if (key === "workOrderId") {
      newFilters.workOrderId = value ? (value as Id<"workOrders">) : null;
    } else if (key === "taskTemplateId") {
      newFilters.taskTemplateId = value
        ? (value as Id<"taskTemplates">)
        : null;
    } else if (key === "status") {
      newFilters.status = value || null;
    }

    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onFiltersChange({
      datePreset: "thisWeek",
      faenaId: null,
      userId: null,
      workOrderId: null,
      taskTemplateId: null,
      status: null,
    });
  };

  const hasActiveFilters =
    filters.faenaId ||
    filters.userId ||
    filters.workOrderId ||
    filters.taskTemplateId ||
    filters.status;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="flex border-2 border-black">
          {datePresets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleChange("datePreset", preset.value)}
              className={`px-3 py-2 text-sm font-bold transition-colors border-r-2 border-black last:border-r-0 ${
                filters.datePreset === preset.value
                  ? "bg-blue-500 text-white"
                  : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm font-bold border-2 border-red-500 text-red-500 hover:bg-red-50"
          >
            Limpiar Filtros
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={filters.faenaId ?? ""}
          onChange={(e) => handleChange("faenaId", e.target.value)}
          className="border-2 border-black px-3 py-2 font-bold text-sm min-w-[180px]"
        >
          <option value="">Todas las Faenas</option>
          {options?.faenas.map((faena) => (
            <option key={faena._id} value={faena._id}>
              {faena.name}
            </option>
          ))}
        </select>

        <select
          value={filters.workOrderId ?? ""}
          onChange={(e) => handleChange("workOrderId", e.target.value)}
          className="border-2 border-black px-3 py-2 font-bold text-sm min-w-[180px]"
        >
          <option value="">Todas las Ordenes</option>
          {workOrdersForFaena?.map((wo) => (
            <option key={wo._id} value={wo._id}>
              {wo.name}
            </option>
          ))}
        </select>

        <select
          value={filters.userId ?? ""}
          onChange={(e) => handleChange("userId", e.target.value)}
          className="border-2 border-black px-3 py-2 font-bold text-sm min-w-[180px]"
        >
          <option value="">Todos los Usuarios</option>
          {options?.users.map((user) => (
            <option key={user._id} value={user.clerkId}>
              {user.name}
            </option>
          ))}
        </select>

        <select
          value={filters.taskTemplateId ?? ""}
          onChange={(e) => handleChange("taskTemplateId", e.target.value)}
          className="border-2 border-black px-3 py-2 font-bold text-sm min-w-[180px]"
        >
          <option value="">Todas las Tareas</option>
          {options?.taskTemplates.map((task) => (
            <option key={task._id} value={task._id}>
              {task.name}
            </option>
          ))}
        </select>

        <select
          value={filters.status ?? ""}
          onChange={(e) => handleChange("status", e.target.value)}
          className="border-2 border-black px-3 py-2 font-bold text-sm min-w-[150px]"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
