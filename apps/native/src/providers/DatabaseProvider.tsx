import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { db, expoDb } from "../db/client";
import migrations from "../db/migrations/migrations";

interface DatabaseContextValue {
  db: typeof db;
  isReady: boolean;
  error: Error | undefined;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

interface DatabaseProviderProps {
  children: ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const { success, error } = useMigrations(db, migrations);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log("[DatabaseProvider] Migration status - success:", success, "error:", error);
    if (success) {
      console.log("[DatabaseProvider] Migrations completed successfully");
      setIsReady(true);
    }
  }, [success, error]);

  useEffect(() => {
    console.log("[DatabaseProvider] isReady:", isReady);
  }, [isReady]);

  if (error) {
    console.error("[DatabaseProvider] Migration error:", error);
    return null;
  }

  if (!isReady) {
    console.log("[DatabaseProvider] Database not ready yet, waiting for migrations...");
    return null;
  }

  console.log("[DatabaseProvider] Database ready, rendering children");

  return (
    <DatabaseContext.Provider value={{ db, isReady, error }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabaseContext() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error("useDatabaseContext must be used within a DatabaseProvider");
  }
  return context;
}
