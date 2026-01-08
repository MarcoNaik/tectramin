export function parseSelectValue(
  value: string | undefined,
  isMultiple: boolean
): string | string[] | undefined {
  if (!value) {
    return isMultiple ? [] : undefined;
  }

  if (isMultiple) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
      return [value];
    } catch {
      return value ? [value] : [];
    }
  }

  return value;
}

export function serializeSelectValue(
  value: string | string[] | undefined
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? JSON.stringify(value) : undefined;
  }

  return value;
}

export function toggleMultiValue(current: string[], valueToToggle: string): string[] {
  if (current.includes(valueToToggle)) {
    return current.filter((v) => v !== valueToToggle);
  }
  return [...current, valueToToggle];
}

export function getSelectedLabels(
  selectedValues: string[],
  options: Array<{ value: string; label: string }>
): string[] {
  return selectedValues
    .map((val) => options.find((opt) => opt.value === val)?.label)
    .filter((label): label is string => label !== undefined);
}
