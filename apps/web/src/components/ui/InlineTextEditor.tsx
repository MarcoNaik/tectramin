"use client";

import { useState, useRef, useEffect } from "react";

interface InlineTextEditorProps {
  value: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
  className?: string;
}

export function InlineTextEditor({
  value,
  onSave,
  onCancel,
  placeholder,
  className,
}: InlineTextEditorProps) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSave(editValue);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={() => onSave(editValue)}
      onKeyDown={handleKeyDown}
      className={`border-2 border-blue-500 rounded px-2 py-1 text-sm outline-none ${className || ""}`}
      placeholder={placeholder}
    />
  );
}
