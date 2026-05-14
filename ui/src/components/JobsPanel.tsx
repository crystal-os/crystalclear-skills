import { realtime } from "@/runtime/realtime";
import { useEffect, useState } from "react";

interface Job {
  id: string;
  title: string;
  status: string;
  budget: number;
  assignedTo?: string;
  clickup_id?: string;
}

export default function JobsPanel() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    // Initial load from Supabase
    fetch("/api/supabase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "query", table: "jobs" }),
    })
      .then((res) => res.json())
      .then((data) => setJobs(data || []))
      .catch(console.error);

    // Subscribe to realtime updates
    realtime.subscribe("jobs", (payload) => {
      if (payload.eventType === "INSERT") {
        setJobs((prev) => [...prev, payload.new]);
      } else if (payload.eventType === "UPDATE") {
        setJobs((prev) =>
          prev.map((j) => (j.id === payload.new.id ? payload.new : j)),
        );
      }
    });

    return () => realtime.unsubscribe("jobs");
  }, []);

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg">
      <h2 className="text-xl font-bold mb-4">Jobs Panel</h2>
      <div className="space-y-2">
        {jobs.map((job) => (
          <div key={job.id} className="p-3 bg-gray-800 rounded">
            <div className="flex justify-between">
              <span className="font-semibold">{job.title}</span>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  job.status === "pending"
                    ? "bg-yellow-600"
                    : job.status === "running"
                      ? "bg-blue-600"
                      : job.status === "completed"
                        ? "bg-green-600"
                        : "bg-gray-600"
                }`}
              >
                {job.status}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              Budget: ${job.budget} | Assigned: {job.assignedTo || "Unassigned"}
              {job.clickup_id && ` | ClickUp: ${job.clickup_id}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
