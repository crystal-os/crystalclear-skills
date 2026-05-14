const apiBase = "/api/clickup";

const request = async <T>(payload: unknown): Promise<T> => {
  const res = await fetch(apiBase, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json();
  if (!res.ok) throw new Error(body?.error || "ClickUp API error");
  return body as T;
};

export const clickup = {
  async createTask(listId: string, title: string, description = "") {
    return request<any>({ action: "createTask", listId, title, description });
  },

  async updateTask(taskId: string, fields: unknown) {
    return request<any>({ action: "updateTask", taskId, fields });
  },

  async closeTask(taskId: string) {
    return request<any>({ action: "closeTask", taskId });
  },

  async getTasks(listId: string) {
    return request<any>({ action: "getTasks", listId });
  },
};
