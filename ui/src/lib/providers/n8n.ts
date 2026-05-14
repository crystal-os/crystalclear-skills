const apiBase = "/api/n8n";

const request = async <T>(payload: unknown): Promise<T> => {
  const res = await fetch(apiBase, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json();
  if (!res.ok) throw new Error(body?.error || "N8N API error");
  return body as T;
};

export const n8n = {
  async listWorkflows() {
    return request<any>({ action: "listWorkflows" });
  },

  async runWorkflow(workflowId: string) {
    return request<any>({ action: "runWorkflow", workflowId });
  },

  async triggerWebhook(webhookId: string, payload: unknown) {
    return request<any>({ action: "triggerWebhook", webhookId, payload });
  },
};
