import { useMemo } from "react";
import { BaseSelectorField } from "./selector/BaseSelectorField";
import { parseEntitySelectConfig } from "./EntitySelectField";
import type { FieldTemplate } from "../../db/types";

interface MultiEntitySelectFieldProps {
  field: FieldTemplate;
  value: string | undefined;
  onChange: (value: string) => void;
  getResponseForField?: (fieldServerId: string) => string | undefined;
  marginBottom?: number;
}

export function MultiEntitySelectField({
  field,
  value,
  onChange,
  getResponseForField,
  marginBottom = 16,
}: MultiEntitySelectFieldProps) {
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
      isMultiple={true}
      optionsConfig={{
        type: "entity",
        entityTypeId: config.entityTypeId,
        parentValue: parentEntityValue,
      }}
      placeholder="Seleccionar entidades..."
      disabledPlaceholder="Selecciona el campo padre primero..."
      marginBottom={marginBottom}
    />
  );
}
