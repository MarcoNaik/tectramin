import { useCallback } from "react";
import { eq } from "drizzle-orm";
import { useConvex } from "convex/react";
import { db } from "../db/client";
import { workOrderDays } from "../db/schema";
import { addToQueue } from "../sync/SyncQueue";
import { syncService } from "../sync/SyncService";
import { networkMonitor } from "../sync/NetworkMonitor";
import { api } from "@packages/backend/convex/_generated/api";

export type WorkOrderDayStatus = "pending" | "in_progress" | "completed";

export function useWorkOrderDayStatus() {
  const convex = useConvex();

  const updateStatus = useCallback(
    async (workOrderDayServerId: string, status: WorkOrderDayStatus) => {
      await db
        .update(workOrderDays)
        .set({ status, syncStatus: "pending" })
        .where(eq(workOrderDays.serverId, workOrderDayServerId));

      if (networkMonitor.getIsOnline()) {
        try {
          await convex.mutation(api.mobile.sync.updateWorkOrderDayStatus, {
            workOrderDayServerId,
            status,
          });
          await db
            .update(workOrderDays)
            .set({ syncStatus: "synced" })
            .where(eq(workOrderDays.serverId, workOrderDayServerId));
        } catch {
          await addToQueue("workOrderDays", "update", workOrderDayServerId, {
            workOrderDayServerId,
            status,
          });
          await syncService.updatePendingCount();
        }
      } else {
        await addToQueue("workOrderDays", "update", workOrderDayServerId, {
          workOrderDayServerId,
          status,
        });
        await syncService.updatePendingCount();
      }
    },
    [convex]
  );

  return { updateStatus };
}

export async function updateWorkOrderDayStatusDirect(
  convex: ReturnType<typeof useConvex>,
  workOrderDayServerId: string,
  status: WorkOrderDayStatus
) {
  await db
    .update(workOrderDays)
    .set({ status, syncStatus: "pending" })
    .where(eq(workOrderDays.serverId, workOrderDayServerId));

  if (networkMonitor.getIsOnline()) {
    try {
      await convex.mutation(api.mobile.sync.updateWorkOrderDayStatus, {
        workOrderDayServerId,
        status,
      });
      await db
        .update(workOrderDays)
        .set({ syncStatus: "synced" })
        .where(eq(workOrderDays.serverId, workOrderDayServerId));
    } catch {
      await addToQueue("workOrderDays", "update", workOrderDayServerId, {
        workOrderDayServerId,
        status,
      });
      await syncService.updatePendingCount();
    }
  } else {
    await addToQueue("workOrderDays", "update", workOrderDayServerId, {
      workOrderDayServerId,
      status,
    });
    await syncService.updatePendingCount();
  }
}
