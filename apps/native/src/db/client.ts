import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync, deleteDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";

export const DATABASE_NAME = "tectramin.db";

const expoDb = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });

export const db = drizzle(expoDb, { schema });

export { expoDb };

export function resetDatabase() {
  try {
    expoDb.closeSync();
    deleteDatabaseSync(DATABASE_NAME);
    return true;
  } catch (e) {
    console.error("Failed to reset database:", e);
    return false;
  }
}
