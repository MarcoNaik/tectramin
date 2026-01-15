"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import {
  type DocumentSection,
  type GlobalFilters,
  parseDocumentSections,
  parseGlobalFilters,
  stringifySections,
  stringifyFilters,
  createDefaultSection,
  SECTION_TYPES,
} from "@/types/documentBuilder";
import { DocumentList } from "./DocumentList";
import { DocumentEditor } from "./DocumentEditor";

export function DocumentBuilder() {
  const { user } = useUser();
  const userId = user?.id ?? "";

  const [selectedDocumentId, setSelectedDocumentId] = useState<Id<"documentTemplates"> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const documents = useQuery(
    api.admin.documentTemplates.list,
    userId ? { userId } : "skip"
  );

  const selectedDocument = useQuery(
    api.admin.documentTemplates.get,
    selectedDocumentId ? { id: selectedDocumentId } : "skip"
  );

  const createDocument = useMutation(api.admin.documentTemplates.create);
  const updateDocument = useMutation(api.admin.documentTemplates.update);
  const deleteDocument = useMutation(api.admin.documentTemplates.remove);
  const duplicateDocument = useMutation(api.admin.documentTemplates.duplicate);

  const handleCreateNew = async () => {
    if (!userId) return;

    const defaultSections: DocumentSection[] = [
      createDefaultSection("header"),
    ];

    const id = await createDocument({
      name: "Nuevo Documento",
      sections: stringifySections(defaultSections),
      globalFilters: stringifyFilters({}),
      createdBy: userId,
    });

    setSelectedDocumentId(id);
    setIsCreating(false);
  };

  const handleSelectDocument = (id: Id<"documentTemplates">) => {
    setSelectedDocumentId(id);
  };

  const handleBackToList = () => {
    setSelectedDocumentId(null);
  };

  const handleUpdateDocument = async (updates: {
    name?: string;
    description?: string;
    sections?: DocumentSection[];
    globalFilters?: GlobalFilters;
    isGlobalTemplate?: boolean;
  }) => {
    if (!selectedDocumentId) return;

    await updateDocument({
      id: selectedDocumentId,
      name: updates.name,
      description: updates.description,
      sections: updates.sections ? stringifySections(updates.sections) : undefined,
      globalFilters: updates.globalFilters ? stringifyFilters(updates.globalFilters) : undefined,
      isGlobalTemplate: updates.isGlobalTemplate,
    });
  };

  const handleDeleteDocument = async (id: Id<"documentTemplates">) => {
    await deleteDocument({ id });
    if (selectedDocumentId === id) {
      setSelectedDocumentId(null);
    }
  };

  const handleDuplicateDocument = async (id: Id<"documentTemplates">, newName: string) => {
    if (!userId) return;
    const newId = await duplicateDocument({ id, newName, createdBy: userId });
    setSelectedDocumentId(newId);
  };

  if (!userId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (selectedDocumentId && selectedDocument) {
    const sections = parseDocumentSections(selectedDocument.sections);
    const globalFilters = parseGlobalFilters(selectedDocument.globalFilters);

    return (
      <DocumentEditor
        document={selectedDocument}
        sections={sections}
        globalFilters={globalFilters}
        onBack={handleBackToList}
        onUpdate={handleUpdateDocument}
      />
    );
  }

  return (
    <DocumentList
      documents={documents ?? []}
      onSelectDocument={handleSelectDocument}
      onCreateNew={handleCreateNew}
      onDeleteDocument={handleDeleteDocument}
      onDuplicateDocument={handleDuplicateDocument}
    />
  );
}
