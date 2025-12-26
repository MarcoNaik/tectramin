"use client";

import { useDraggable } from "@dnd-kit/core";
import { FIELD_TYPES } from "@/types";

interface DraggableFieldTypeBadgeProps {
  type: typeof FIELD_TYPES[number];
}

export function DraggableFieldTypeBadge({ type }: DraggableFieldTypeBadgeProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `new-field-${type.value}`,
    data: { type: "new-field", fieldType: type.value },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg cursor-grab hover:border-blue-400 hover:shadow-sm transition-all duration-200 ${
        isDragging ? "opacity-30 scale-95" : ""
      }`}
    >
      <span className="w-6 text-center text-gray-500 font-medium">{type.icon}</span>
      <span className="text-sm text-gray-700">{type.label}</span>
    </div>
  );
}
