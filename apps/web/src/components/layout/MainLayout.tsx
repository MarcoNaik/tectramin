"use client";

import { useState } from "react";
import type { MainView } from "@/types";
import { Sidebar } from "./Sidebar";
import { GridView } from "@/components/grid-view/GridView";
import { FormBuilder } from "@/components/form-builder/FormBuilder";
import { DebugView } from "@/components/debug/DebugView";

export function MainLayout() {
  const [activeView, setActiveView] = useState<MainView>("gridView");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex bg-gray-100">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="flex-1 overflow-hidden">
        {activeView === "gridView" && <GridView />}
        {activeView === "formBuilder" && (
          <div className="h-full p-4">
            <h2 className="text-2xl font-bold mb-4">Form Builder</h2>
            <div className="bg-white border-2 border-black h-[calc(100%-60px)]">
              <FormBuilder />
            </div>
          </div>
        )}
        {activeView === "debug" && <DebugView />}
      </main>
    </div>
  );
}
