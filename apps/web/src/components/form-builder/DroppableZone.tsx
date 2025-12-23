"use client";

import { useDroppable } from "@dnd-kit/core";

interface DroppableZoneProps {
  id: string;
  isOver: boolean;
}

export function DroppableZone({ id, isOver }: DroppableZoneProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`transition-all rounded ${
        isOver
          ? "h-16 bg-blue-50 border-2 border-dashed border-blue-400 my-2"
          : "h-1 my-0"
      }`}
    />
  );
}
