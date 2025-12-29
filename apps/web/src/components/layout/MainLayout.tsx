"use client";

import { useState } from "react";
import type { MainView } from "@/types";
import { Sidebar } from "./Sidebar";
import { GridView } from "@/components/grid-view/GridView";
import { FormBuilder } from "@/components/form-builder/FormBuilder";
import { DebugView } from "@/components/debug/DebugView";
import { DataVisualization } from "@/components/data-visualization/DataVisualization";

export function MainLayout() {
  const [activeView, setActiveView] = useState<MainView>("gridView");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex gap-4 p-4 bg-gray-100">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="flex-1 overflow-hidden bg-white border-2 border-black">
        {activeView === "gridView" && <GridView />}
        {activeView === "formBuilder" && <FormBuilder />}
        {activeView === "dataVisualization" && <DataVisualization />}
        {activeView === "debug" && <DebugView />}
      </main>
    </div>
  );
}
