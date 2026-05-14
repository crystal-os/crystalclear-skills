const apiBase = "https://api.notion.com/v1";

const request = async <T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> => {
  const res = await fetch(`${apiBase}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  const body = await res.json();
  if (!res.ok) throw new Error(body?.message || "Notion API error");
  return body as T;
};

export const notion = {
  async getPage(pageId: string) {
    return request<any>(`/pages/${pageId}`);
  },

  async getPageContent(pageId: string) {
    return request<any>(`/blocks/${pageId}/children`);
  },

  async updatePage(pageId: string, properties: any) {
    return request<any>(`/pages/${pageId}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    });
  },
};
