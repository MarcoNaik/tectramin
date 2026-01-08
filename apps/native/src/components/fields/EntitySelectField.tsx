import { useMemo } from "react";
import { BaseSelectorField } from "./selector/BaseSelectorField";
import type { FieldTemplate } from "../../db/types";

interface EntitySelectConfig {
  entityTypeId?: string;
  filterByFieldId?: string;
}

function parseEntitySelectConfig(displayStyle: string | undefined): EntitySelectConfig {
  if (!displayStyle) return {};
  try {
    const parsed = JSON.parse(displayStyle);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as EntitySelectConfig;
    }
    return {};
  } catch {
    return {};
  }
}

interface EntitySelectFieldProps {
  field: FieldTemplate;
  value: string | undefined;
  onChange: (value: string) => void;
  getResponseForField?: (fieldServerId: string) => string | undefined;
  marginBottom?: number;
}

export function EntitySelectField({
  field,
  value,
  onChange,
  getResponseForField,
  marginBottom = 16,
}: EntitySelectFieldProps) {
  const config = parseEntitySelectConfig(field.displayStyle ?? undefined);

  const parentEntityValue = useMemo(() => {
    if (!config.filterByFieldId || !getResponseForField) return undefined;
    return getResponseForField(config.filterByFieldId);
  }, [config.filterByFieldId, getResponseForField]);

  return (
    <BaseSelectorField
      field={field}
      value={value}
      onChange={onChange}
      isMultiple={false}
      optionsConfig={{
        type: "entity",
        entityTypeId: config.entityTypeId,
        parentValue: parentEntityValue,
      }}
      placeholder="Seleccionar..."
      disabledPlaceholder="Selecciona el campo padre primero..."
      marginBottom={marginBottom}
    />
  );
}

export { parseEntitySelectConfig };
