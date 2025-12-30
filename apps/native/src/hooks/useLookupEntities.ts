import { useMemo } from "react";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import { lookupEntityTypes, lookupEntities } from "../db/schema";
import type { LookupEntityType, LookupEntity } from "../db/types";

export function useLookupEntityTypes() {
  const { data: types } = useLiveQuery(
    db.select().from(lookupEntityTypes)
  );

  return {
    entityTypes: (types ?? []) as LookupEntityType[],
  };
}

export function useLookupEntities(
  entityTypeServerId?: string,
  parentEntityServerId?: string
) {
  const { data: allEntities } = useLiveQuery(
    db.select().from(lookupEntities)
  );

  const { data: types } = useLiveQuery(
    db.select().from(lookupEntityTypes)
  );

  const entities = useMemo(() => {
    if (!allEntities) return [];

    let filtered = allEntities as LookupEntity[];

    if (entityTypeServerId) {
      filtered = filtered.filter(
        (e) => e.entityTypeServerId === entityTypeServerId
      );
    }

    if (parentEntityServerId) {
      filtered = filtered.filter(
        (e) => e.parentEntityServerId === parentEntityServerId
      );
    }

    return filtered.sort((a, b) => a.displayOrder - b.displayOrder);
  }, [allEntities, entityTypeServerId, parentEntityServerId]);

  const entityType = useMemo(() => {
    if (!types || !entityTypeServerId) return null;
    return (types as LookupEntityType[]).find(
      (t) => t.serverId === entityTypeServerId
    ) ?? null;
  }, [types, entityTypeServerId]);

  return {
    entities,
    entityType,
    entityTypes: (types ?? []) as LookupEntityType[],
  };
}
