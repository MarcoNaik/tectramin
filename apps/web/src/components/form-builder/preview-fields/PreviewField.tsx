"use client";

import type { FieldTemplateData } from "@/types";
import { PreviewFieldText } from "./PreviewFieldText";
import { PreviewFieldNumber } from "./PreviewFieldNumber";
import { PreviewFieldBoolean } from "./PreviewFieldBoolean";
import { PreviewFieldDate } from "./PreviewFieldDate";
import { PreviewFieldAttachment } from "./PreviewFieldAttachment";
import { PreviewFieldDisplayText } from "./PreviewFieldDisplayText";
import { PreviewFieldSelect } from "./PreviewFieldSelect";
import { PreviewFieldMultiSelect } from "./PreviewFieldMultiSelect";
import { PreviewFieldUserSelect } from "./PreviewFieldUserSelect";
import { PreviewFieldMultiUserSelect } from "./PreviewFieldMultiUserSelect";
import { PreviewFieldEntitySelect } from "./PreviewFieldEntitySelect";
import { PreviewFieldMultiEntitySelect } from "./PreviewFieldMultiEntitySelect";
import { PreviewFieldTaskInstanceSelect } from "./PreviewFieldTaskInstanceSelect";
import { PreviewFieldCoordinated } from "./PreviewFieldCoordinated";

interface PreviewFieldProps {
  field: FieldTemplateData;
  editingProperty: "label" | "placeholder" | null;
  onEditLabel: () => void;
  onEditPlaceholder: () => void;
  onSaveEdit: (value: string) => void;
  onCancelEdit: () => void;
  onSelect: () => void;
  isSelected: boolean;
}

export function PreviewField({
  field,
  editingProperty,
  onEditLabel,
  onEditPlaceholder,
  onSaveEdit,
  onCancelEdit,
  onSelect,
  isSelected,
}: PreviewFieldProps) {
  const commonProps = {
    field,
    editingProperty,
    onEditLabel,
    onSaveEdit,
    onCancelEdit,
    onSelect,
    isSelected,
  };

  switch (field.fieldType) {
    case "text":
      return <PreviewFieldText {...commonProps} onEditPlaceholder={onEditPlaceholder} />;
    case "number":
      return <PreviewFieldNumber {...commonProps} onEditPlaceholder={onEditPlaceholder} />;
    case "boolean":
      return <PreviewFieldBoolean {...commonProps} />;
    case "date":
      return <PreviewFieldDate {...commonProps} />;
    case "attachment":
      return <PreviewFieldAttachment {...commonProps} />;
    case "displayText":
      return <PreviewFieldDisplayText field={field} onSelect={onSelect} isSelected={isSelected} />;
    case "select":
      return <PreviewFieldSelect {...commonProps} />;
    case "multiSelect":
      return <PreviewFieldMultiSelect {...commonProps} />;
    case "userSelect":
      return <PreviewFieldUserSelect {...commonProps} />;
    case "multiUserSelect":
      return <PreviewFieldMultiUserSelect {...commonProps} />;
    case "entitySelect":
      return <PreviewFieldEntitySelect {...commonProps} />;
    case "multiEntitySelect":
      return <PreviewFieldMultiEntitySelect {...commonProps} />;
    case "taskInstanceSelect":
      return <PreviewFieldTaskInstanceSelect {...commonProps} />;
    case "coordenated":
      return <PreviewFieldCoordinated {...commonProps} />;
    default:
      return <PreviewFieldText {...commonProps} onEditPlaceholder={onEditPlaceholder} />;
  }
}
