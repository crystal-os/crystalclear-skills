import { realtime } from "@/runtime/realtime";
import { useEffect, useState } from "react";

interface AgentPresence {
  agent_id: string;
  status: string;
  last_seen: string;
  metadata?: any;
}

export default function AgentsPanel() {
  const [agents, setAgents] = useState<AgentPresence[]>([]);

  useEffect(() => {
    // Initial load from Supabase
    fetch("/api/supabase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "query", table: "agent_presence" }),
    })
      .then((res) => res.json())
      .then((data) => setAgents(data || []))
      .catch(console.error);

    // Subscribe to realtime updates
    realtime.subscribe("agent_presence", (payload) => {
      if (payload.eventType === "INSERT") {
        setAgents((prev) => [...prev, payload.new]);
      } else if (payload.eventType === "UPDATE") {
        setAgents((prev) =>
          prev.map((a) =>
            a.agent_id === payload.new.agent_id ? payload.new : a,
          ),
        );
      }
    });

    return () => realtime.unsubscribe("agent_presence");
  }, []);

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg">
      <h2 className="text-xl font-bold mb-4">Agents Panel</h2>
      <div className="space-y-2">
        {agents.map((agent) => (
          <div key={agent.agent_id} className="p-3 bg-gray-800 rounded">
            <div className="flex justify-between">
              <span className="font-semibold">{agent.agent_id}</span>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  agent.status === "online"
                    ? "bg-green-600"
                    : agent.status === "busy"
                      ? "bg-yellow-600"
                      : "bg-red-600"
                }`}
              >
                {agent.status}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              Last seen: {new Date(agent.last_seen).toLocaleString()}
              {agent.metadata && ` | ${JSON.stringify(agent.metadata)}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
