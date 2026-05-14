const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const baseHeaders = {
  apikey: supabaseKey || "",
  Authorization: `Bearer ${supabaseKey || ""}`,
  "Content-Type": "application/json",
};

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables for taskMapper.");
}

const normalizeTaskStatus = (status: any) => {
  if (!status) return "unknown";
  if (typeof status === "string") return status;
  if (typeof status === "object")
    return status.status || status.text || "unknown";
  return String(status);
};

const inferBudget = (task: any) => {
  if (!task) return 75;
  const priority = task.priority || task.priority_value || task.priority?.value;
  if (priority === 3 || priority === "3") return 300;
  if (priority === 2 || priority === "2") return 150;
  return 75;
};

const mapStatus = (status: any) => {
  const normalized = normalizeTaskStatus(status).toLowerCase();
  if (["complete", "completed", "closed", "done"].includes(normalized))
    return "completed";
  if (["in progress", "working", "active"].includes(normalized))
    return "running";
  if (["pending", "open", "todo"].includes(normalized)) return "pending";
  return normalized;
};

export const mirrorTask = async (task: any) => {
  if (!task?.id) return;

  return fetch(`${supabaseUrl}/rest/v1/tasks?on_conflict=clickup_id`, {
    method: "POST",
    headers: {
      ...baseHeaders,
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      clickup_id: task.id,
      title: task.name,
      description: task.description || "",
      status: normalizeTaskStatus(task.status),
      priority:
        task.priority || task.priority_value || task.priority?.value || null,
      updated_at: new Date().toISOString(),
    }),
  });
};

const createMarketJob = async (task: any) => {
  if (!task?.id) return;

  return fetch(`${supabaseUrl}/rest/v1/jobs?on_conflict=clickup_id`, {
    method: "POST",
    headers: {
      ...baseHeaders,
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      clickup_id: task.id,
      title: task.name,
      description: task.description || "",
      budget: inferBudget(task),
      status: "pending",
      created_at: new Date().toISOString(),
    }),
  });
};

const updateMarketJob = async (task: any) => {
  if (!task?.id) return;

  return fetch(
    `${supabaseUrl}/rest/v1/jobs?clickup_id=eq.${encodeURIComponent(task.id)}`,
    {
      method: "PATCH",
      headers: {
        ...baseHeaders,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        title: task.name,
        description: task.description || "",
        status: mapStatus(task.status),
        updated_at: new Date().toISOString(),
      }),
    },
  );
};

const settleMarketJob = async (task: any) => {
  if (!task?.id) return;

  return fetch(
    `${supabaseUrl}/rest/v1/jobs?clickup_id=eq.${encodeURIComponent(task.id)}`,
    {
      method: "PATCH",
      headers: {
        ...baseHeaders,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        status: "completed",
        updated_at: new Date().toISOString(),
      }),
    },
  );
};

export const autoMapTaskToJob = async (event: string, task: any) => {
  if (!task?.id) return;

  if (event === "taskCreated") {
    return createMarketJob(task);
  }

  if (event === "taskUpdated" || event === "taskStatusUpdated") {
    return updateMarketJob(task);
  }

  if (event === "taskClosed" || event === "taskDeleted") {
    return settleMarketJob(task);
  }

  return null;
};

export const mapTaskEventToAction = (event: string) => {
  if (event === "taskCreated") return "create_job";
  if (event === "taskUpdated" || event === "taskStatusUpdated")
    return "update_job";
  if (event === "taskClosed" || event === "taskDeleted") return "settle_job";
  return "noop";
};

// Reverse mapping: Job → Task
export const awardJobToTask = async (job: any) => {
  if (!job?.clickup_id) return;

  // Update ClickUp task to "in progress"
  const clickupApiBase = "/api/clickup";
  return fetch(clickupApiBase, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "updateTask",
      taskId: job.clickup_id,
      fields: { status: "in progress" },
    }),
  });
};

export const settleJobToTask = async (job: any) => {
  if (!job?.clickup_id) return;

  // Close ClickUp task
  const clickupApiBase = "/api/clickup";
  return fetch(clickupApiBase, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "closeTask",
      taskId: job.clickup_id,
    }),
  });
};
