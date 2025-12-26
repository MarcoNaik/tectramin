import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { db } from "../db/client";
import { fieldConditions } from "../db/schema";
import type { FieldCondition } from "../db/types";

export function useFieldConditions() {
  const { data: conditionList } = useLiveQuery(
    db.select().from(fieldConditions)
  );

  return {
    conditions: (conditionList ?? []) as FieldCondition[],
  };
}
