"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { useState } from "react";

function TaskList() {
  const { user } = useUser();
  const [newTask, setNewTask] = useState("");

  const tasks = useQuery(api.tasks.get, user?.id ? { userId: user.id } : "skip");
  const createTask = useMutation(api.tasks.create);
  const toggleTask = useMutation(api.tasks.toggle);
  const removeTask = useMutation(api.tasks.remove);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim() || !user?.id) return;
    await createTask({ text: newTask, userId: user.id });
    setNewTask("");
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-6">Your Tasks</h2>

      <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add a new task..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add
        </button>
      </form>

      <ul className="space-y-2">
        {tasks?.map((task) => (
          <li
            key={task._id}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <input
              type="checkbox"
              checked={task.isCompleted}
              onChange={() => toggleTask({ id: task._id })}
              className="w-5 h-5"
            />
            <span className={task.isCompleted ? "line-through text-gray-400 flex-1" : "flex-1"}>
              {task.text}
            </span>
            <button
              onClick={() => removeTask({ id: task._id })}
              className="text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <SignedOut>
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Welcome to Tectramin</h2>
            <p className="text-gray-600">Sign in to manage your tasks</p>
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <TaskList />
      </SignedIn>
    </main>
  );
}
