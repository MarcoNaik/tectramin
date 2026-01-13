import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import { sql, getTableName } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import * as schema from "./schema";

export const DATABASE_NAME = "tectramin.db";

const expoDb = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
export const db = drizzle(expoDb, { schema });

export { expoDb };

export async function clearAllData() {
  try {
    const tables = Object.values(schema).filter(
      (value): value is SQLiteTable => value instanceof SQLiteTable
    );

    for (const table of tables) {
      const tableName = getTableName(table);
      await db.run(sql.raw(`DELETE FROM ${tableName}`));
    }

    return true;
  } catch (e) {
    console.error("Failed to clear database:", e);
    return false;
  }
}
