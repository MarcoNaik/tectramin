"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { useUser } from "@clerk/nextjs";

export function UsersTab() {
  const { user } = useUser();
  const users = useQuery(api.shared.users.list);
  const upsertFromClerk = useMutation(api.shared.users.upsertFromClerk);
  const updateRole = useMutation(api.shared.users.updateRole);
  const triggerTalanaSync = useMutation(api.talana.triggerSync);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [talanaSyncStatus, setTalanaSyncStatus] = useState<"idle" | "syncing" | "triggered">("idle");
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

  const alreadySynced = users?.some((u) => u.clerkId === user?.id);
  const talanaUsers = users?.filter((u) => u.clerkId.startsWith("talana_")) ?? [];
  const linkedUsers = users?.filter((u) => !u.clerkId.startsWith("talana_") && !u.clerkId.startsWith("test_") && u.talanaId) ?? [];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Users ({users?.length ?? 0})</h3>
      <div className="p-3 bg-yellow-50 border-2 border-yellow-300">
        <div className="text-sm font-bold text-yellow-800 mb-2">Your Clerk ID: {user?.id}</div>
        {alreadySynced ? (
          <div className="text-green-600 text-sm font-bold">You are already synced to the database</div>
        ) : (
          <button
            onClick={handleSyncCurrentUser}
            disabled={syncStatus === "syncing"}
            className="bg-blue-500 text-white px-4 py-2 text-sm font-bold border-2 border-black disabled:opacity-50 hover:bg-blue-600"
          >
            {syncStatus === "syncing" ? "Syncing..." : "Sync Current User to Database"}
          </button>
        )}
        {syncStatus === "success" && <div className="text-green-600 text-sm mt-2 font-bold">Synced successfully!</div>}
        {syncStatus === "error" && <div className="text-red-600 text-sm mt-2 font-bold">Sync failed - check console</div>}
      </div>
      <div className="p-3 bg-blue-50 border-2 border-blue-300">
        <div className="text-sm font-bold text-blue-800 mb-2">Create Test User (for debugging)</div>
        <div className="flex gap-2">
          <input
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="Name"
            className="border-2 border-black px-3 py-2 flex-1 text-sm"
          />
          <input
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Email *"
            className="border-2 border-black px-3 py-2 flex-1 text-sm"
          />
          <button
            onClick={handleCreateTestUser}
            disabled={!testEmail.trim()}
            className="bg-blue-500 text-white px-4 py-2 text-sm font-bold border-2 border-black disabled:opacity-50 hover:bg-blue-600"
          >
            Add Test User
          </button>
        </div>
      </div>
      <div className="p-3 bg-purple-50 border-2 border-purple-300">
        <div className="text-sm font-bold text-purple-800 mb-2">Talana Integration</div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleTalanaSync}
            disabled={talanaSyncStatus === "syncing"}
            className="bg-purple-500 text-white px-4 py-2 text-sm font-bold border-2 border-black disabled:opacity-50 hover:bg-purple-600"
          >
            {talanaSyncStatus === "syncing" ? "Syncing..." : "Sync from Talana"}
          </button>
          {talanaSyncStatus === "triggered" && (
            <span className="text-purple-600 text-sm font-bold">Sync started in background</span>
          )}
          <span className="text-purple-600 text-sm">
            Pending: {talanaUsers.length} | Linked: {linkedUsers.length}
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {users?.map((u) => {
          const isPending = u.clerkId.startsWith("talana_");
          const isTest = u.clerkId.startsWith("test_");
          return (
            <div key={u._id} className={`flex items-center justify-between p-3 border-2 border-black ${isPending ? "bg-purple-50" : isTest ? "bg-blue-50" : "bg-gray-50"}`}>
              <div>
                <span className="font-bold">{u.fullName ?? u.email}</span>
                <span className="text-gray-500 ml-2">({u.email})</span>
                {u.rut && <span className="text-gray-500 ml-2">RUT: {u.rut}</span>}
                <span className={`ml-2 text-xs px-2 py-0.5 border border-black ${u.role === "admin" ? "bg-purple-100 text-purple-700" : u.role === "supervisor" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                  {u.role}
                </span>
                {isPending && (
                  <span className="ml-2 text-xs px-2 py-0.5 border border-purple-500 bg-purple-100 text-purple-700">
                    Pending Signup
                  </span>
                )}
                {isTest && (
                  <span className="ml-2 text-xs px-2 py-0.5 border border-blue-500 bg-blue-100 text-blue-700">
                    Test User
                  </span>
                )}
                {u.talanaId && !isPending && (
                  <span className="ml-2 text-xs px-2 py-0.5 border border-green-500 bg-green-100 text-green-700">
                    Linked to Talana
                  </span>
                )}
              </div>
              <select
                value={u.role}
                onChange={(e) => updateRole({ id: u._id, role: e.target.value })}
                className="border-2 border-black px-2 py-1 text-sm"
              >
                <option value="field_worker">Field Worker</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
