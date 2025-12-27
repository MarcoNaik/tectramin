"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";

export function CustomersTab() {
  const customers = useQuery(api.admin.customers.list);
  const createCustomer = useMutation(api.admin.customers.create);
  const removeCustomer = useMutation(api.admin.customers.remove);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createCustomer({ name, email: email || undefined });
    setName("");
    setEmail("");
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Clientes ({customers?.length ?? 0})</h3>
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre *" className="border-2 border-black px-3 py-2 flex-1" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" className="border-2 border-black px-3 py-2 flex-1" />
        <button onClick={handleCreate} className="bg-blue-500 text-white px-4 py-2 font-bold border-2 border-black hover:bg-blue-600">Agregar</button>
      </div>
      <div className="space-y-2">
        {customers?.map((c) => (
          <div key={c._id} className="flex items-center justify-between p-3 bg-gray-50 border-2 border-black">
            <div>
              <span className="font-bold">{c.name}</span>
              {c.email && <span className="text-gray-500 ml-2">({c.email})</span>}
              <span className="text-xs text-gray-400 ml-2">{c._id}</span>
            </div>
            <button onClick={() => removeCustomer({ id: c._id })} className="text-red-500 text-sm font-bold hover:text-red-700">Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  );
}
