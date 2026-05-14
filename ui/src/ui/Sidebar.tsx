"use client";
import { useOS } from "@/state/os";

export function Sidebar() {
  const { activePanel, setActivePanel } = useOS();

  const items = [
    { id: "terminal", label: "Terminal" },
    { id: "jobs", label: "Jobs" },
    { id: "tasks", label: "Tasks" },
    { id: "agents", label: "Agents" },
    { id: "logs", label: "Logs" },
  ];

  return (
    <div
      style={{
        width: 200,
        background: "#111",
        color: "#fff",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => setActivePanel(item.id)}
          style={{
            padding: 10,
            cursor: "pointer",
            background: activePanel === item.id ? "#333" : "transparent",
          }}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}
