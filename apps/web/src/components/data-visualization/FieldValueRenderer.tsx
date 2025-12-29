"use client";

interface SelectOption {
  value: string;
  label: string;
}

function parseSelectOptions(displayStyle: string | undefined): SelectOption[] {
  if (!displayStyle) return [];
  try {
    const parsed = JSON.parse(displayStyle);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (opt): opt is SelectOption =>
          typeof opt === "object" &&
          opt !== null &&
          typeof opt.value === "string"
      );
    }
    return [];
  } catch {
    return [];
  }
}

interface FieldValueRendererProps {
  fieldType: string;
  value: string | undefined;
  displayStyle?: string;
  attachmentUrl?: string;
}

export function FieldValueRenderer({
  fieldType,
  value,
  displayStyle,
  attachmentUrl,
}: FieldValueRendererProps) {
  if (fieldType === "displayText") {
    return <span className="text-gray-400 italic">N/A</span>;
  }

  if (!value && !attachmentUrl) {
    return <span className="text-gray-400">—</span>;
  }

  switch (fieldType) {
    case "text":
    case "number":
      return <span className="font-mono">{value}</span>;

    case "boolean":
      return (
        <span
          className={`px-2 py-0.5 text-xs font-bold border-2 ${
            value === "true"
              ? "border-green-500 bg-green-50 text-green-700"
              : "border-red-500 bg-red-50 text-red-700"
          }`}
        >
          {value === "true" ? "Si" : "No"}
        </span>
      );

    case "date":
      return (
        <span className="font-mono">
          {value ? new Date(value).toLocaleDateString("es-CL") : "—"}
        </span>
      );

    case "select": {
      const options = parseSelectOptions(displayStyle);
      const selectedOption = options.find((opt) => opt.value === value);
      return <span>{selectedOption?.label ?? value}</span>;
    }

    case "userSelect":
      return <span>{value}</span>;

    case "attachment":
      if (attachmentUrl) {
        return (
          <a
            href={attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline font-bold"
          >
            Ver Archivo
          </a>
        );
      }
      return <span className="text-gray-400">Sin archivo</span>;

    default:
      return <span>{value ?? "—"}</span>;
  }
}
