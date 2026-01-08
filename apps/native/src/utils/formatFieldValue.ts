import type { FieldTemplate, User, LookupEntity } from "../db/types";

export function formatFieldValue(
  value: string,
  fieldType: string,
  field: FieldTemplate | undefined,
  users: User[],
  lookupEntities: LookupEntity[]
): string {
  if (!value) return "-";

  switch (fieldType) {
    case "boolean":
      return value === "true" ? "Si" : "No";
    case "date":
      try {
        return new Date(value).toLocaleDateString("es-CL", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      } catch {
        return value;
      }
    case "attachment":
      return "Archivo adjunto";
    case "select":
      if (!field) return value;
      try {
        const options = JSON.parse(field.defaultValue || "[]");
        const option = options.find(
          (o: { value: string; label: string }) => o.value === value
        );
        return option?.label || value;
      } catch {
        return value;
      }
    case "userSelect": {
      const foundUser = users.find((u) => u.serverId === value);
      return foundUser?.fullName || value;
    }
    case "entitySelect": {
      const foundEntity = lookupEntities.find((e) => e.serverId === value);
      return foundEntity?.label || value;
    }
    case "displayText":
      return "";
    default:
      return value;
  }
}
