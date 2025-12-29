"use client";

import { useState } from "react";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (name: string) => Promise<void>;
  routineName?: string;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onCreateTask,
  routineName,
}: CreateTaskModalProps) {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await onCreateTask(name.trim());
      setName("");
      onClose();
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isCreating) {
      handleCreate();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Crear Nueva Tarea
        </h2>

        {routineName && (
          <p className="text-sm text-gray-600 mb-4">
            Se agregara automaticamente a la rutina: <strong>{routineName}</strong>
          </p>
        )}

        <input
          type="text"
          placeholder="Nombre de la tarea"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoFocus
        />

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            disabled={isCreating}
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || isCreating}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? "Creando..." : "Crear Tarea"}
          </button>
        </div>
      </div>
    </div>
  );
}
