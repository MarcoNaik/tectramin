import type { Id, Doc } from "../_generated/dataModel";
import type { DatabaseReader } from "../_generated/server";

export interface OrphanCheckContext {
  workOrderDayId: Id<"workOrderDays">;
  workOrderDayServiceId?: Id<"workOrderDayServices">;
  taskTemplateId: Id<"taskTemplates">;
}

export async function isTaskInstanceOrphaned(
  db: DatabaseReader,
  context: OrphanCheckContext
): Promise<boolean> {
  if (context.workOrderDayServiceId) {
    const service = await db.get(context.workOrderDayServiceId);
    return service === null;
  }

  const standaloneTask = await db
    .query("workOrderDayTaskTemplates")
    .withIndex("by_work_order_day", (q) => q.eq("workOrderDayId", context.workOrderDayId))
    .filter((q) => q.eq(q.field("taskTemplateId"), context.taskTemplateId))
    .first();

  return standaloneTask === null;
}

export async function filterNonOrphanedInstances<T extends Doc<"taskInstances">>(
  db: DatabaseReader,
  instances: T[]
): Promise<T[]> {
  const results: T[] = [];

  for (const instance of instances) {
    const orphaned = await isTaskInstanceOrphaned(db, {
      workOrderDayId: instance.workOrderDayId,
      workOrderDayServiceId: instance.workOrderDayServiceId ?? undefined,
      taskTemplateId: instance.taskTemplateId,
    });

    if (!orphaned) {
      results.push(instance);
    }
  }

  return results;
}

export async function getOrphanedInstances<T extends Doc<"taskInstances">>(
  db: DatabaseReader,
  instances: T[]
): Promise<T[]> {
  const results: T[] = [];

  for (const instance of instances) {
    const orphaned = await isTaskInstanceOrphaned(db, {
      workOrderDayId: instance.workOrderDayId,
      workOrderDayServiceId: instance.workOrderDayServiceId ?? undefined,
      taskTemplateId: instance.taskTemplateId,
    });

    if (orphaned) {
      results.push(instance);
    }
  }

  return results;
}
