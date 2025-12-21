import { useDatabaseContext } from "../providers/DatabaseProvider";

export function useDatabase() {
  const { db, isReady, error } = useDatabaseContext();
  return { db, isReady, error: error ?? null };
}
