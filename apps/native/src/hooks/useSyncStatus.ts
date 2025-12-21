import { useState, useEffect } from "react";
import { syncService } from "../sync/SyncService";
import type { SyncStatus } from "../sync/types";

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(syncService.getStatus());

  useEffect(() => {
    return syncService.subscribe(setStatus);
  }, []);

  return status;
}
