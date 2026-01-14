"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Id } from "@packages/backend/convex/_generated/dataModel";

type User = {
  _id: Id<"users">;
  _creationTime: number;
  clerkId: string;
  email: string;
  fullName?: string;
  role: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  rut?: string;
  talanaId?: number;
};

function UserCard({
  user,
  variant,
  onLink,
  onUpdateRole,
  linkOptions,
}: {
  user: User;
  variant: "talana" | "clerk" | "linked" | "test";
  onLink?: (targetId: Id<"users">) => void;
  onUpdateRole?: (role: string) => void;
  linkOptions?: User[];
}) {
  const [showLinkDropdown, setShowLinkDropdown] = useState(false);

  const borderColor = {
    talana: "border-purple-400",
    clerk: "border-blue-400",
    linked: "border-green-400",
    test: "border-gray-400",
  }[variant];

  const bgColor = {
    talana: "bg-purple-50",
    clerk: "bg-blue-50",
    linked: "bg-green-50",
    test: "bg-gray-50",
  }[variant];

  const badgeConfig = {
    talana: { text: "Pendiente", bg: "bg-purple-100", border: "border-purple-500", textColor: "text-purple-700" },
    clerk: { text: "Solo Clerk", bg: "bg-blue-100", border: "border-blue-500", textColor: "text-blue-700" },
    linked: { text: "Vinculado", bg: "bg-green-100", border: "border-green-500", textColor: "text-green-700" },
    test: { text: "Test", bg: "bg-gray-100", border: "border-gray-500", textColor: "text-gray-700" },
  }[variant];

  return (
    <div className={`p-3 border-2 ${borderColor} ${bgColor} space-y-2`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{user.fullName ?? user.email}</div>
          <div className="text-sm text-gray-500 truncate">{user.email}</div>
          {user.rut && <div className="text-xs text-gray-400">RUT: {user.rut}</div>}
        </div>
        <span className={`text-xs px-2 py-0.5 border ${badgeConfig.bg} ${badgeConfig.border} ${badgeConfig.textColor}`}>
          {badgeConfig.text}
        </span>
      </div>

      {variant === "linked" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Rol:</span>
          <select
            value={user.role}
            onChange={(e) => onUpdateRole?.(e.target.value)}
            className="border border-gray-300 px-2 py-1 text-xs flex-1"
          >
            <option value="field_worker">Trabajador de Campo</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
      )}

      {(variant === "talana" || variant === "clerk") && linkOptions && linkOptions.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowLinkDropdown(!showLinkDropdown)}
            className="w-full text-xs bg-white border border-gray-300 px-2 py-1 hover:bg-gray-50"
          >
            {variant === "talana" ? "Vincular con Clerk..." : "Asignar a Talana..."}
          </button>
          {showLinkDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 shadow-lg max-h-40 overflow-y-auto">
              {linkOptions.map((option) => (
                <button
                  key={option._id}
                  onClick={() => {
                    onLink?.(option._id);
                    setShowLinkDropdown(false);
                  }}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium truncate">{option.fullName ?? option.email}</div>
                  <div className="text-gray-400 truncate">{option.email}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function UsersTab() {
  const { user } = useUser();
  const users = useQuery(api.shared.users.list);
  const talanaUsers = useQuery(api.admin.userLinking.getTalanaUsers);
  const clerkOnlyUsers = useQuery(api.admin.userLinking.getClerkOnlyUsers);
  const linkedUsers = useQuery(api.admin.userLinking.getLinkedUsers);
  const upsertFromClerk = useMutation(api.shared.users.upsertFromClerk);
  const updateRole = useMutation(api.shared.users.updateRole);
  const triggerTalanaSync = useMutation(api.talana.triggerSync);
  const triggerClerkSync = useMutation(api.clerk.triggerSyncAllFromClerk);
  const linkTalanaToClerk = useMutation(api.admin.userLinking.linkTalanaToClerk);

  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [talanaSyncStatus, setTalanaSyncStatus] = useState<"idle" | "syncing" | "triggered">("idle");
  const [clerkSyncStatus, setClerkSyncStatus] = useState<"idle" | "syncing" | "triggered">("idle");
  const [testName, setTestName] = useState("");
  const [testEmail, setTestEmail] = useState("");

  const handleSyncCurrentUser = async () => {
    if (!user) return;
    setSyncStatus("syncing");
    try {
      await upsertFromClerk({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "",
        fullName: user.fullName ?? undefined,
      });
      setSyncStatus("success");
    } catch (e) {
      console.error("Sync error:", e);
      setSyncStatus("error");
    }
  };

  const handleCreateTestUser = async () => {
    if (!testEmail.trim()) return;
    const fakeClerkId = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await upsertFromClerk({
      clerkId: fakeClerkId,
      email: testEmail,
      fullName: testName || undefined,
    });
    setTestName("");
    setTestEmail("");
  };

  const handleTalanaSync = async () => {
    setTalanaSyncStatus("syncing");
    try {
      await triggerTalanaSync({});
      setTalanaSyncStatus("triggered");
    } catch (e) {
      console.error("Talana sync error:", e);
      setTalanaSyncStatus("idle");
    }
  };

  const handleClerkSync = async () => {
    setClerkSyncStatus("syncing");
    try {
      await triggerClerkSync({});
      setClerkSyncStatus("triggered");
    } catch (e) {
      console.error("Clerk sync error:", e);
      setClerkSyncStatus("idle");
    }
  };

  const handleLinkTalanaToClerk = async (talanaUserId: Id<"users">, clerkUserId: Id<"users">) => {
    const clerkUser = clerkOnlyUsers?.find((u) => u._id === clerkUserId);
    if (!clerkUser) return;

    await linkTalanaToClerk({
      talanaUserId,
      clerkId: clerkUser.clerkId,
      email: clerkUser.email,
      fullName: clerkUser.fullName,
    });
  };

  const handleLinkClerkToTalana = async (clerkUserId: Id<"users">, talanaUserId: Id<"users">) => {
    const talanaUser = talanaUsers?.find((u) => u._id === talanaUserId);
    const clerkUser = clerkOnlyUsers?.find((u) => u._id === clerkUserId);
    if (!talanaUser || !clerkUser) return;

    await linkTalanaToClerk({
      talanaUserId: talanaUser._id,
      clerkId: clerkUser.clerkId,
      email: clerkUser.email,
      fullName: clerkUser.fullName,
    });
  };

  const alreadySynced = users?.some((u) => u.clerkId === user?.id);
  const testUsers = users?.filter((u) => u.clerkId.startsWith("test_")) ?? [];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Gestión de Usuarios ({users?.length ?? 0})</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3 bg-yellow-50 border-2 border-yellow-300">
          <div className="text-sm font-bold text-yellow-800 mb-2">Tu ID de Clerk: {user?.id}</div>
          {alreadySynced ? (
            <div className="text-green-600 text-sm font-bold">Ya estás sincronizado con la base de datos</div>
          ) : (
            <button
              onClick={handleSyncCurrentUser}
              disabled={syncStatus === "syncing"}
              className="bg-blue-500 text-white px-4 py-2 text-sm font-bold border-2 border-black disabled:opacity-50 hover:bg-blue-600"
            >
              {syncStatus === "syncing" ? "Sincronizando..." : "Sincronizar Usuario Actual"}
            </button>
          )}
          {syncStatus === "success" && <div className="text-green-600 text-sm mt-2 font-bold">¡Sincronizado exitosamente!</div>}
          {syncStatus === "error" && <div className="text-red-600 text-sm mt-2 font-bold">Error de sincronización</div>}
        </div>

        <div className="p-3 bg-purple-50 border-2 border-purple-300">
          <div className="text-sm font-bold text-purple-800 mb-2">Integración Talana</div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTalanaSync}
              disabled={talanaSyncStatus === "syncing"}
              className="bg-purple-500 text-white px-4 py-2 text-sm font-bold border-2 border-black disabled:opacity-50 hover:bg-purple-600"
            >
              {talanaSyncStatus === "syncing" ? "Sincronizando..." : "Sincronizar Talana"}
            </button>
            {talanaSyncStatus === "triggered" && (
              <span className="text-purple-600 text-sm font-bold">Sincronización iniciada</span>
            )}
          </div>
        </div>

        <div className="p-3 bg-blue-50 border-2 border-blue-300">
          <div className="text-sm font-bold text-blue-800 mb-2">Sincronizar Clerk</div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClerkSync}
              disabled={clerkSyncStatus === "syncing"}
              className="bg-blue-500 text-white px-4 py-2 text-sm font-bold border-2 border-black disabled:opacity-50 hover:bg-blue-600"
            >
              {clerkSyncStatus === "syncing" ? "Sincronizando..." : "Sincronizar Todos"}
            </button>
            {clerkSyncStatus === "triggered" && (
              <span className="text-blue-600 text-sm font-bold">Sincronización iniciada</span>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 bg-blue-50 border-2 border-blue-300">
        <div className="text-sm font-bold text-blue-800 mb-2">Crear Usuario de Prueba</div>
        <div className="flex gap-2">
          <input
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="Nombre"
            className="border-2 border-black px-3 py-2 flex-1 text-sm"
          />
          <input
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Correo *"
            className="border-2 border-black px-3 py-2 flex-1 text-sm"
          />
          <button
            onClick={handleCreateTestUser}
            disabled={!testEmail.trim()}
            className="bg-blue-500 text-white px-4 py-2 text-sm font-bold border-2 border-black disabled:opacity-50 hover:bg-blue-600"
          >
            Agregar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="border-2 border-purple-300 p-3">
          <h4 className="font-bold text-purple-800 mb-3 flex items-center justify-between">
            <span>Talana (Pendientes)</span>
            <span className="text-sm font-normal bg-purple-100 px-2 py-0.5">{talanaUsers?.length ?? 0}</span>
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {talanaUsers?.map((u) => (
              <UserCard
                key={u._id}
                user={u}
                variant="talana"
                linkOptions={clerkOnlyUsers}
                onLink={(targetId) => handleLinkTalanaToClerk(u._id, targetId)}
              />
            ))}
            {talanaUsers?.length === 0 && (
              <div className="text-sm text-gray-500 italic">No hay usuarios pendientes de Talana</div>
            )}
          </div>
        </div>

        <div className="border-2 border-blue-300 p-3">
          <h4 className="font-bold text-blue-800 mb-3 flex items-center justify-between">
            <span>Clerk (Nuevos)</span>
            <span className="text-sm font-normal bg-blue-100 px-2 py-0.5">{clerkOnlyUsers?.length ?? 0}</span>
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {clerkOnlyUsers?.map((u) => (
              <UserCard
                key={u._id}
                user={u}
                variant="clerk"
                linkOptions={talanaUsers}
                onLink={(targetId) => handleLinkClerkToTalana(u._id, targetId)}
              />
            ))}
            {clerkOnlyUsers?.length === 0 && (
              <div className="text-sm text-gray-500 italic">No hay usuarios solo de Clerk</div>
            )}
          </div>
        </div>

        <div className="border-2 border-green-300 p-3">
          <h4 className="font-bold text-green-800 mb-3 flex items-center justify-between">
            <span>Vinculados</span>
            <span className="text-sm font-normal bg-green-100 px-2 py-0.5">{linkedUsers?.length ?? 0}</span>
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {linkedUsers?.map((u) => (
              <UserCard
                key={u._id}
                user={u}
                variant="linked"
                onUpdateRole={(role) => updateRole({ id: u._id, role })}
              />
            ))}
            {linkedUsers?.length === 0 && (
              <div className="text-sm text-gray-500 italic">No hay usuarios vinculados</div>
            )}
          </div>
        </div>
      </div>

      {testUsers.length > 0 && (
        <div className="border-2 border-gray-300 p-3">
          <h4 className="font-bold text-gray-700 mb-3 flex items-center justify-between">
            <span>Usuarios de Prueba</span>
            <span className="text-sm font-normal bg-gray-100 px-2 py-0.5">{testUsers.length}</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {testUsers.map((u) => (
              <UserCard key={u._id} user={u} variant="test" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
