"use client";
import { OSProvider } from "@/providers/OSProvider";
import { useOS } from "@/state/os";
import { AgentsPanel } from "@/ui/AgentsPanel";
import { JobsPanel } from "@/ui/JobsPanel";
import { LogsPanel } from "@/ui/LogsPanel";
import { Sidebar } from "@/ui/Sidebar";
import { TasksPanel } from "@/ui/TasksPanel";
import { TerminalPanel } from "@/ui/TerminalPanel";

export default function OSPage() {
  const { activePanel } = useOS();

  return (
    <OSProvider>
      <div style={{ display: "flex", height: "100vh" }}>
        <Sidebar />
        <div style={{ flex: 1, padding: 20, overflow: "auto" }}>
          {activePanel === "terminal" && <TerminalPanel />}
          {activePanel === "jobs" && <JobsPanel />}
          {activePanel === "tasks" && <TasksPanel />}
          {activePanel === "agents" && <AgentsPanel />}
          {activePanel === "logs" && <LogsPanel />}
        </div>
      </div>
    </OSProvider>
  );
}
