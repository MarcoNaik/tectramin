import { BaseSelectorField } from "./selector/BaseSelectorField";
import { parseTaskInstanceSelectConfig } from "../../hooks/useTaskInstanceSelectOptions";
import type { FieldTemplate } from "../../db/types";

interface TaskInstanceSelectFieldProps {
  field: FieldTemplate;
  value: string | undefined;
  onChange: (value: string) => void;
  workOrderDayServerId: string | undefined;
  marginBottom?: number;
}

export function TaskInstanceSelectField({
  field,
  value,
  onChange,
  workOrderDayServerId,
  marginBottom = 16,
}: TaskInstanceSelectFieldProps) {
  const config = parseTaskInstanceSelectConfig(field.displayStyle ?? undefined);

  return (
    <BaseSelectorField
      field={field}
      value={value}
      onChange={onChange}
      isMultiple={false}
      optionsConfig={{
        type: "taskInstance",
        workOrderDayServerId,
        config,
      }}
      placeholder="Seleccionar instancia..."
      marginBottom={marginBottom}
    />
  );
}
