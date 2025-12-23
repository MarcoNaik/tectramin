"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";

export function FaenasTab() {
  const customers = useQuery(api.admin.customers.list);
  const allFaenas = useQuery(api.admin.faenas.list);
  const createFaena = useMutation(api.admin.faenas.create);
  const removeFaena = useMutation(api.admin.faenas.remove);
  const [selectedCustomerId, setSelectedCustomerId] = useState<Id<"customers"> | "">("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  const handleCreate = async () => {
    if (!name.trim() || selectedCustomerId === "") return;
    await createFaena({ customerId: selectedCustomerId, name, location: location || undefined });
    setName("");
    setLocation("");
  };

  const getCustomerName = (customerId: Id<"customers">) => {
    return customers?.find((c) => c._id === customerId)?.name ?? "Unknown";
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Faenas ({allFaenas?.length ?? 0})</h3>
      <div className="flex gap-2">
        <select
          value={selectedCustomerId}
          onChange={(e) => setSelectedCustomerId(e.target.value as Id<"customers"> | "")}
          className="border-2 border-black px-3 py-2"
        >
          <option value="">Select customer...</option>
          {customers?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Faena Name *" className="border-2 border-black px-3 py-2 flex-1" />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="border-2 border-black px-3 py-2 flex-1" />
        <button onClick={handleCreate} className="bg-blue-500 text-white px-4 py-2 font-bold border-2 border-black hover:bg-blue-600" disabled={!selectedCustomerId}>Add</button>
      </div>
      <div className="space-y-2">
        {allFaenas?.map((f) => (
          <div key={f._id} className="flex items-center justify-between p-3 bg-gray-50 border-2 border-black">
            <div>
              <span className="font-bold">{f.name}</span>
              <span className="text-gray-500 ml-2">@ {getCustomerName(f.customerId)}</span>
              {f.location && <span className="text-gray-400 ml-2">({f.location})</span>}
              <span className={`ml-2 text-xs px-2 py-0.5 border-2 border-black ${f.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {f.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <button onClick={() => removeFaena({ id: f._id })} className="text-red-500 text-sm font-bold hover:text-red-700">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
