"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

export function LookupEntitiesTab() {
  const entityTypes = useQuery(api.admin.lookupEntityTypes.list);
  const createEntityType = useMutation(api.admin.lookupEntityTypes.create);
  const updateEntityType = useMutation(api.admin.lookupEntityTypes.update);
  const removeEntityType = useMutation(api.admin.lookupEntityTypes.remove);
  const createEntity = useMutation(api.admin.lookupEntities.create);
  const updateEntity = useMutation(api.admin.lookupEntities.update);
  const removeEntity = useMutation(api.admin.lookupEntities.remove);

  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDescription, setNewTypeDescription] = useState("");
  const [newTypeParent, setNewTypeParent] = useState<Id<"lookupEntityTypes"> | "">("");
  const [expandedType, setExpandedType] = useState<Id<"lookupEntityTypes"> | null>(null);
  const [newEntityLabel, setNewEntityLabel] = useState("");
  const [newEntityValue, setNewEntityValue] = useState("");
  const [newEntityParent, setNewEntityParent] = useState<Id<"lookupEntities"> | "">("");

  const entities = useQuery(
    api.admin.lookupEntities.listByType,
    expandedType ? { entityTypeId: expandedType } : "skip"
  );

  const expandedTypeData = entityTypes?.find((t) => t._id === expandedType);
  const parentEntities = useQuery(
    api.admin.lookupEntities.listByType,
    expandedTypeData?.parentEntityTypeId
      ? { entityTypeId: expandedTypeData.parentEntityTypeId }
      : "skip"
  );

  const rootEntityTypes = entityTypes?.filter((t) => !t.parentEntityTypeId) ?? [];

  const handleCreateType = async () => {
    if (!newTypeName.trim()) return;
    await createEntityType({
      name: newTypeName,
      description: newTypeDescription || undefined,
      parentEntityTypeId: newTypeParent || undefined,
    });
    setNewTypeName("");
    setNewTypeDescription("");
    setNewTypeParent("");
  };

  const handleCreateEntity = async () => {
    if (!newEntityLabel.trim() || !expandedType) return;
    const value = newEntityValue.trim() || newEntityLabel.trim().toLowerCase().replace(/\s+/g, "_");
    await createEntity({
      entityTypeId: expandedType,
      label: newEntityLabel,
      value,
      parentEntityId: newEntityParent || undefined,
    });
    setNewEntityLabel("");
    setNewEntityValue("");
    setNewEntityParent("");
  };

  const handleToggleActive = async (typeId: Id<"lookupEntityTypes">, isActive: boolean) => {
    await updateEntityType({ id: typeId, isActive: !isActive });
  };

  const handleToggleEntityActive = async (entityId: Id<"lookupEntities">, isActive: boolean) => {
    await updateEntity({ id: entityId, isActive: !isActive });
  };

  const getChildTypes = (parentId: Id<"lookupEntityTypes">) => {
    return entityTypes?.filter((t) => t.parentEntityTypeId === parentId) ?? [];
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Tipos de Entidad ({entityTypes?.length ?? 0})</h3>
        <div className="flex gap-2 flex-wrap">
          <input
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            placeholder="Nombre del Tipo *"
            className="border-2 border-black px-3 py-2 flex-1 min-w-[200px]"
          />
          <input
            value={newTypeDescription}
            onChange={(e) => setNewTypeDescription(e.target.value)}
            placeholder="Descripcion (opcional)"
            className="border-2 border-black px-3 py-2 flex-1 min-w-[200px]"
          />
          <select
            value={newTypeParent}
            onChange={(e) => setNewTypeParent(e.target.value as Id<"lookupEntityTypes"> | "")}
            className="border-2 border-black px-3 py-2 min-w-[200px]"
          >
            <option value="">Sin tipo padre (raiz)</option>
            {rootEntityTypes.map((t) => (
              <option key={t._id} value={t._id}>
                Hijo de: {t.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreateType}
            className="bg-blue-500 text-white px-4 py-2 font-bold border-2 border-black hover:bg-blue-600"
          >
            Agregar Tipo
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {rootEntityTypes.map((rootType) => (
          <div key={rootType._id} className="space-y-2">
            <EntityTypeCard
              type={rootType}
              isExpanded={expandedType === rootType._id}
              onToggleExpand={() => setExpandedType(expandedType === rootType._id ? null : rootType._id)}
              onToggleActive={() => handleToggleActive(rootType._id, rootType.isActive)}
              onRemove={() => removeEntityType({ id: rootType._id })}
              entities={expandedType === rootType._id ? entities : undefined}
              parentEntities={undefined}
              onCreateEntity={handleCreateEntity}
              onToggleEntityActive={handleToggleEntityActive}
              onRemoveEntity={(id) => removeEntity({ id })}
              newEntityLabel={newEntityLabel}
              setNewEntityLabel={setNewEntityLabel}
              newEntityValue={newEntityValue}
              setNewEntityValue={setNewEntityValue}
              newEntityParent={newEntityParent}
              setNewEntityParent={setNewEntityParent}
              isChildType={false}
            />

            {getChildTypes(rootType._id).map((childType) => (
              <div key={childType._id} className="ml-8">
                <EntityTypeCard
                  type={childType}
                  isExpanded={expandedType === childType._id}
                  onToggleExpand={() => setExpandedType(expandedType === childType._id ? null : childType._id)}
                  onToggleActive={() => handleToggleActive(childType._id, childType.isActive)}
                  onRemove={() => removeEntityType({ id: childType._id })}
                  entities={expandedType === childType._id ? entities : undefined}
                  parentEntities={expandedType === childType._id ? parentEntities : undefined}
                  onCreateEntity={handleCreateEntity}
                  onToggleEntityActive={handleToggleEntityActive}
                  onRemoveEntity={(id) => removeEntity({ id })}
                  newEntityLabel={newEntityLabel}
                  setNewEntityLabel={setNewEntityLabel}
                  newEntityValue={newEntityValue}
                  setNewEntityValue={setNewEntityValue}
                  newEntityParent={newEntityParent}
                  setNewEntityParent={setNewEntityParent}
                  isChildType={true}
                  parentTypeName={rootType.name}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface EntityTypeCardProps {
  type: {
    _id: Id<"lookupEntityTypes">;
    name: string;
    description?: string;
    isActive: boolean;
  };
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: () => void;
  onRemove: () => void;
  entities?: Array<{
    _id: Id<"lookupEntities">;
    label: string;
    value: string;
    parentEntityId?: Id<"lookupEntities">;
    isActive: boolean;
    displayOrder: number;
  }>;
  parentEntities?: Array<{
    _id: Id<"lookupEntities">;
    label: string;
  }>;
  onCreateEntity: () => void;
  onToggleEntityActive: (id: Id<"lookupEntities">, isActive: boolean) => void;
  onRemoveEntity: (id: Id<"lookupEntities">) => void;
  newEntityLabel: string;
  setNewEntityLabel: (v: string) => void;
  newEntityValue: string;
  setNewEntityValue: (v: string) => void;
  newEntityParent: Id<"lookupEntities"> | "";
  setNewEntityParent: (v: Id<"lookupEntities"> | "") => void;
  isChildType: boolean;
  parentTypeName?: string;
}

function EntityTypeCard({
  type,
  isExpanded,
  onToggleExpand,
  onToggleActive,
  onRemove,
  entities,
  parentEntities,
  onCreateEntity,
  onToggleEntityActive,
  onRemoveEntity,
  newEntityLabel,
  setNewEntityLabel,
  newEntityValue,
  setNewEntityValue,
  newEntityParent,
  setNewEntityParent,
  isChildType,
  parentTypeName,
}: EntityTypeCardProps) {
  const getParentLabel = (parentId: Id<"lookupEntities"> | undefined) => {
    if (!parentId || !parentEntities) return null;
    const parent = parentEntities.find((p) => p._id === parentId);
    return parent?.label;
  };

  return (
    <div className="border-2 border-black overflow-hidden">
      <div
        className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2">
          {isChildType && (
            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 border border-purple-300">
              ↳ {parentTypeName}
            </span>
          )}
          <span className="font-bold">{type.name}</span>
          {type.description && (
            <span className="text-gray-500 text-sm">- {type.description}</span>
          )}
          <span
            className={`text-xs px-2 py-0.5 border ${
              type.isActive
                ? "bg-green-100 text-green-700 border-green-300"
                : "bg-gray-100 text-gray-500 border-gray-300"
            }`}
          >
            {type.isActive ? "Activo" : "Inactivo"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-bold">{isExpanded ? "▼" : "▶"}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive();
            }}
            className="text-blue-500 text-sm font-bold hover:text-blue-700"
          >
            {type.isActive ? "Desactivar" : "Activar"}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-red-500 text-sm font-bold hover:text-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>

      {isExpanded && entities && (
        <div className="p-3 bg-white border-t-2 border-black space-y-3">
          <div className="text-sm font-bold text-gray-700">
            Entidades ({entities.length}):
          </div>

          {entities.length === 0 ? (
            <div className="text-gray-500 text-sm">Sin entidades aun</div>
          ) : (
            <div className="space-y-1">
              {entities.map((entity) => (
                <div
                  key={entity._id}
                  className="flex items-center justify-between p-2 bg-gray-100 border-2 border-black text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{entity.label}</span>
                    <span className="text-gray-400 text-xs">({entity.value})</span>
                    {isChildType && entity.parentEntityId && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-300">
                        → {getParentLabel(entity.parentEntityId)}
                      </span>
                    )}
                    <span
                      className={`text-xs px-1 py-0.5 ${
                        entity.isActive ? "text-green-600" : "text-gray-400"
                      }`}
                    >
                      {entity.isActive ? "●" : "○"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleEntityActive(entity._id, entity.isActive)}
                      className="text-blue-500 text-xs font-bold hover:text-blue-700"
                    >
                      {entity.isActive ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      onClick={() => onRemoveEntity(entity._id)}
                      className="text-red-500 font-bold"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-center flex-wrap">
            <input
              value={newEntityLabel}
              onChange={(e) => setNewEntityLabel(e.target.value)}
              placeholder="Etiqueta *"
              className="border-2 border-black px-2 py-1 flex-1 text-sm min-w-[150px]"
            />
            <input
              value={newEntityValue}
              onChange={(e) => setNewEntityValue(e.target.value)}
              placeholder="Valor (auto)"
              className="border-2 border-black px-2 py-1 w-32 text-sm"
            />
            {isChildType && parentEntities && parentEntities.length > 0 && (
              <select
                value={newEntityParent}
                onChange={(e) => setNewEntityParent(e.target.value as Id<"lookupEntities"> | "")}
                className="border-2 border-black px-2 py-1 text-sm min-w-[150px]"
              >
                <option value="">Seleccionar padre *</option>
                {parentEntities.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={onCreateEntity}
              className="bg-green-500 text-white px-3 py-1 text-sm font-bold border-2 border-black hover:bg-green-600"
              disabled={!newEntityLabel.trim() || (isChildType && !newEntityParent)}
            >
              Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
