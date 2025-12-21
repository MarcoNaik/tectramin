import React, { ReactNode } from "react";
import { DatabaseProvider } from "./DatabaseProvider";
import { SyncProvider } from "./SyncProvider";

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  return (
    <DatabaseProvider>
      <SyncProvider>{children}</SyncProvider>
    </DatabaseProvider>
  );
}
