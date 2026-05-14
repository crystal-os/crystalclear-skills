"use client";
import { useOS } from "@/state/os";
import { useMemo, useState } from "react";

interface Job {
  id: string;
  title: string;
  status: string;
  budget: number;
  assignedTo?: string;
  clickup_id?: string;
  created_at: string;
}

export function JobsPanel() {
  const { jobs } = useOS();
  const [sortBy, setSortBy] = useState<"status" | "budget" | "created_at">(
    "created_at",
  );
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredAndSortedJobs = useMemo(() => {
    let filtered = jobs;

    if (filterStatus !== "all") {
      filtered = filtered.filter((job: Job) => job.status === filterStatus);
    }

    return filtered.sort((a: Job, b: Job) => {
      if (sortBy === "budget") return b.budget - a.budget;
      if (sortBy === "status") return a.status.localeCompare(b.status);
      if (sortBy === "created_at")
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      return 0;
    });
  }, [jobs, sortBy, filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#fbbf24"; // yellow
      case "running":
        return "#3b82f6"; // blue
      case "completed":
        return "#10b981"; // green
      default:
        return "#6b7280"; // gray
    }
  };

  const statusOptions = ["all", "pending", "running", "completed"];

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20, color: "#fff" }}>Jobs Marketplace</h2>

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
          <label style={{ color: "#fff", marginRight: 10 }}>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: 5,
              background: "#333",
              color: "#fff",
              border: "1px solid #555",
            }}
          >
            <option value="created_at">Newest</option>
            <option value="budget">Budget (High to Low)</option>
            <option value="status">Status</option>
          </select>
        </div>

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

        <div style={{ color: "#fff" }}>{filteredAndSortedJobs.length} jobs</div>
      </div>

      {/* Jobs Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 20,
        }}
      >
        {filteredAndSortedJobs.map((job: Job) => (
          <div
            key={job.id}
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
                marginBottom: 10,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 18, flex: 1 }}>{job.title}</h3>
              <span
                style={{
                  background: getStatusColor(job.status),
                  color: "#000",
                  padding: "4px 8px",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: "bold",
                  textTransform: "uppercase",
                }}
              >
                {job.status}
              </span>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div
                style={{ fontSize: 24, fontWeight: "bold", color: "#10b981" }}
              >
                ${job.budget}
              </div>
              <div style={{ fontSize: 14, color: "#9ca3af" }}>Budget</div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 14, color: "#fff" }}>
                <strong>Assigned:</strong> {job.assignedTo || "Unassigned"}
              </div>
            </div>

            {job.clickup_id && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 14, color: "#60a5fa" }}>
                  <strong>ClickUp Task:</strong> {job.clickup_id}
                </div>
              </div>
            )}

            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Created: {new Date(job.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {filteredAndSortedJobs.length === 0 && (
        <div style={{ textAlign: "center", color: "#6b7280", padding: 40 }}>
          No jobs match the current filters.
        </div>
      )}
    </div>
  );
}
