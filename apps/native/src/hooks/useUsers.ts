import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { db } from "../db/client";
import { users } from "../db/schema";
import type { User } from "../db/types";

export function useUsers() {
  const { data: userList } = useLiveQuery(db.select().from(users));

  return {
    users: (userList ?? []) as User[],
  };
}
