import type { FieldTemplate } from "../db/types";

export interface FieldPage {
  fields: FieldTemplate[];
  pageIndex: number;
  inputFieldCount: number;
}

export function paginateFields(
  visibleFields: FieldTemplate[],
  maxInputFieldsPerPage: number = 10
): FieldPage[] {
  const pages: FieldPage[] = [];
  let currentPage: FieldTemplate[] = [];
  let currentInputCount = 0;
  let displayTextBuffer: FieldTemplate[] = [];

  for (const field of visibleFields) {
    if (field.fieldType === "displayText") {
      displayTextBuffer.push(field);
    } else {
      if (currentInputCount >= maxInputFieldsPerPage) {
        pages.push({
          fields: currentPage,
          pageIndex: pages.length,
          inputFieldCount: currentInputCount,
        });
        currentPage = [];
        currentInputCount = 0;
      }

      currentPage.push(...displayTextBuffer, field);
      displayTextBuffer = [];
      currentInputCount++;
    }
  }

  if (displayTextBuffer.length > 0) {
    currentPage.push(...displayTextBuffer);
  }

  if (currentPage.length > 0) {
    pages.push({
      fields: currentPage,
      pageIndex: pages.length,
      inputFieldCount: currentInputCount,
    });
  }

  return pages;
}
