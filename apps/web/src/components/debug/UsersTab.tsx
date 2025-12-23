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
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
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

  const alreadySynced = users?.some((u) => u.clerkId === user?.id);

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
      <div className="space-y-2">
        {users?.map((u) => (
          <div key={u._id} className="flex items-center justify-between p-3 bg-gray-50 border-2 border-black">
            <div>
              <span className="font-bold">{u.fullName ?? u.email}</span>
              <span className="text-gray-500 ml-2">({u.email})</span>
              <span className={`ml-2 text-xs px-2 py-0.5 border border-black ${u.role === "admin" ? "bg-purple-100 text-purple-700" : u.role === "supervisor" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                {u.role}
              </span>
              <span className="text-xs text-gray-400 ml-2">ID: {u._id}</span>
              <span className="text-xs text-gray-400 ml-2">Clerk: {u.clerkId.slice(0, 15)}...</span>
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
        ))}
      </div>
    </div>
  );
}
