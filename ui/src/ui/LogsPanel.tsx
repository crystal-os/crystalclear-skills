"use client";
import { useOS } from "@/state/os";
import { useEffect, useRef, useState } from "react";

interface LogEntry {
  id: string;
  agent_id: string;
  task_id?: string;
  logs: any;
  result?: any;
  created_at: string;
}

export function LogsPanel() {
  const { logs } = useOS();
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [filterTask, setFilterTask] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const filteredLogs = logs.filter((log: LogEntry) => {
    const matchesAgent = filterAgent === "all" || log.agent_id === filterAgent;
    const matchesTask = filterTask === "all" || log.task_id === filterTask;
    const matchesSearch =
      searchTerm === "" ||
      JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase());

    return matchesAgent && matchesTask && matchesSearch;
  });

  // Get unique agents and tasks for filter dropdowns
  const uniqueAgents = Array.from(
    new Set(logs.map((log: LogEntry) => log.agent_id)),
  );
  const uniqueTasks = Array.from(
    new Set(logs.map((log: LogEntry) => log.task_id).filter(Boolean)),
  );

  const getLogTypeColor = (log: LogEntry) => {
    if (log.result) return "#10b981"; // success - green
    if (
      log.logs &&
      Array.isArray(log.logs) &&
      log.logs.some((l: string) => l.toLowerCase().includes("error"))
    ) {
      return "#ef4444"; // error - red
    }
    return "#3b82f6"; // info - blue
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const renderLogContent = (log: LogEntry) => {
    if (log.logs && Array.isArray(log.logs)) {
      return log.logs.map((line: string, index: number) => (
        <div
          key={index}
          style={{ marginBottom: 4, fontFamily: "monospace", fontSize: 13 }}
        >
          {line}
        </div>
      ));
    }
    if (typeof log.logs === "string") {
      return (
        <div style={{ fontFamily: "monospace", fontSize: 13 }}>{log.logs}</div>
      );
    }
    return (
      <pre style={{ fontSize: 12 }}>{JSON.stringify(log.logs, null, 2)}</pre>
    );
  };

  return (
    <div
      style={{
        padding: 20,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h2 style={{ marginBottom: 20, color: "#fff" }}>Execution Logs</h2>

      {/* Controls */}
      <div
        style={{ display: "flex", gap: 15, marginBottom: 20, flexWrap: "wrap" }}
      >
        <div>
          <label style={{ color: "#fff", marginRight: 10, fontSize: 14 }}>
            Agent:
          </label>
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            style={{
              padding: 5,
              background: "#333",
              color: "#fff",
              border: "1px solid #555",
              borderRadius: 4,
            }}
          >
            <option value="all">All Agents</option>
            {uniqueAgents.map((agent) => (
              <option key={agent} value={agent}>
                {agent}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ color: "#fff", marginRight: 10, fontSize: 14 }}>
            Task:
          </label>
          <select
            value={filterTask}
            onChange={(e) => setFilterTask(e.target.value)}
            style={{
              padding: 5,
              background: "#333",
              color: "#fff",
              border: "1px solid #555",
              borderRadius: 4,
            }}
          >
            <option value="all">All Tasks</option>
            {uniqueTasks.map((task) => (
              <option key={task} value={task}>
                {task}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ color: "#fff", marginRight: 10, fontSize: 14 }}>
            Search:
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs..."
            style={{
              padding: 5,
              background: "#333",
              color: "#fff",
              border: "1px solid #555",
              borderRadius: 4,
              minWidth: 200,
            }}
          />
        </div>

        <div style={{ color: "#fff", alignSelf: "center" }}>
          {filteredLogs.length} logs
        </div>
      </div>

      {/* Logs Container */}
      <div
        style={{
          flex: 1,
          background: "#000",
          border: "1px solid #333",
          borderRadius: 8,
          padding: 15,
          overflowY: "auto",
          fontFamily: "monospace",
          maxHeight: "70vh",
        }}
      >
        {filteredLogs.length === 0 ? (
          <div style={{ color: "#6b7280", textAlign: "center", padding: 40 }}>
            {logs.length === 0
              ? "No execution logs yet."
              : "No logs match the current filters."}
          </div>
        ) : (
          filteredLogs.map((log: LogEntry) => (
            <div
              key={log.id}
              style={{
                marginBottom: 15,
                padding: 12,
                background: "#1a1a1a",
                borderLeft: `4px solid ${getLogTypeColor(log)}`,
                borderRadius: 4,
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
                  <span style={{ color: "#60a5fa", fontWeight: "bold" }}>
                    {log.agent_id}
                  </span>
                  {log.task_id && (
                    <span style={{ color: "#f59e0b" }}>
                      Task: {log.task_id}
                    </span>
                  )}
                </div>
                <span style={{ color: "#6b7280", fontSize: 12 }}>
                  {formatTimestamp(log.created_at)}
                </span>
              </div>

              {/* Log Content */}
              <div style={{ color: "#e5e7eb", marginBottom: 8 }}>
                {renderLogContent(log)}
              </div>

              {/* Result */}
              {log.result && (
                <div
                  style={{
                    padding: 8,
                    background: "#065f46",
                    borderRadius: 4,
                    color: "#d1fae5",
                    fontSize: 13,
                  }}
                >
                  <strong>Result:</strong>
                  <pre style={{ margin: "5px 0 0 0", whiteSpace: "pre-wrap" }}>
                    {typeof log.result === "string"
                      ? log.result
                      : JSON.stringify(log.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
