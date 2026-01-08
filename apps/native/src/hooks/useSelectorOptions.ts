import { useMemo } from "react";
import { useLookupEntities } from "./useLookupEntities";
import { useUsers } from "./useUsers";
import { parseSelectOptions } from "../types/select";
import type { SelectOption } from "../types/select";

export type OptionsSourceConfig =
  | { type: "static"; displayStyle: string | null | undefined }
  | { type: "entity"; entityTypeId: string | undefined; parentValue?: string }
  | { type: "user" };

export interface UseSelectorOptionsResult {
  options: SelectOption[];
  isLoading: boolean;
  needsParentSelection: boolean;
  entityTypeName?: string;
}

export function useSelectorOptions(config: OptionsSourceConfig): UseSelectorOptionsResult {
  const staticOptions = useMemo(() => {
    if (config.type !== "static") return [];
    return parseSelectOptions(config.displayStyle);
  }, [config.type === "static" ? config.displayStyle : null]);

  const { entities, entityType } = useLookupEntities(
    config.type === "entity" ? config.entityTypeId : undefined,
    config.type === "entity" ? config.parentValue : undefined
  );

  const { users } = useUsers();

  return useMemo(() => {
    switch (config.type) {
      case "static":
        return {
          options: staticOptions,
          isLoading: false,
          needsParentSelection: false,
        };

      case "entity": {
        const hasParentDependency = !!(
          config.entityTypeId &&
          entityType?.parentEntityTypeServerId &&
          !config.parentValue
        );

        return {
          options: entities.map((e) => ({
            value: e.serverId,
            label: e.label,
          })),
          isLoading: false,
          needsParentSelection: hasParentDependency,
          entityTypeName: entityType?.name ?? undefined,
        };
      }

      case "user":
        return {
          options: users.map((u) => ({
            value: u.serverId,
            label: u.fullName || u.email,
          })),
          isLoading: false,
          needsParentSelection: false,
        };
    }
  }, [config, staticOptions, entities, entityType, users]);
}
