import { BaseSelectorField } from "./selector/BaseSelectorField";
import type { FieldTemplate } from "../../db/types";

interface UserSelectFieldProps {
  field: FieldTemplate;
  value: string | undefined;
  onChange: (value: string) => void;
  marginBottom?: number;
}

export function UserSelectField({
  field,
  value,
  onChange,
  marginBottom = 16,
}: UserSelectFieldProps) {
  return (
    <BaseSelectorField
      field={field}
      value={value}
      onChange={onChange}
      isMultiple={false}
      optionsConfig={{ type: "user" }}
      placeholder="Seleccionar un usuario..."
      marginBottom={marginBottom}
    />
  );
}
