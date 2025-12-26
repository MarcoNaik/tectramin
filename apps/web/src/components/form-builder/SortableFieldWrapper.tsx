"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { FieldTemplateData } from "@/types";

interface SortableFieldWrapperProps {
  field: FieldTemplateData;
  children: React.ReactNode;
  isSelected?: boolean;
  conditionDepth?: number;
  onSelect?: () => void;
}

export function SortableFieldWrapper({
  field,
  children,
  isSelected = false,
  conditionDepth = 0,
  onSelect,
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
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="rounded-lg transition-transform duration-200"
    >
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          onMouseDown={() => onSelect?.()}
          className={`mt-1 cursor-grab transition-colors ${
            isSelected ? "text-blue-500" : "text-gray-300 hover:text-gray-500"
          }`}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
            <circle cx="2" cy="2" r="1.5" />
            <circle cx="8" cy="2" r="1.5" />
            <circle cx="2" cy="8" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="2" cy="14" r="1.5" />
            <circle cx="8" cy="14" r="1.5" />
          </svg>
        </button>
        <div className="flex-1 min-w-0 flex">
          {conditionDepth > 0 && (
            <div className="flex gap-1.5 mr-1 self-stretch">
              {Array.from({ length: conditionDepth }).map((_, i) => (
                <div key={i} className="w-2 flex flex-col">
                  <svg className="w-2 h-2 flex-shrink-0" viewBox="0 0 8 8">
                    <path
                      d="M 1 7 L 1 3 Q 1 1 3 1 L 8 1"
                      fill="none"
                      stroke="#d1d5db"
                      strokeWidth="2"
                    />
                  </svg>
                  <div className="flex-1 w-2">
                    <div className="w-[1px] h-full bg-gray-300 ml-[1px]" />
                  </div>
                  <svg className="w-2 h-2 flex-shrink-0" viewBox="0 0 8 8">
                    <path
                      d="M 1 1 L 1 5 Q 1 7 3 7 L 8 7"
                      fill="none"
                      stroke="#d1d5db"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              ))}
            </div>
          )}
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
