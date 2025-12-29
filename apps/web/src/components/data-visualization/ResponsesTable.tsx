"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { FieldValueRenderer } from "./FieldValueRenderer";
import type { FilterState } from "./FilterBar";

interface ResponsesTableProps {
  filters: FilterState;
  dateRange: { startDate?: number; endDate?: number };
}

type SortField =
  | "faenaName"
  | "workOrderName"
  | "dayDate"
  | "taskTemplateName"
  | "userName"
  | "fieldLabel"
  | "responseUpdatedAt";
type SortDirection = "asc" | "desc";

interface ResponseRow {
  responseId: Id<"fieldResponses">;
  taskInstanceId: Id<"taskInstances">;
  faenaId: Id<"faenas">;
  faenaName: string;
  workOrderId: Id<"workOrders">;
  workOrderName: string;
  workOrderDayId: Id<"workOrderDays">;
  dayDate: number;
  dayNumber: number;
  taskTemplateId: Id<"taskTemplates">;
  taskTemplateName: string;
  taskStatus: string;
  userId: string;
  userName: string;
  fieldTemplateId: Id<"fieldTemplates">;
  fieldLabel: string;
  fieldType: string;
  fieldOrder: number;
  isRequired: boolean;
  displayStyle?: string;
  value?: string;
  attachmentUrl?: string;
  responseUpdatedAt: number;
}

export function ResponsesTable({ filters, dateRange }: ResponsesTableProps) {
  const [sortField, setSortField] = useState<SortField>("responseUpdatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchTerm, setSearchTerm] = useState("");

  const data = useQuery(api.admin.dataVisualization.listAllResponses, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    faenaId: filters.faenaId ?? undefined,
    userId: filters.userId ?? undefined,
    workOrderId: filters.workOrderId ?? undefined,
    taskTemplateId: filters.taskTemplateId ?? undefined,
    status: filters.status ?? undefined,
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedData = useMemo((): ResponseRow[] => {
    if (!data) return [];
    return (data as ResponseRow[])
      .filter((r: ResponseRow) => {
        const term = searchTerm.toLowerCase();
        return (
          r.faenaName.toLowerCase().includes(term) ||
          r.workOrderName.toLowerCase().includes(term) ||
          r.taskTemplateName.toLowerCase().includes(term) ||
          r.userName.toLowerCase().includes(term) ||
          r.fieldLabel.toLowerCase().includes(term) ||
          (r.value?.toLowerCase().includes(term) ?? false)
        );
      })
      .sort((a: ResponseRow, b: ResponseRow) => {
        const direction = sortDirection === "asc" ? 1 : -1;
        switch (sortField) {
          case "faenaName":
            return a.faenaName.localeCompare(b.faenaName) * direction;
          case "workOrderName":
            return a.workOrderName.localeCompare(b.workOrderName) * direction;
          case "dayDate":
            return (a.dayDate - b.dayDate) * direction;
          case "taskTemplateName":
            return (
              a.taskTemplateName.localeCompare(b.taskTemplateName) * direction
            );
          case "userName":
            return a.userName.localeCompare(b.userName) * direction;
          case "fieldLabel":
            return a.fieldLabel.localeCompare(b.fieldLabel) * direction;
          case "responseUpdatedAt":
            return (a.responseUpdatedAt - b.responseUpdatedAt) * direction;
          default:
            return 0;
        }
      });
  }, [data, searchTerm, sortField, sortDirection]);

  if (!data) {
    return <div className="text-gray-500 p-4">Cargando...</div>;
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("es-CL");
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return <span className="ml-1">{sortDirection === "asc" ? "▲" : "▼"}</span>;
  };

  const getStatusBadge = (status: string) => {
    const isCompleted = status === "completed";
    return (
      <span
        className={`px-2 py-0.5 text-xs font-bold border ${
          isCompleted
            ? "bg-green-100 text-green-700 border-green-400"
            : "bg-yellow-100 text-yellow-700 border-yellow-400"
        }`}
      >
        {isCompleted ? "Completada" : "En Progreso"}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <input
          type="text"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-2 border-black px-3 py-2 w-64"
        />
        <span className="text-sm text-gray-500">
          {sortedData.length} respuestas
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-2 border-black text-sm">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-black">
              <th
                className="p-2 text-left font-bold cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort("faenaName")}
              >
                Faena
                <SortIcon field="faenaName" />
              </th>
              <th
                className="p-2 text-left font-bold cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort("workOrderName")}
              >
                Orden
                <SortIcon field="workOrderName" />
              </th>
              <th
                className="p-2 text-left font-bold cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort("dayDate")}
              >
                Fecha
                <SortIcon field="dayDate" />
              </th>
              <th
                className="p-2 text-left font-bold cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort("userName")}
              >
                Usuario
                <SortIcon field="userName" />
              </th>
              <th
                className="p-2 text-left font-bold cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort("taskTemplateName")}
              >
                Tarea
                <SortIcon field="taskTemplateName" />
              </th>
              <th className="p-2 text-left font-bold">Estado</th>
              <th
                className="p-2 text-left font-bold cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort("fieldLabel")}
              >
                Campo
                <SortIcon field="fieldLabel" />
              </th>
              <th className="p-2 text-left font-bold">Valor</th>
              <th
                className="p-2 text-left font-bold cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort("responseUpdatedAt")}
              >
                Actualizado
                <SortIcon field="responseUpdatedAt" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => (
              <tr
                key={row.responseId}
                className="border-b border-gray-200 hover:bg-blue-50"
              >
                <td className="p-2">{row.faenaName}</td>
                <td className="p-2">{row.workOrderName}</td>
                <td className="p-2 font-mono text-xs">
                  {formatDate(row.dayDate)}
                  <span className="text-gray-400 ml-1">D{row.dayNumber}</span>
                </td>
                <td className="p-2">{row.userName}</td>
                <td className="p-2 font-bold">{row.taskTemplateName}</td>
                <td className="p-2">{getStatusBadge(row.taskStatus)}</td>
                <td className="p-2">
                  <span className="font-medium">{row.fieldLabel}</span>
                  {row.isRequired && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </td>
                <td className="p-2 max-w-[200px] truncate">
                  <FieldValueRenderer
                    fieldType={row.fieldType}
                    value={row.value}
                    displayStyle={row.displayStyle}
                    attachmentUrl={row.attachmentUrl}
                  />
                </td>
                <td className="p-2 text-xs text-gray-500">
                  {formatDateTime(row.responseUpdatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedData.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No se encontraron respuestas con los filtros seleccionados
        </div>
      )}
    </div>
  );
}
