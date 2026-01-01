"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { ImagePreviewModal } from "./ImagePreviewModal";
import type { FilterState } from "./FilterBar";

interface ImageGalleryProps {
  filters: FilterState;
  dateRange: { startDate?: number; endDate?: number };
}

interface ImageItem {
  responseId: Id<"fieldResponses">;
  attachmentUrl: string;
  faenaName: string;
  workOrderName: string;
  dayDate: number;
  dayNumber: number;
  taskTemplateName: string;
  userName: string;
  fieldLabel: string;
  responseUpdatedAt: number;
}

export function ImageGallery({ filters, dateRange }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const data = useQuery(api.admin.dataVisualization.listAllResponses, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    faenaId: filters.faenaId ?? undefined,
    userId: filters.userId ?? undefined,
    workOrderId: filters.workOrderId ?? undefined,
    taskTemplateId: filters.taskTemplateId ?? undefined,
    status: filters.status ?? undefined,
  });

  const images = useMemo((): ImageItem[] => {
    if (!data) return [];

    return data
      .filter((r) => r.fieldType === "attachment" && r.attachmentUrl)
      .filter((r) => {
        const term = searchTerm.toLowerCase();
        return (
          r.faenaName.toLowerCase().includes(term) ||
          r.workOrderName.toLowerCase().includes(term) ||
          r.taskTemplateName.toLowerCase().includes(term) ||
          r.userName.toLowerCase().includes(term) ||
          r.fieldLabel.toLowerCase().includes(term)
        );
      })
      .map((r) => ({
        responseId: r.responseId,
        attachmentUrl: r.attachmentUrl!,
        faenaName: r.faenaName,
        workOrderName: r.workOrderName,
        dayDate: r.dayDate,
        dayNumber: r.dayNumber,
        taskTemplateName: r.taskTemplateName,
        userName: r.userName,
        fieldLabel: r.fieldLabel,
        responseUpdatedAt: r.responseUpdatedAt,
      }));
  }, [data, searchTerm]);

  if (!data) {
    return <div className="text-gray-500 p-4">Cargando...</div>;
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("es-CL");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <input
          type="text"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-2 border-black px-3 py-2 w-64"
        />
        <span className="text-sm text-gray-500">{images.length} imagenes</span>
      </div>

      {images.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No se encontraron imagenes con los filtros seleccionados
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.responseId}
              className="border-2 border-black bg-white overflow-hidden hover:shadow-lg transition-shadow"
            >
              <button
                onClick={() => setSelectedImage(image.attachmentUrl)}
                className="relative w-full aspect-square overflow-hidden bg-gray-100 cursor-pointer"
              >
                <Image
                  src={image.attachmentUrl}
                  alt={image.fieldLabel}
                  fill
                  unoptimized
                  className="object-cover hover:scale-105 transition-transform"
                />
              </button>
              <div className="p-3 space-y-1 text-sm border-t-2 border-black">
                <div className="font-bold text-base truncate">
                  {image.taskTemplateName}
                </div>
                <div className="text-gray-600 truncate">{image.fieldLabel}</div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{image.userName}</span>
                  <span>
                    {formatDate(image.dayDate)} D{image.dayNumber}
                  </span>
                </div>
                <div className="text-xs text-gray-400 truncate">
                  {image.faenaName} / {image.workOrderName}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ImagePreviewModal
        imageUrl={selectedImage ?? ""}
        isOpen={selectedImage !== null}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
