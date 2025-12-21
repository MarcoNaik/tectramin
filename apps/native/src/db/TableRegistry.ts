import type { FunctionReference } from "convex/server";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";

export interface TableConfig<T extends SQLiteTable = SQLiteTable> {
  name: string;
  localSchema: T;
  convexUpsert: FunctionReference<"mutation", "public", any, any>;
  convexGetChanges: FunctionReference<"query", "public", any, any>;
  convexGetAll: FunctionReference<"query", "public", any, any>;
  mapToLocal: (serverRecord: any) => any;
  mapToServer: (localRecord: any) => any;
}

class TableRegistryClass {
  private tables: Map<string, TableConfig> = new Map();

  register<T extends SQLiteTable>(config: TableConfig<T>) {
    this.tables.set(config.name, config);
  }

  get(name: string): TableConfig | undefined {
    return this.tables.get(name);
  }

  getAll(): TableConfig[] {
    return Array.from(this.tables.values());
  }

  has(name: string): boolean {
    return this.tables.has(name);
  }
}

export const tableRegistry = new TableRegistryClass();
