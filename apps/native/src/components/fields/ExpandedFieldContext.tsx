import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ExpandedFieldContextType {
  expandedFieldId: string | null;
  setExpandedFieldId: (id: string | null) => void;
}

const ExpandedFieldContext = createContext<ExpandedFieldContextType | null>(null);

interface ExpandedFieldProviderProps {
  children: ReactNode;
}

export function ExpandedFieldProvider({ children }: ExpandedFieldProviderProps) {
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);

  return (
    <ExpandedFieldContext.Provider value={{ expandedFieldId, setExpandedFieldId }}>
      {children}
    </ExpandedFieldContext.Provider>
  );
}

export function useExpandedField(fieldId: string) {
  const context = useContext(ExpandedFieldContext);
  if (!context) {
    throw new Error("useExpandedField must be used within ExpandedFieldProvider");
  }

  const { expandedFieldId, setExpandedFieldId } = context;
  const isExpanded = expandedFieldId === fieldId;

  const expand = useCallback(() => {
    setExpandedFieldId(fieldId);
  }, [fieldId, setExpandedFieldId]);

  const collapse = useCallback(() => {
    if (expandedFieldId === fieldId) {
      setExpandedFieldId(null);
    }
  }, [fieldId, expandedFieldId, setExpandedFieldId]);

  const toggle = useCallback(() => {
    setExpandedFieldId(isExpanded ? null : fieldId);
  }, [fieldId, isExpanded, setExpandedFieldId]);

  return { isExpanded, expand, collapse, toggle };
}

export function useCollapseAll() {
  const context = useContext(ExpandedFieldContext);
  if (!context) {
    throw new Error("useCollapseAll must be used within ExpandedFieldProvider");
  }

  return useCallback(() => {
    context.setExpandedFieldId(null);
  }, [context]);
}
