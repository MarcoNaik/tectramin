import { BaseSelectorField } from "./selector/BaseSelectorField";
import type { FieldTemplate } from "../../db/types";

interface MultiSelectFieldProps {
  field: FieldTemplate;
  value: string | undefined;
  onChange: (value: string) => void;
  marginBottom?: number;
}

export function MultiSelectField({
  field,
  value,
  onChange,
  marginBottom = 16,
}: MultiSelectFieldProps) {
  return (
    <BaseSelectorField
      field={field}
      value={value}
      onChange={onChange}
      isMultiple={true}
      optionsConfig={{ type: "static", displayStyle: field.displayStyle }}
      placeholder="Seleccionar opciones..."
      marginBottom={marginBottom}
    />
  );
}
