"use client";

import { useState } from "react";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import type { DocumentTemplateData } from "@/types/documentBuilder";

interface DocumentListProps {
  documents: DocumentTemplateData[];
  onSelectDocument: (id: Id<"documentTemplates">) => void;
  onCreateNew: () => void;
  onDeleteDocument: (id: Id<"documentTemplates">) => void;
  onDuplicateDocument: (id: Id<"documentTemplates">, newName: string) => void;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Hace un momento";
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7) return `Hace ${days}d`;
  return new Date(timestamp).toLocaleDateString("es-CL");
}

function DocumentCard({
  document,
  onSelect,
  onDelete,
  onDuplicate,
}: {
  document: DocumentTemplateData;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [duplicateName, setDuplicateName] = useState("");
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const handleDuplicate = () => {
    if (duplicateName.trim()) {
      onDuplicate();
      setShowDuplicateModal(false);
      setDuplicateName("");
    }
  };

  return (
    <>
      <div
        className="border-2 border-black bg-white p-4 hover:shadow-[4px_4px_0px_0px_#000] transition-shadow cursor-pointer relative group"
        onClick={onSelect}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {document.isGlobalTemplate && (
                <span className="text-yellow-500" title="Plantilla Global">
                  ⭐
                </span>
              )}
              <h3 className="font-bold text-lg truncate">{document.name}</h3>
            </div>
            {document.description && (
              <p className="text-gray-600 text-sm mt-1 truncate">{document.description}</p>
            )}
            <p className="text-gray-400 text-xs mt-2">
              Editado {formatRelativeTime(document.updatedAt)}
            </p>
          </div>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>

            {showMenu && (
              <div
                className="absolute right-0 top-full mt-1 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] z-10 min-w-[150px]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                  onClick={() => {
                    setShowDuplicateModal(true);
                    setDuplicateName(`${document.name} (copia)`);
                    setShowMenu(false);
                  }}
                >
                  Duplicar
                </button>
                <button
                  className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 text-sm"
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setShowMenu(false);
                  }}
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white border-2 border-black p-6 max-w-md w-full mx-4 shadow-[8px_8px_0px_0px_#000]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-4">Eliminar documento</h3>
            <p className="text-gray-600 mb-6">
              ¿Estas seguro de que deseas eliminar <strong>{document.name}</strong>? Esta accion no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 border-2 border-black hover:bg-gray-100"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 bg-red-500 text-white border-2 border-black hover:bg-red-600"
                onClick={() => {
                  onDelete();
                  setShowDeleteConfirm(false);
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDuplicateModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowDuplicateModal(false)}
        >
          <div
            className="bg-white border-2 border-black p-6 max-w-md w-full mx-4 shadow-[8px_8px_0px_0px_#000]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-4">Duplicar documento</h3>
            <input
              type="text"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              className="w-full border-2 border-black px-3 py-2 mb-6"
              placeholder="Nombre del nuevo documento"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 border-2 border-black hover:bg-gray-100"
                onClick={() => setShowDuplicateModal(false)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white border-2 border-black hover:bg-blue-600"
                onClick={handleDuplicate}
                disabled={!duplicateName.trim()}
              >
                Duplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function DocumentList({
  documents,
  onSelectDocument,
  onCreateNew,
  onDeleteDocument,
  onDuplicateDocument,
}: DocumentListProps) {
  const userDocuments = documents.filter((d) => !d.isGlobalTemplate);
  const globalTemplates = documents.filter((d) => d.isGlobalTemplate);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b-2 border-black p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documentos</h1>
        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-blue-500 text-white border-2 border-black font-bold hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo Documento
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">No hay documentos</h3>
            <p className="text-gray-500 mb-4">Crea tu primer documento para empezar</p>
            <button
              onClick={onCreateNew}
              className="px-6 py-3 bg-blue-500 text-white border-2 border-black font-bold hover:bg-blue-600 transition-colors"
            >
              Crear Documento
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {userDocuments.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-4">Mis Documentos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userDocuments.map((doc) => (
                    <DocumentCard
                      key={doc._id}
                      document={doc}
                      onSelect={() => onSelectDocument(doc._id)}
                      onDelete={() => onDeleteDocument(doc._id)}
                      onDuplicate={() => onDuplicateDocument(doc._id, `${doc.name} (copia)`)}
                    />
                  ))}
                </div>
              </section>
            )}

            {globalTemplates.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-4">Plantillas Globales</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {globalTemplates.map((doc) => (
                    <DocumentCard
                      key={doc._id}
                      document={doc}
                      onSelect={() => onSelectDocument(doc._id)}
                      onDelete={() => onDeleteDocument(doc._id)}
                      onDuplicate={() => onDuplicateDocument(doc._id, `${doc.name} (copia)`)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
