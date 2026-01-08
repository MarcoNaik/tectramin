import { BaseSelectorField } from "./selector/BaseSelectorField";
import type { FieldTemplate } from "../../db/types";

interface SelectFieldProps {
  field: FieldTemplate;
  value: string | undefined;
  onChange: (value: string) => void;
  marginBottom?: number;
}

export function SelectField({
  field,
  value,
  onChange,
  marginBottom = 16,
}: SelectFieldProps) {
  return (
    <BaseSelectorField
      field={field}
      value={value}
      onChange={onChange}
      isMultiple={false}
      optionsConfig={{ type: "static", displayStyle: field.displayStyle }}
      placeholder="Seleccionar una opcion..."
      marginBottom={marginBottom}
    />
  );
}
