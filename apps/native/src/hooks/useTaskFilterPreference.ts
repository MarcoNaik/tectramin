import { useCallback } from "react";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/client";
import { userPreferences } from "../db/schema";

export type TaskFilterMode = "all" | "pending";

const FILTER_KEY_PREFIX = "taskFilter_";

export function useTaskFilterPreference(
  assignmentServerId: string,
  userId: string
) {
  const key = `${FILTER_KEY_PREFIX}${assignmentServerId}`;

  const { data: preferences } = useLiveQuery(
    db
      .select()
      .from(userPreferences)
      .where(
        and(eq(userPreferences.userId, userId), eq(userPreferences.key, key))
      )
  );

  const filterMode: TaskFilterMode =
    (preferences?.[0]?.value as TaskFilterMode) ?? "all";

  const setFilterMode = useCallback(
    async (mode: TaskFilterMode) => {
      const now = new Date();
      const existing = preferences?.[0];

      if (existing) {
        await db
          .update(userPreferences)
          .set({ value: mode, updatedAt: now })
          .where(eq(userPreferences.id, existing.id));
      } else {
        await db.insert(userPreferences).values({
          id: uuidv4(),
          key,
          value: mode,
          userId,
          updatedAt: now,
        });
      }
    },
    [key, userId, preferences]
  );

  return { filterMode, setFilterMode };
}
