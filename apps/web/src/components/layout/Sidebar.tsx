"use client";

import type { MainView } from "@/types";
import { UserButton, useUser } from "@clerk/nextjs";

interface SidebarProps {
  activeView: MainView;
  onViewChange: (view: MainView) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function FormIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="7" y1="8" x2="17" y2="8" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="7" y1="16" x2="12" y2="16" />
    </svg>
  );
}

function DebugIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function CollapseIcon({ className, collapsed }: { className?: string; collapsed: boolean }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {collapsed ? (
        <polyline points="9 18 15 12 9 6" />
      ) : (
        <polyline points="15 18 9 12 15 6" />
      )}
    </svg>
  );
}

export function Sidebar({ activeView, onViewChange, isCollapsed, onToggleCollapse }: SidebarProps) {
  const { user } = useUser();

  const navItems: Array<{ view: MainView; label: string; icon: React.ReactNode }> = [
    { view: "gridView", label: "Vista de Grilla", icon: <GridIcon /> },
    { view: "formBuilder", label: "Constructor de Formularios", icon: <FormIcon /> },
    { view: "debug", label: "Depuración", icon: <DebugIcon /> },
  ];

  return (
    <div
      className={`h-full bg-white border-2 border-black flex flex-col transition-all duration-200 ${
        isCollapsed ? "w-16" : "w-48"
      }`}
    >
      <div className="p-4 border-b-2 border-black flex items-center justify-between">
        {isCollapsed ? (
          <button
            onClick={onToggleCollapse}
            className="w-full flex justify-center hover:bg-gray-100 transition-colors rounded p-1"
            title="Expandir barra lateral"
          >
            <CollapseIcon collapsed={isCollapsed} />
          </button>
        ) : (
          <>
            <span className="font-bold text-xl">Tectramin</span>
            <button
              onClick={onToggleCollapse}
              className="p-1 hover:bg-gray-100 transition-colors rounded"
              title="Contraer barra lateral"
            >
              <CollapseIcon collapsed={isCollapsed} />
            </button>
          </>
        )}
      </div>

      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const isActive = activeView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onViewChange(item.view)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                isActive
                  ? "bg-blue-500 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <span className={isActive ? "text-white" : "text-gray-600"}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="font-bold text-sm">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t-2 border-black p-3">
        <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
          <UserButton afterSignOutUrl="/" />
          {!isCollapsed && user && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{user.fullName || user.firstName}</div>
              <div className="text-xs text-gray-500 truncate">{user.primaryEmailAddress?.emailAddress}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
