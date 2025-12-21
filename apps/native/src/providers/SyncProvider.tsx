import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useConvex, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@packages/backend/convex/_generated/api";
import { syncService } from "../sync/SyncService";
import { pullChanges } from "../sync/SyncPull";
import type { SyncStatus } from "../sync/types";

interface SyncContextValue {
  status: SyncStatus;
  sync: () => Promise<void>;
  isInitialized: boolean;
}

const SyncContext = createContext<SyncContextValue | null>(null);

interface SyncProviderProps {
  children: ReactNode;
}

export function SyncProvider({ children }: SyncProviderProps) {
  const convex = useConvex();
  const { user, isLoaded } = useUser();
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState<SyncStatus>(syncService.getStatus());

  const serverTasks = useQuery(
    api.tasks.get,
    user?.id && isInitialized ? { userId: user.id } : "skip"
  );

  useEffect(() => {
    if (serverTasks && user?.id) {
      pullChanges(convex, user.id);
    }
  }, [serverTasks, convex, user?.id]);

  useEffect(() => {
    if (!isLoaded || !user) return;

    syncService.initialize(convex, user.id).then(() => {
      setIsInitialized(true);
    });

    const unsubscribe = syncService.subscribe(setStatus);

    return () => {
      unsubscribe();
      syncService.destroy();
    };
  }, [convex, user, isLoaded]);

  const sync = async () => {
    await syncService.sync();
  };

  return (
    <SyncContext.Provider value={{ status, sync, isInitialized }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncContext() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSyncContext must be used within a SyncProvider");
  }
  return context;
}
