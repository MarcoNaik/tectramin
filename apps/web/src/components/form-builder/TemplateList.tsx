"use client";

import type { Id } from "@packages/backend/convex/_generated/dataModel";

interface TaskTemplate {
  _id: Id<"taskTemplates">;
  name: string;
  category?: string;
}

interface TemplateListProps {
  templates: TaskTemplate[] | undefined;
  selectedTemplateId: Id<"taskTemplates"> | null;
  onSelectTemplate: (id: Id<"taskTemplates">) => void;
}

export function TemplateList({
  templates,
  selectedTemplateId,
  onSelectTemplate,
}: TemplateListProps) {
  return (
    <div className="w-64 flex-shrink-0 border-2 border-black overflow-hidden flex flex-col bg-white">
      <div className="p-3 bg-gray-50 border-b-2 border-black font-bold text-gray-900">
        Task Templates ({templates?.length ?? 0})
      </div>
      <div className="overflow-y-auto flex-1">
        {templates?.map((t) => (
          <div
            key={t._id}
            onClick={() => onSelectTemplate(t._id)}
            className={`p-3 border-b-2 border-black cursor-pointer transition-colors ${
              selectedTemplateId === t._id
                ? "bg-blue-500 text-white"
                : "hover:bg-gray-50"
            }`}
          >
            <div className={`font-bold text-base ${selectedTemplateId === t._id ? "text-white" : "text-gray-900"}`}>
              {t.name}
            </div>
            <div className={`text-xs mt-0.5 ${selectedTemplateId === t._id ? "text-blue-100" : "text-gray-500"}`}>
              {t.category || "Uncategorized"}
            </div>
          </div>
        ))}
        {templates?.length === 0 && (
          <div className="p-4 text-gray-500 text-sm text-center">
            No templates yet. Create one in Debug View.
          </div>
        )}
      </div>
    </div>
  );
}
