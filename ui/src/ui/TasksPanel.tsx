"use client";
import { useOS } from "@/state/os";
import { useMemo, useState } from "react";

interface Task {
  id: string;
  title: string;
  status: string;
  priority?: number;
  updated_at: string;
}

export function TasksPanel() {
  const { tasks, jobs } = useOS();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredTasks = useMemo(() => {
    if (filterStatus === "all") return tasks;
    return tasks.filter((task: Task) => task.status === filterStatus);
  }, [tasks, filterStatus]);

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "#6b7280"; // gray
      case "in progress":
        return "#3b82f6"; // blue
      case "complete":
        return "#10b981"; // green
      default:
        return "#6b7280";
    }
  };

  const getPriorityColor = (priority?: number) => {
    switch (priority) {
      case 1:
        return "#10b981"; // low - green
      case 2:
        return "#f59e0b"; // normal - amber
      case 3:
        return "#ef4444"; // high - red
      case 4:
        return "#dc2626"; // urgent - dark red
      default:
        return "#6b7280"; // none - gray
    }
  };

  const getPriorityLabel = (priority?: number) => {
    switch (priority) {
      case 1:
        return "Low";
      case 2:
        return "Normal";
      case 3:
        return "High";
      case 4:
        return "Urgent";
      default:
        return "None";
    }
  };

  const hasMappedJob = (taskId: string) => {
    return jobs.some((job: any) => job.clickup_id === taskId);
  };

  const getMappedJob = (taskId: string) => {
    return jobs.find((job: any) => job.clickup_id === taskId);
  };

  const handleCreateJob = async (task: Task) => {
    // Call the API to create job from task
    try {
      const response = await fetch("/api/supabase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "insert",
          table: "jobs",
          data: {
            id: `j${Date.now()}`,
            title: task.title,
            description: `Auto-created from ClickUp task: ${task.title}`,
            budget: 75, // default budget
            status: "pending",
            clickup_id: task.id,
            created_at: new Date().toISOString(),
          },
        }),
      });

      if (response.ok) {
        alert("Job created successfully!");
        // The realtime subscription will update the UI
      } else {
        alert("Failed to create job");
      }
    } catch (error) {
      console.error("Error creating job:", error);
      alert("Error creating job");
    }
  };

  const statusOptions = ["all", "todo", "in progress", "complete"];

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20, color: "#fff" }}>ClickUp Tasks</h2>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 20,
          alignItems: "center",
        }}
      >
        <div>
          <label style={{ color: "#fff", marginRight: 10 }}>
            Filter status:
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: 5,
              background: "#333",
              color: "#fff",
              border: "1px solid #555",
            }}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status === "all"
                  ? "All"
                  : status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ color: "#fff" }}>{filteredTasks.length} tasks</div>
      </div>

      {/* Tasks Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: 20,
        }}
      >
        {filteredTasks.map((task: Task) => {
          const mappedJob = getMappedJob(task.id);
          return (
            <div
              key={task.id}
              style={{
                background: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: 8,
                padding: 20,
                color: "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 15,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 18, flex: 1 }}>
                  {task.title}
                </h3>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  {/* Sync indicator */}
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      background: "#10b981",
                      borderRadius: "50%",
                      title: "Synced with ClickUp",
                    }}
                  />
                  {/* Status badge */}
                  <span
                    style={{
                      background: getTaskStatusColor(task.status),
                      color: "#000",
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: "bold",
                      textTransform: "uppercase",
                    }}
                  >
                    {task.status}
                  </span>
                </div>
              </div>

              {/* Priority */}
              {task.priority && (
                <div style={{ marginBottom: 10 }}>
                  <span
                    style={{
                      background: getPriorityColor(task.priority),
                      color: "#000",
                      padding: "2px 6px",
                      borderRadius: 3,
                      fontSize: 11,
                      fontWeight: "bold",
                    }}
                  >
                    {getPriorityLabel(task.priority)}
                  </span>
                </div>
              )}

              {/* Job mapping status */}
              <div style={{ marginBottom: 15 }}>
                {mappedJob ? (
                  <div style={{ fontSize: 14, color: "#60a5fa" }}>
                    <strong>Job Mapped:</strong> {mappedJob.title} ($
                    {mappedJob.budget})
                    <span
                      style={{
                        marginLeft: 5,
                        padding: "2px 4px",
                        background:
                          mappedJob.status === "completed"
                            ? "#10b981"
                            : "#3b82f6",
                        color: "#000",
                        borderRadius: 3,
                        fontSize: 10,
                      }}
                    >
                      {mappedJob.status}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: 14, color: "#f59e0b" }}>
                    <strong>No Job Mapped</strong>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
                <button
                  onClick={() =>
                    window.open(
                      `https://app.clickup.com/t/${task.id}`,
                      "_blank",
                    )
                  }
                  style={{
                    padding: "6px 12px",
                    background: "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  View in ClickUp
                </button>

                {!mappedJob && (
                  <button
                    onClick={() => handleCreateJob(task)}
                    style={{
                      padding: "6px 12px",
                      background: "#10b981",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    Create Job
                  </button>
                )}
              </div>

              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Updated: {new Date(task.updated_at).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {filteredTasks.length === 0 && (
        <div style={{ textAlign: "center", color: "#6b7280", padding: 40 }}>
          No tasks match the current filters.
        </div>
      )}
    </div>
  );
}
