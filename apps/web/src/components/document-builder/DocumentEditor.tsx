"use client";

import { useState } from "react";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import {
  type DocumentSection,
  type GlobalFilters,
  type SectionType,
  createDefaultSection,
} from "@/types/documentBuilder";
import { SectionPalette } from "./SectionPalette";
import { DocumentCanvas } from "./DocumentCanvas";
import { SectionEditor } from "./SectionEditor";
import { GlobalFiltersBar } from "./GlobalFiltersBar";
import { DocumentPreview } from "./DocumentPreview";

interface DocumentEditorProps {
  document: {
    _id: Id<"documentTemplates">;
    name: string;
    description?: string;
    isGlobalTemplate: boolean;
  };
  sections: DocumentSection[];
  globalFilters: GlobalFilters;
  onBack: () => void;
  onUpdate: (updates: {
    name?: string;
    description?: string;
    sections?: DocumentSection[];
    globalFilters?: GlobalFilters;
    isGlobalTemplate?: boolean;
  }) => Promise<void>;
}

export function DocumentEditor({
  document,
  sections,
  globalFilters,
  onBack,
  onUpdate,
}: DocumentEditorProps) {
  const [localSections, setLocalSections] = useState<DocumentSection[]>(sections);
  const [localFilters, setLocalFilters] = useState<GlobalFilters>(globalFilters);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState(document.name);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isGlobalTemplate, setIsGlobalTemplate] = useState(document.isGlobalTemplate);

  const selectedSection = localSections.find((s) => s.id === selectedSectionId);

  const handleAddSection = (type: SectionType) => {
    const newSection = createDefaultSection(type);
    const updatedSections = [...localSections, newSection];
    setLocalSections(updatedSections);
    setSelectedSectionId(newSection.id);
    handleSave(updatedSections);
  };

  const handleUpdateSection = (sectionId: string, updates: Partial<DocumentSection>) => {
    const updatedSections = localSections.map((s) =>
      s.id === sectionId ? { ...s, ...updates } : s
    );
    setLocalSections(updatedSections as DocumentSection[]);
    handleSave(updatedSections as DocumentSection[]);
  };

  const handleDeleteSection = (sectionId: string) => {
    const updatedSections = localSections.filter((s) => s.id !== sectionId);
    setLocalSections(updatedSections);
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null);
    }
    handleSave(updatedSections);
  };

  const handleMoveSection = (sectionId: string, direction: "up" | "down") => {
    const index = localSections.findIndex((s) => s.id === sectionId);
    if (index === -1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localSections.length) return;

    const updatedSections = [...localSections];
    [updatedSections[index], updatedSections[newIndex]] = [
      updatedSections[newIndex],
      updatedSections[index],
    ];
    setLocalSections(updatedSections);
    handleSave(updatedSections);
  };

  const handleSave = async (sectionsToSave?: DocumentSection[]) => {
    setIsSaving(true);
    try {
      await onUpdate({
        sections: sectionsToSave ?? localSections,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveName = async () => {
    if (documentName !== document.name) {
      await onUpdate({ name: documentName });
    }
  };

  const handleUpdateFilters = async (filters: GlobalFilters) => {
    setLocalFilters(filters);
    await onUpdate({ globalFilters: filters });
  };

  const handleToggleGlobalTemplate = async () => {
    const newValue = !isGlobalTemplate;
    setIsGlobalTemplate(newValue);
    await onUpdate({ isGlobalTemplate: newValue });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b-2 border-black p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 transition-colors"
            title="Volver a la lista"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <input
            type="text"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            onBlur={handleSaveName}
            className="text-xl font-bold border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 outline-none px-1 py-0.5"
          />
          {isSaving && (
            <span className="text-sm text-gray-500">Guardando...</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isGlobalTemplate}
              onChange={handleToggleGlobalTemplate}
              className="w-4 h-4"
            />
            <span>Plantilla Global</span>
          </label>
          <button
            className="px-4 py-2 border-2 border-black hover:bg-gray-100 transition-colors font-bold"
            onClick={() => setShowPreview(true)}
          >
            Vista Previa
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white border-2 border-black hover:bg-blue-600 transition-colors font-bold"
            onClick={() => setShowPreview(true)}
          >
            Generar PDF
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <SectionPalette onAddSection={handleAddSection} />

        <DocumentCanvas
          sections={localSections}
          selectedSectionId={selectedSectionId}
          onSelectSection={setSelectedSectionId}
          onDeleteSection={handleDeleteSection}
          onMoveSection={handleMoveSection}
        />

        <SectionEditor
          section={selectedSection}
          onUpdate={(updates) => {
            if (selectedSectionId) {
              handleUpdateSection(selectedSectionId, updates);
            }
          }}
        />
      </div>

      <GlobalFiltersBar
        filters={localFilters}
        onUpdate={handleUpdateFilters}
      />

      {showPreview && (
        <DocumentPreview
          sections={localSections}
          globalFilters={localFilters}
          documentName={documentName}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
