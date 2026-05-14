import { realtime } from "@/runtime/realtime";
import { useEffect, useState } from "react";

interface Task {
  id: string;
  title: string;
  status: string;
  priority?: number;
  updated_at: string;
}

export default function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    // Initial load from Supabase
    fetch("/api/supabase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "query", table: "tasks" }),
    })
      .then((res) => res.json())
      .then((data) => setTasks(data || []))
      .catch(console.error);

    // Subscribe to realtime updates (assuming tasks table has realtime)
    realtime.subscribe("tasks", (payload) => {
      if (payload.eventType === "INSERT") {
        setTasks((prev) => [...prev, payload.new]);
      } else if (payload.eventType === "UPDATE") {
        setTasks((prev) =>
          prev.map((t) => (t.id === payload.new.id ? payload.new : t)),
        );
      }
    });

    return () => realtime.unsubscribe("tasks");
  }, []);

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg">
      <h2 className="text-xl font-bold mb-4">Tasks Panel</h2>
      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="p-3 bg-gray-800 rounded">
            <div className="flex justify-between">
              <span className="font-semibold">{task.title}</span>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  task.status === "todo"
                    ? "bg-gray-600"
                    : task.status === "in progress"
                      ? "bg-blue-600"
                      : task.status === "complete"
                        ? "bg-green-600"
                        : "bg-gray-600"
                }`}
              >
                {task.status}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              Priority: {task.priority || "N/A"} | Updated:{" "}
              {new Date(task.updated_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
