import { realtime } from "@/runtime/realtime";
import { useEffect, useState } from "react";

interface Log {
  id: string;
  agent_id: string;
  task_id?: string;
  logs: any;
  result?: any;
  created_at: string;
}

export default function LogsPanel() {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    // Initial load from Supabase
    fetch("/api/supabase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logs" }),
    })
      .then((res) => res.json())
      .then((data) => setLogs(data || []))
      .catch(console.error);

    // Subscribe to realtime updates
    realtime.subscribe("execution_logs", (payload) => {
      if (payload.eventType === "INSERT") {
        setLogs((prev) => [payload.new, ...prev.slice(0, 49)]); // Keep last 50
      }
    });

    return () => realtime.unsubscribe("execution_logs");
  }, []);

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg">
      <h2 className="text-xl font-bold mb-4">Logs Panel</h2>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {logs.map((log) => (
          <div key={log.id} className="p-3 bg-gray-800 rounded">
            <div className="flex justify-between">
              <span className="font-semibold">{log.agent_id}</span>
              <span className="text-xs text-gray-400">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              Task: {log.task_id || "N/A"}
            </div>
            <div className="text-sm mt-1">
              {log.logs && Array.isArray(log.logs)
                ? log.logs.join(" | ")
                : JSON.stringify(log.logs)}
            </div>
            {log.result && (
              <div className="text-sm mt-1 text-green-400">
                Result: {JSON.stringify(log.result)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
