import { createContext, useContext, useRef, useCallback, ReactNode } from "react";

interface PendingValue {
  value: string;
  flush: () => void;
}

interface PendingFieldValuesContextType {
  registerPending: (fieldServerId: string, value: string, flush: () => void) => void;
  unregisterPending: (fieldServerId: string) => void;
  getPendingValue: (fieldServerId: string) => string | undefined;
  flushAll: () => void;
  getAllPending: () => Map<string, PendingValue>;
}

const PendingFieldValuesContext = createContext<PendingFieldValuesContextType | null>(null);

export function PendingFieldValuesProvider({ children }: { children: ReactNode }) {
  const pendingRef = useRef<Map<string, PendingValue>>(new Map());

  const registerPending = useCallback((fieldServerId: string, value: string, flush: () => void) => {
    pendingRef.current.set(fieldServerId, { value, flush });
  }, []);

  const unregisterPending = useCallback((fieldServerId: string) => {
    pendingRef.current.delete(fieldServerId);
  }, []);

  const getPendingValue = useCallback((fieldServerId: string) => {
    return pendingRef.current.get(fieldServerId)?.value;
  }, []);

  const flushAll = useCallback(() => {
    pendingRef.current.forEach((pending) => {
      pending.flush();
    });
  }, []);

  const getAllPending = useCallback(() => {
    return new Map(pendingRef.current);
  }, []);

  return (
    <PendingFieldValuesContext.Provider
      value={{ registerPending, unregisterPending, getPendingValue, flushAll, getAllPending }}
    >
      {children}
    </PendingFieldValuesContext.Provider>
  );
}

export function usePendingFieldValues() {
  const ctx = useContext(PendingFieldValuesContext);
  if (!ctx) throw new Error("usePendingFieldValues must be used within PendingFieldValuesProvider");
  return ctx;
}
