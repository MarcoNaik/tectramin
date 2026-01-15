"use client";

import { type SectionType, SECTION_TYPES } from "@/types/documentBuilder";

interface SectionPaletteProps {
  onAddSection: (type: SectionType) => void;
}

export function SectionPalette({ onAddSection }: SectionPaletteProps) {
  return (
    <div className="w-56 border-r-2 border-black bg-gray-50 flex flex-col">
      <div className="p-3 border-b-2 border-black">
        <h2 className="font-bold text-sm text-gray-600">SECCIONES</h2>
        <p className="text-xs text-gray-400">Haz clic para agregar</p>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-2">
        {SECTION_TYPES.map((sectionType) => (
          <button
            key={sectionType.value}
            onClick={() => onAddSection(sectionType.value as SectionType)}
            className="w-full p-3 bg-white border-2 border-black hover:shadow-[2px_2px_0px_0px_#000] transition-shadow text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{sectionType.icon}</span>
              <div>
                <div className="font-bold text-sm">{sectionType.label}</div>
                <div className="text-xs text-gray-500">{sectionType.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
