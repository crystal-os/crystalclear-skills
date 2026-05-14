"use client";
import { useOS } from "@/state/os";
import { useEffect, useState } from "react";

interface Agent {
  agent_id: string;
  status: string;
  last_seen: string;
  metadata?: {
    trust?: number;
    latency?: number;
    skills?: string[];
    role?: string;
  };
}

export function AgentsPanel() {
  const { agents } = useOS();
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update time every second for "last seen" calculations
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "#10b981"; // green
      case "busy":
        return "#f59e0b"; // amber
      case "offline":
        return "#6b7280"; // gray
      default:
        return "#6b7280";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "online":
        return "Online";
      case "busy":
        return "Busy";
      case "offline":
        return "Offline";
      default:
        return "Unknown";
    }
  };

  const formatLastSeen = (lastSeen: string) => {
    const diff = currentTime - new Date(lastSeen).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  const isRecentlyActive = (lastSeen: string) => {
    const diff = currentTime - new Date(lastSeen).getTime();
    return diff < 30000; // 30 seconds
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20, color: "#fff" }}>Agent Ecosystem</h2>

      {/* Stats */}
      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
        <div style={{ color: "#fff" }}>
          <span style={{ fontSize: 24, fontWeight: "bold" }}>
            {agents.length}
          </span>
          <span style={{ fontSize: 14, color: "#9ca3af", marginLeft: 5 }}>
            Total Agents
          </span>
        </div>
        <div style={{ color: "#fff" }}>
          <span style={{ fontSize: 24, fontWeight: "bold", color: "#10b981" }}>
            {agents.filter((a: Agent) => a.status === "online").length}
          </span>
          <span style={{ fontSize: 14, color: "#9ca3af", marginLeft: 5 }}>
            Online
          </span>
        </div>
        <div style={{ color: "#fff" }}>
          <span style={{ fontSize: 24, fontWeight: "bold", color: "#f59e0b" }}>
            {agents.filter((a: Agent) => a.status === "busy").length}
          </span>
          <span style={{ fontSize: 14, color: "#9ca3af", marginLeft: 5 }}>
            Busy
          </span>
        </div>
      </div>

      {/* Agents Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 20,
        }}
      >
        {agents.map((agent: Agent) => (
          <div
            key={agent.agent_id}
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: 8,
              padding: 20,
              color: "#fff",
              position: "relative",
            }}
          >
            {/* Heartbeat indicator for online agents */}
            {agent.status === "online" && isRecentlyActive(agent.last_seen) && (
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  width: 12,
                  height: 12,
                  background: "#10b981",
                  borderRadius: "50%",
                  animation: "pulse 2s infinite",
                }}
              />
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 15,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  background: getStatusColor(agent.status),
                  borderRadius: "50%",
                  marginRight: 10,
                  boxShadow:
                    agent.status === "online"
                      ? "0 0 10px rgba(16, 185, 129, 0.5)"
                      : "none",
                }}
              />
              <h3 style={{ margin: 0, fontSize: 18 }}>{agent.agent_id}</h3>
            </div>

            <div style={{ marginBottom: 10 }}>
              <span
                style={{
                  background: getStatusColor(agent.status),
                  color: "#000",
                  padding: "4px 8px",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: "bold",
                }}
              >
                {getStatusText(agent.status)}
              </span>
            </div>

            <div style={{ marginBottom: 15 }}>
              <div style={{ fontSize: 14, color: "#9ca3af" }}>
                Last seen: {formatLastSeen(agent.last_seen)}
              </div>
            </div>

            {agent.metadata && (
              <div style={{ borderTop: "1px solid #333", paddingTop: 15 }}>
                {agent.metadata.role && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 14, color: "#60a5fa" }}>
                      <strong>Role:</strong> {agent.metadata.role}
                    </div>
                  </div>
                )}

                {agent.metadata.trust && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 14, color: "#fff" }}>
                      <strong>Trust:</strong> {agent.metadata.trust}/100
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: 4,
                        background: "#333",
                        borderRadius: 2,
                        marginTop: 4,
                      }}
                    >
                      <div
                        style={{
                          width: `${agent.metadata.trust}%`,
                          height: "100%",
                          background: "#10b981",
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                )}

                {agent.metadata.latency && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 14, color: "#fff" }}>
                      <strong>Latency:</strong> {agent.metadata.latency}ms
                    </div>
                  </div>
                )}

                {agent.metadata.skills && agent.metadata.skills.length > 0 && (
                  <div>
                    <div
                      style={{ fontSize: 14, color: "#fff", marginBottom: 5 }}
                    >
                      <strong>Skills:</strong>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {agent.metadata.skills.map((skill, index) => (
                        <span
                          key={index}
                          style={{
                            background: "#374151",
                            color: "#e5e7eb",
                            padding: "2px 6px",
                            borderRadius: 3,
                            fontSize: 12,
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {agents.length === 0 && (
        <div style={{ textAlign: "center", color: "#6b7280", padding: 40 }}>
          No agents currently registered.
        </div>
      )}

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
