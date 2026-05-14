export type DbQueryResult = { [key: string]: unknown }[];

const apiBase = "/api/supabase";

const request = async <T>(payload: unknown): Promise<T> => {
  const res = await fetch(apiBase, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json();
  if (!res.ok) throw new Error(body?.error || "Supabase API error");
  return body as T;
};

export const dbQuery = async (query: string) => {
  return request<DbQueryResult>({ action: "query", query });
};

export const dbInsert = async (
  table: string,
  record: Record<string, unknown>,
) => {
  return request<DbQueryResult>({ action: "insert", table, record });
};

export const dbUpdate = async (
  table: string,
  id: string,
  record: Record<string, unknown>,
) => {
  return request<DbQueryResult>({ action: "update", table, id, record });
};

export const dbUpsert = async (
  table: string,
  record: Record<string, unknown>,
  conflictKey = "id",
) => {
  return request<DbQueryResult>({
    action: "upsert",
    table,
    record,
    conflictKey,
  });
};

export const dbLogs = async () => {
  return request<DbQueryResult>({ action: "logs" });
};
