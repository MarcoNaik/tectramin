"use client";

import { useDroppable } from "@dnd-kit/core";

interface DroppableZoneProps {
  id: string;
}

export function DroppableZone({ id }: DroppableZoneProps) {
  const { setNodeRef } = useDroppable({ id });
  return <div id={id} ref={setNodeRef} className="h-1" />;
}
