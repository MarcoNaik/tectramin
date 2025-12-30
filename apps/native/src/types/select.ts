export interface SelectOption {
  value: string;
  label: string;
}

export function parseSelectOptions(displayStyle: string | null | undefined): SelectOption[] {
  if (!displayStyle) return [];
  try {
    const parsed = JSON.parse(displayStyle);
    if (Array.isArray(parsed)) {
      return parsed.filter((opt): opt is SelectOption =>
        typeof opt === "object" && opt !== null && typeof opt.value === "string" && typeof opt.label === "string"
      );
    }
    return [];
  } catch {
    return [];
  }
}
