"use client";

import { useEffect } from "react";

interface ImagePreviewModalProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImagePreviewModal({
  imageUrl,
  isOpen,
  onClose,
}: ImagePreviewModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white text-2xl font-bold hover:text-gray-300"
        >
          ✕
        </button>
        <img
          src={imageUrl}
          alt="Attachment preview"
          className="max-w-[90vw] max-h-[90vh] object-contain"
        />
      </div>
    </div>
  );
}
