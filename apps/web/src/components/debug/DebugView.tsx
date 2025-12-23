"use client";

import { useState } from "react";
import type { DebugTab } from "@/types";
import { CustomersTab } from "./CustomersTab";
import { FaenasTab } from "./FaenasTab";
import { TaskTemplatesTab } from "./TaskTemplatesTab";
import { ServicesTab } from "./ServicesTab";
import { WorkOrdersTab } from "./WorkOrdersTab";
import { UsersTab } from "./UsersTab";

function TabButton({
  tab,
  active,
  onClick,
  children,
}: {
  tab: DebugTab;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-bold border-2 border-black transition-colors ${
        active
          ? "bg-black text-white"
          : "bg-white text-black hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

export function DebugView() {
  const [activeTab, setActiveTab] = useState<DebugTab>("customers");

  return (
    <div className="h-full flex flex-col p-4">
      <h2 className="text-2xl font-bold mb-4">Debug Dashboard</h2>
      <div className="flex gap-0 border-2 border-black w-fit mb-4">
        <TabButton
          tab="customers"
          active={activeTab === "customers"}
          onClick={() => setActiveTab("customers")}
        >
          Customers
        </TabButton>
        <TabButton
          tab="faenas"
          active={activeTab === "faenas"}
          onClick={() => setActiveTab("faenas")}
        >
          Faenas
        </TabButton>
        <TabButton
          tab="taskTemplates"
          active={activeTab === "taskTemplates"}
          onClick={() => setActiveTab("taskTemplates")}
        >
          Task Templates
        </TabButton>
        <TabButton
          tab="services"
          active={activeTab === "services"}
          onClick={() => setActiveTab("services")}
        >
          Services
        </TabButton>
        <TabButton
          tab="workOrders"
          active={activeTab === "workOrders"}
          onClick={() => setActiveTab("workOrders")}
        >
          Work Orders
        </TabButton>
        <TabButton
          tab="users"
          active={activeTab === "users"}
          onClick={() => setActiveTab("users")}
        >
          Users
        </TabButton>
      </div>
      <div className="bg-white p-4 border-2 border-black flex-1 overflow-auto">
        {activeTab === "customers" && <CustomersTab />}
        {activeTab === "faenas" && <FaenasTab />}
        {activeTab === "taskTemplates" && <TaskTemplatesTab />}
        {activeTab === "services" && <ServicesTab />}
        {activeTab === "workOrders" && <WorkOrdersTab />}
        {activeTab === "users" && <UsersTab />}
      </div>
    </div>
  );
}
