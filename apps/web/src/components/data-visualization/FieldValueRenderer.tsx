"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import { ImagePreviewModal } from "./ImagePreviewModal";

interface SelectOption {
  value: string;
  label: string;
}

interface EntitySelectConfig {
  entityTypeId?: string;
}

function parseSelectOptions(displayStyle: string | undefined): SelectOption[] {
  if (!displayStyle) return [];
  try {
    const parsed = JSON.parse(displayStyle);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (opt): opt is SelectOption =>
          typeof opt === "object" &&
          opt !== null &&
          typeof opt.value === "string"
      );
    }
    return [];
  } catch {
    return [];
  }
}

function parseEntitySelectConfig(displayStyle: string | undefined): EntitySelectConfig {
  if (!displayStyle) return {};
  try {
    const parsed = JSON.parse(displayStyle);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as EntitySelectConfig;
    }
    return {};
  } catch {
    return {};
  }
}

interface FieldValueRendererProps {
  fieldType: string;
  value: string | undefined;
  displayStyle?: string;
  attachmentUrl?: string;
  responseId: Id<"fieldResponses">;
  onUpdate: (id: Id<"fieldResponses">, value: string | undefined) => void;
}

export function FieldValueRenderer({
  fieldType,
  value,
  displayStyle,
  attachmentUrl,
  responseId,
  onUpdate,
}: FieldValueRendererProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [localValue, setLocalValue] = useState(value ?? "");
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const users = useQuery(api.shared.users.listActive, fieldType === "userSelect" ? {} : "skip");
  const entityConfig = parseEntitySelectConfig(displayStyle);
  const entities = useQuery(
    api.admin.lookupEntities.listActiveByType,
    fieldType === "entitySelect" && entityConfig.entityTypeId
      ? { entityTypeId: entityConfig.entityTypeId as Id<"lookupEntityTypes"> }
      : "skip"
  );

  const debouncedUpdate = useDebouncedCallback(
    (newValue: string | undefined) => {
      onUpdate(responseId, newValue);
    },
    300
  );

  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    setIsEditing(false);
    const newValue = localValue.trim() || undefined;
    if (newValue !== value) {
      debouncedUpdate(newValue);
    }
  }, [localValue, value, debouncedUpdate]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isEditing) {
          handleSave();
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing, handleSave]);

  const handleCancel = () => {
    setIsEditing(false);
    setLocalValue(value ?? "");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    const finalValue = newValue.trim() || undefined;
    debouncedUpdate(finalValue);
  };

  const isEditable = fieldType !== "displayText" && fieldType !== "attachment";

  if (fieldType === "displayText") {
    return <span className="text-gray-400 italic">N/A</span>;
  }

  if (fieldType === "attachment") {
    if (attachmentUrl) {
      return (
        <>
          <button
            onClick={() => setIsImageModalOpen(true)}
            className="text-blue-600 hover:underline font-bold cursor-pointer"
          >
            Ver Archivo
          </button>
          <ImagePreviewModal
            imageUrl={attachmentUrl}
            isOpen={isImageModalOpen}
            onClose={() => setIsImageModalOpen(false)}
          />
        </>
      );
    }
    return <span className="text-gray-400">Sin archivo</span>;
  }

  const renderEditInput = () => {
    switch (fieldType) {
      case "text":
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 border-2 border-blue-500 text-sm font-mono focus:outline-none"
          />
        );

      case "number":
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="number"
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 border-2 border-blue-500 text-sm font-mono focus:outline-none"
          />
        );

      case "boolean":
        return (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="checkbox"
              checked={localValue === "true"}
              onChange={(e) => {
                const newValue = e.target.checked ? "true" : "false";
                setLocalValue(newValue);
                onUpdate(responseId, newValue);
                setIsEditing(false);
              }}
              className="w-5 h-5 accent-green-500 cursor-pointer"
            />
            <span className="text-sm">{localValue === "true" ? "Si" : "No"}</span>
          </div>
        );

      case "date":
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="date"
            value={localValue ? new Date(localValue).toISOString().split("T")[0] : ""}
            onChange={(e) => {
              const dateValue = e.target.value ? new Date(e.target.value).toISOString() : "";
              handleChange(dateValue);
            }}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 border-2 border-blue-500 text-sm font-mono focus:outline-none"
          />
        );

      case "select": {
        const options = parseSelectOptions(displayStyle);
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={localValue}
            onChange={(e) => {
              setLocalValue(e.target.value);
              onUpdate(responseId, e.target.value || undefined);
              setIsEditing(false);
            }}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 border-2 border-blue-500 text-sm focus:outline-none"
          >
            <option value="">Seleccionar...</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      }

      case "userSelect": {
        const userOptions = users?.map((u) => ({
          value: u._id,
          label: u.fullName || u.email,
        })) ?? [];
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={localValue}
            onChange={(e) => {
              setLocalValue(e.target.value);
              onUpdate(responseId, e.target.value || undefined);
              setIsEditing(false);
            }}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 border-2 border-blue-500 text-sm focus:outline-none"
          >
            <option value="">Seleccionar usuario...</option>
            {userOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      }

      case "entitySelect": {
        const entityOptions = entities?.map((e) => ({
          value: e.value,
          label: e.label,
        })) ?? [];
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={localValue}
            onChange={(e) => {
              setLocalValue(e.target.value);
              onUpdate(responseId, e.target.value || undefined);
              setIsEditing(false);
            }}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 border-2 border-blue-500 text-sm focus:outline-none"
          >
            <option value="">Seleccionar...</option>
            {entityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      }

      default:
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 border-2 border-blue-500 text-sm focus:outline-none"
          />
        );
    }
  };

  const renderDisplayValue = () => {
    if (!value && !attachmentUrl) {
      return <span className="text-gray-400">—</span>;
    }

    switch (fieldType) {
      case "text":
      case "number":
        return <span className="font-mono">{value}</span>;

      case "boolean":
        return (
          <span
            className={`px-2 py-0.5 text-xs font-bold border-2 ${
              value === "true"
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-red-500 bg-red-50 text-red-700"
            }`}
          >
            {value === "true" ? "Si" : "No"}
          </span>
        );

      case "date":
        return (
          <span className="font-mono">
            {value ? new Date(value).toLocaleDateString("es-CL") : "—"}
          </span>
        );

      case "select": {
        const options = parseSelectOptions(displayStyle);
        const selectedOption = options.find((opt) => opt.value === value);
        return <span>{selectedOption?.label ?? value}</span>;
      }

      case "userSelect": {
        const user = users?.find((u) => u._id === value);
        return <span>{user?.fullName || user?.email || value}</span>;
      }

      case "entitySelect": {
        const entity = entities?.find((e) => e.value === value);
        return <span>{entity?.label || value}</span>;
      }

      default:
        return <span>{value ?? "—"}</span>;
    }
  };

  return (
    <div
      ref={containerRef}
      className="group relative flex items-center gap-2 min-h-[32px] -my-2 py-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isEditing ? (
        <div className="w-full">{renderEditInput()}</div>
      ) : (
        <>
          {renderDisplayValue()}
          {isEditable && (
            <button
              onClick={() => setIsEditing(true)}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-gray-300 group-hover:text-blue-600 transition-colors"
              title="Editar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
          )}
        </>
      )}
    </div>
  );
}
