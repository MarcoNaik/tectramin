import { BaseSelectorField } from "./selector/BaseSelectorField";
import type { FieldTemplate } from "../../db/types";

interface MultiUserSelectFieldProps {
  field: FieldTemplate;
  value: string | undefined;
  onChange: (value: string) => void;
  marginBottom?: number;
}

export function MultiUserSelectField({
  field,
  value,
  onChange,
  marginBottom = 16,
}: MultiUserSelectFieldProps) {
  return (
    <BaseSelectorField
      field={field}
      value={value}
      onChange={onChange}
      isMultiple={true}
      optionsConfig={{ type: "user" }}
      placeholder="Seleccionar usuarios..."
      marginBottom={marginBottom}
    />
  );
}
