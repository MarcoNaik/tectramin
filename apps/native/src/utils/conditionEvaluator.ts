import type { FieldCondition, FieldTemplate, FieldResponse } from "../db/types";

export function evaluateCondition(
  condition: FieldCondition,
  responses: FieldResponse[],
  fieldTemplates: FieldTemplate[]
): boolean {
  const parentField = fieldTemplates.find(
    (f) => f.serverId === condition.parentFieldServerId
  );
  if (!parentField) return true;

  const response = responses.find(
    (r) => r.fieldTemplateServerId === condition.parentFieldServerId
  );
  const value = response?.value ?? "";
  const targetValue = condition.value;

  let targetArray: string[] = [];
  if (
    condition.operator === "includes" &&
    typeof targetValue === "string"
  ) {
    try {
      const parsed = JSON.parse(targetValue);
      if (Array.isArray(parsed)) {
        targetArray = parsed;
      } else {
        targetArray = [targetValue];
      }
    } catch {
      targetArray = [targetValue];
    }
  }

  switch (condition.operator) {
    case "equals":
      return value === targetValue;
    case "notEquals":
      return value !== targetValue;
    case "contains":
      return value.includes(targetValue);
    case "isEmpty":
      return !value || value.trim() === "";
    case "isNotEmpty":
      return !!value && value.trim() !== "";
    case "greaterThan":
      return parseFloat(value) > parseFloat(targetValue);
    case "lessThan":
      return parseFloat(value) < parseFloat(targetValue);
    case "greaterOrEqual":
      return parseFloat(value) >= parseFloat(targetValue);
    case "lessOrEqual":
      return parseFloat(value) <= parseFloat(targetValue);
    case "before":
      return new Date(value) < new Date(targetValue);
    case "after":
      return new Date(value) > new Date(targetValue);
    case "onOrBefore":
      return new Date(value) <= new Date(targetValue);
    case "onOrAfter":
      return new Date(value) >= new Date(targetValue);
    case "includes":
      return targetArray.some((t) => value === t);
    default:
      return true;
  }
}

export function evaluateFieldVisibility(
  field: FieldTemplate,
  conditions: FieldCondition[],
  responses: FieldResponse[],
  allFields: FieldTemplate[]
): boolean {
  const fieldConditions = conditions.filter(
    (c) => c.childFieldServerId === field.serverId
  );

  if (fieldConditions.length === 0) {
    return true;
  }

  const results = fieldConditions.map((c) =>
    evaluateCondition(c, responses, allFields)
  );

  if (field.conditionLogic === "OR") {
    return results.some((r) => r);
  }
  return results.every((r) => r);
}

export function getVisibleFields(
  fields: FieldTemplate[],
  conditions: FieldCondition[],
  responses: FieldResponse[]
): FieldTemplate[] {
  return fields.filter((field) =>
    evaluateFieldVisibility(field, conditions, responses, fields)
  );
}

export function getVisibleRequiredFields(
  fields: FieldTemplate[],
  conditions: FieldCondition[],
  responses: FieldResponse[]
): FieldTemplate[] {
  return getVisibleFields(fields, conditions, responses).filter(
    (f) => f.isRequired
  );
}
