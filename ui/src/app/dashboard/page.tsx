import AgentsPanel from "@/components/AgentsPanel";
import JobsPanel from "@/components/JobsPanel";
import LogsPanel from "@/components/LogsPanel";
import TasksPanel from "@/components/TasksPanel";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <h1 className="text-3xl font-bold mb-6">CrystalOS Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <JobsPanel />
        <TasksPanel />
        <AgentsPanel />
        <LogsPanel />
      </div>
    </div>
  );
}
