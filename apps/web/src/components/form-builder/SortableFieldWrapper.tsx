"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { FieldTemplateData } from "@/types";

interface SortableFieldWrapperProps {
  field: FieldTemplateData;
  children: React.ReactNode;
}

export function SortableFieldWrapper({
  field,
  children,
}: SortableFieldWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="mb-4">
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          className="mt-1 p-1 cursor-grab hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="5" r="1" fill="currentColor" />
            <circle cx="15" cy="5" r="1" fill="currentColor" />
            <circle cx="9" cy="12" r="1" fill="currentColor" />
            <circle cx="15" cy="12" r="1" fill="currentColor" />
            <circle cx="9" cy="19" r="1" fill="currentColor" />
            <circle cx="15" cy="19" r="1" fill="currentColor" />
          </svg>
        </button>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
