import { v } from "convex/values";
import { query } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

const globalFiltersValidator = v.object({
  dateRange: v.optional(v.object({ start: v.number(), end: v.number() })),
  customerIds: v.optional(v.array(v.string())),
  faenaIds: v.optional(v.array(v.string())),
  workOrderIds: v.optional(v.array(v.string())),
  serviceIds: v.optional(v.array(v.string())),
  taskTemplateIds: v.optional(v.array(v.string())),
  userIds: v.optional(v.array(v.string())),
});

const metricConfigValidator = v.object({
  id: v.string(),
  label: v.string(),
  source: v.union(v.literal("taskCount"), v.literal("fieldValue")),
  taskTemplateId: v.optional(v.string()),
  fieldTemplateId: v.optional(v.string()),
  aggregation: v.union(
    v.literal("count"),
    v.literal("sum"),
    v.literal("avg"),
    v.literal("min"),
    v.literal("max"),
    v.literal("distinctCount")
  ),
  filter: v.optional(v.object({ fieldValue: v.string() })),
  format: v.union(
    v.literal("number"),
    v.literal("percent"),
    v.literal("duration"),
    v.literal("currency")
  ),
});

type GlobalFilters = {
  dateRange?: { start: number; end: number };
  customerIds?: string[];
  faenaIds?: string[];
  workOrderIds?: string[];
  serviceIds?: string[];
  taskTemplateIds?: string[];
  userIds?: string[];
};

type MetricConfig = {
  id: string;
  label: string;
  source: "taskCount" | "fieldValue";
  taskTemplateId?: string;
  fieldTemplateId?: string;
  aggregation: "count" | "sum" | "avg" | "min" | "max" | "distinctCount";
  filter?: { fieldValue: string };
  format: "number" | "percent" | "duration" | "currency";
};

type EnrichedTaskInstance = Doc<"taskInstances"> & {
  workOrderDay: Doc<"workOrderDays">;
  workOrder: Doc<"workOrders">;
};

async function getFilteredTaskInstances(
  ctx: QueryCtx,
  filters: GlobalFilters
): Promise<EnrichedTaskInstance[]> {
  let taskInstances = await ctx.db.query("taskInstances").collect();

  if (filters.taskTemplateIds?.length) {
    taskInstances = taskInstances.filter((ti) =>
      filters.taskTemplateIds!.includes(ti.taskTemplateId as string)
    );
  }

  if (filters.userIds?.length) {
    taskInstances = taskInstances.filter((ti) =>
      filters.userIds!.includes(ti.userId)
    );
  }

  const enrichedInstances: EnrichedTaskInstance[] = [];

  for (const ti of taskInstances) {
    const workOrderDay = await ctx.db.get(ti.workOrderDayId);
    if (!workOrderDay) continue;

    if (filters.dateRange) {
      if (workOrderDay.dayDate < filters.dateRange.start || workOrderDay.dayDate > filters.dateRange.end) {
        continue;
      }
    }

    const workOrder = await ctx.db.get(workOrderDay.workOrderId);
    if (!workOrder) continue;

    if (filters.customerIds?.length && !filters.customerIds.includes(workOrder.customerId as string)) {
      continue;
    }

    if (filters.faenaIds?.length && !filters.faenaIds.includes(workOrder.faenaId as string)) {
      continue;
    }

    if (filters.workOrderIds?.length && !filters.workOrderIds.includes(workOrder._id as string)) {
      continue;
    }

    if (filters.serviceIds?.length && workOrder.serviceId && !filters.serviceIds.includes(workOrder.serviceId as string)) {
      continue;
    }

    enrichedInstances.push({
      ...ti,
      workOrderDay,
      workOrder,
    });
  }

  return enrichedInstances;
}

export const computeMetric = query({
  args: {
    metric: metricConfigValidator,
    filters: globalFiltersValidator,
  },
  returns: v.number(),
  handler: async (ctx, args): Promise<number> => {
    const { metric, filters } = args;
    const taskInstances = await getFilteredTaskInstances(ctx, filters);

    if (metric.source === "taskCount") {
      let filtered = taskInstances;
      if (metric.taskTemplateId) {
        filtered = taskInstances.filter((ti) => ti.taskTemplateId === metric.taskTemplateId);
      }

      switch (metric.aggregation) {
        case "count":
          return filtered.length;
        case "distinctCount":
          return new Set(filtered.map((ti) => ti.taskTemplateId)).size;
        default:
          return filtered.length;
      }
    }

    if (metric.source === "fieldValue" && metric.fieldTemplateId) {
      let filtered = taskInstances;
      if (metric.taskTemplateId) {
        filtered = taskInstances.filter((ti) => ti.taskTemplateId === metric.taskTemplateId);
      }

      const values: number[] = [];
      const distinctValues = new Set<string>();

      for (const ti of filtered) {
        const responses = await ctx.db
          .query("fieldResponses")
          .withIndex("by_task_instance", (q) => q.eq("taskInstanceId", ti._id))
          .collect();

        const response = responses.find((r) => r.fieldTemplateId === metric.fieldTemplateId);
        if (response?.value) {
          if (metric.filter?.fieldValue && response.value !== metric.filter.fieldValue) {
            continue;
          }

          distinctValues.add(response.value);

          const numValue = parseFloat(response.value);
          if (!isNaN(numValue)) {
            values.push(numValue);
          } else if (metric.aggregation === "count") {
            values.push(1);
          }
        }
      }

      switch (metric.aggregation) {
        case "count":
          return values.length;
        case "sum":
          return values.reduce((a, b) => a + b, 0);
        case "avg":
          return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        case "min":
          return values.length > 0 ? Math.min(...values) : 0;
        case "max":
          return values.length > 0 ? Math.max(...values) : 0;
        case "distinctCount":
          return distinctValues.size;
        default:
          return 0;
      }
    }

    return 0;
  },
});

export const computeGroupedMetric = query({
  args: {
    groupBy: v.union(
      v.literal("user"),
      v.literal("faena"),
      v.literal("customer"),
      v.literal("taskTemplate"),
      v.literal("date"),
      v.literal("workOrder"),
      v.literal("service")
    ),
    metric: metricConfigValidator,
    filters: globalFiltersValidator,
    sortBy: v.union(v.literal("value"), v.literal("label")),
    sortDirection: v.union(v.literal("asc"), v.literal("desc")),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      groupKey: v.string(),
      groupLabel: v.string(),
      value: v.number(),
    })
  ),
  handler: async (ctx, args): Promise<Array<{ groupKey: string; groupLabel: string; value: number }>> => {
    const { groupBy, metric, filters, sortBy, sortDirection, limit } = args;
    const taskInstances = await getFilteredTaskInstances(ctx, filters);

    const groups: Record<string, { label: string; instances: EnrichedTaskInstance[] }> = {};

    for (const ti of taskInstances) {
      let groupKey: string;
      let groupLabel: string;

      switch (groupBy) {
        case "user": {
          groupKey = ti.userId;
          const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", ti.userId)).unique();
          groupLabel = user?.fullName ?? user?.email ?? ti.userId;
          break;
        }
        case "faena": {
          groupKey = ti.workOrder.faenaId as string;
          const faena = await ctx.db.get(ti.workOrder.faenaId);
          groupLabel = faena?.name ?? "Desconocida";
          break;
        }
        case "customer": {
          groupKey = ti.workOrder.customerId as string;
          const customer = await ctx.db.get(ti.workOrder.customerId);
          groupLabel = customer?.name ?? "Desconocido";
          break;
        }
        case "taskTemplate": {
          groupKey = ti.taskTemplateId as string;
          const taskTemplate = await ctx.db.get(ti.taskTemplateId);
          groupLabel = taskTemplate?.name ?? "Desconocida";
          break;
        }
        case "date": {
          const date = new Date(ti.workOrderDay.dayDate);
          groupKey = date.toISOString().split("T")[0] ?? "";
          groupLabel = date.toLocaleDateString("es-CL");
          break;
        }
        case "workOrder": {
          groupKey = ti.workOrder._id as string;
          groupLabel = ti.workOrder.name;
          break;
        }
        case "service": {
          groupKey = (ti.workOrder.serviceId as string) ?? "none";
          if (ti.workOrder.serviceId) {
            const service = await ctx.db.get(ti.workOrder.serviceId);
            groupLabel = service?.name ?? "Sin servicio";
          } else {
            groupLabel = "Sin servicio";
          }
          break;
        }
        default:
          groupKey = "unknown";
          groupLabel = "Desconocido";
      }

      if (!groups[groupKey]) {
        groups[groupKey] = { label: groupLabel, instances: [] };
      }
      groups[groupKey].instances.push(ti);
    }

    const results: Array<{ groupKey: string; groupLabel: string; value: number }> = [];

    for (const [groupKey, group] of Object.entries(groups)) {
      let value = 0;

      if (metric.source === "taskCount") {
        let filtered = group.instances;
        if (metric.taskTemplateId) {
          filtered = group.instances.filter((ti) => ti.taskTemplateId === metric.taskTemplateId);
        }

        switch (metric.aggregation) {
          case "count":
            value = filtered.length;
            break;
          case "distinctCount":
            value = new Set(filtered.map((ti) => ti.taskTemplateId)).size;
            break;
          default:
            value = filtered.length;
        }
      } else if (metric.source === "fieldValue" && metric.fieldTemplateId) {
        let filtered = group.instances;
        if (metric.taskTemplateId) {
          filtered = group.instances.filter((ti) => ti.taskTemplateId === metric.taskTemplateId);
        }

        const values: number[] = [];
        const distinctValues = new Set<string>();

        for (const ti of filtered) {
          const responses = await ctx.db
            .query("fieldResponses")
            .withIndex("by_task_instance", (q) => q.eq("taskInstanceId", ti._id))
            .collect();

          const response = responses.find((r) => r.fieldTemplateId === metric.fieldTemplateId);
          if (response?.value) {
            if (metric.filter?.fieldValue && response.value !== metric.filter.fieldValue) {
              continue;
            }

            distinctValues.add(response.value);

            const numValue = parseFloat(response.value);
            if (!isNaN(numValue)) {
              values.push(numValue);
            } else if (metric.aggregation === "count") {
              values.push(1);
            }
          }
        }

        switch (metric.aggregation) {
          case "count":
            value = values.length;
            break;
          case "sum":
            value = values.reduce((a, b) => a + b, 0);
            break;
          case "avg":
            value = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            break;
          case "min":
            value = values.length > 0 ? Math.min(...values) : 0;
            break;
          case "max":
            value = values.length > 0 ? Math.max(...values) : 0;
            break;
          case "distinctCount":
            value = distinctValues.size;
            break;
        }
      }

      results.push({ groupKey, groupLabel: group.label, value });
    }

    results.sort((a, b) => {
      const aVal = sortBy === "value" ? a.value : a.groupLabel;
      const bVal = sortBy === "value" ? b.value : b.groupLabel;
      if (sortDirection === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return limit ? results.slice(0, limit) : results;
  },
});

export const getTableData = query({
  args: {
    columns: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        source: v.union(v.literal("entity"), v.literal("fieldValue")),
        entityField: v.optional(
          v.union(
            v.literal("customer"),
            v.literal("faena"),
            v.literal("workOrder"),
            v.literal("service"),
            v.literal("taskTemplate"),
            v.literal("user"),
            v.literal("date"),
            v.literal("dayNumber"),
            v.literal("status")
          )
        ),
        taskTemplateId: v.optional(v.string()),
        fieldTemplateId: v.optional(v.string()),
      })
    ),
    filters: globalFiltersValidator,
    sortBy: v.optional(
      v.object({
        column: v.string(),
        direction: v.union(v.literal("asc"), v.literal("desc")),
      })
    ),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.record(v.string(), v.string())),
  handler: async (ctx, args): Promise<Array<Record<string, string>>> => {
    const { columns, filters, sortBy, limit } = args;
    const taskInstances = await getFilteredTaskInstances(ctx, filters);

    const rows: Array<Record<string, string>> = [];

    for (const ti of taskInstances) {
      const row: Record<string, string> = {};

      for (const col of columns) {
        if (col.source === "entity" && col.entityField) {
          switch (col.entityField) {
            case "customer": {
              const customer = await ctx.db.get(ti.workOrder.customerId);
              row[col.id] = customer?.name ?? "";
              break;
            }
            case "faena": {
              const faena = await ctx.db.get(ti.workOrder.faenaId);
              row[col.id] = faena?.name ?? "";
              break;
            }
            case "workOrder":
              row[col.id] = ti.workOrder.name;
              break;
            case "service": {
              if (ti.workOrder.serviceId) {
                const service = await ctx.db.get(ti.workOrder.serviceId);
                row[col.id] = service?.name ?? "";
              } else {
                row[col.id] = "";
              }
              break;
            }
            case "taskTemplate": {
              const taskTemplate = await ctx.db.get(ti.taskTemplateId);
              row[col.id] = taskTemplate?.name ?? "";
              break;
            }
            case "user": {
              const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", ti.userId)).unique();
              row[col.id] = user?.fullName ?? user?.email ?? ti.userId;
              break;
            }
            case "date": {
              const date = new Date(ti.workOrderDay.dayDate);
              row[col.id] = date.toLocaleDateString("es-CL");
              break;
            }
            case "dayNumber":
              row[col.id] = String(ti.workOrderDay.dayNumber);
              break;
            case "status":
              row[col.id] = ti.status;
              break;
          }
        } else if (col.source === "fieldValue" && col.fieldTemplateId) {
          if (col.taskTemplateId && ti.taskTemplateId !== col.taskTemplateId) {
            row[col.id] = "";
            continue;
          }

          const responses = await ctx.db
            .query("fieldResponses")
            .withIndex("by_task_instance", (q) => q.eq("taskInstanceId", ti._id))
            .collect();

          const response = responses.find((r) => r.fieldTemplateId === col.fieldTemplateId);
          row[col.id] = response?.value ?? "";
        }
      }

      rows.push(row);
    }

    if (sortBy) {
      rows.sort((a, b) => {
        const aVal = a[sortBy.column] ?? "";
        const bVal = b[sortBy.column] ?? "";
        const numA = parseFloat(aVal);
        const numB = parseFloat(bVal);

        if (!isNaN(numA) && !isNaN(numB)) {
          return sortBy.direction === "asc" ? numA - numB : numB - numA;
        }

        if (sortBy.direction === "asc") {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });
    }

    return limit ? rows.slice(0, limit) : rows;
  },
});

export const getPhotoGridData = query({
  args: {
    taskTemplateId: v.string(),
    fieldTemplateId: v.string(),
    filters: globalFiltersValidator,
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      url: v.union(v.string(), v.null()),
      fileName: v.string(),
      taskInstanceId: v.string(),
      date: v.string(),
      user: v.string(),
      faena: v.string(),
    })
  ),
  handler: async (ctx, args): Promise<Array<{ url: string | null; fileName: string; taskInstanceId: string; date: string; user: string; faena: string }>> => {
    const { taskTemplateId, fieldTemplateId, filters, limit } = args;
    const taskInstances = await getFilteredTaskInstances(ctx, filters);

    const photos: Array<{ url: string | null; fileName: string; taskInstanceId: string; date: string; user: string; faena: string }> = [];

    for (const ti of taskInstances) {
      if (ti.taskTemplateId !== taskTemplateId) continue;

      const responses = await ctx.db
        .query("fieldResponses")
        .withIndex("by_task_instance", (q) => q.eq("taskInstanceId", ti._id))
        .collect();

      const response = responses.find((r) => r.fieldTemplateId === fieldTemplateId);
      if (!response) continue;

      const attachments = await ctx.db
        .query("attachments")
        .withIndex("by_field_response_client_id", (q) => q.eq("fieldResponseClientId", response.clientId))
        .collect();

      for (const attachment of attachments) {
        if (!attachment.storageId) continue;

        const url = await ctx.storage.getUrl(attachment.storageId);
        const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", ti.userId)).unique();
        const faena = await ctx.db.get(ti.workOrder.faenaId);

        photos.push({
          url,
          fileName: attachment.fileName,
          taskInstanceId: ti._id,
          date: new Date(ti.workOrderDay.dayDate).toLocaleDateString("es-CL"),
          user: user?.fullName ?? user?.email ?? ti.userId,
          faena: faena?.name ?? "",
        });
      }
    }

    return limit ? photos.slice(0, limit) : photos;
  },
});
