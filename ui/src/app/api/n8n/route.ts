import { NextRequest, NextResponse } from "next/server";

const n8nUrl = process.env.N8N_URL;
const n8nApiKey = process.env.N8N_API_KEY;

const trimSlash = (url: string) => url.replace(/\/+$/, "");

export async function POST(req: NextRequest) {
  if (!n8nUrl || !n8nApiKey) {
    return NextResponse.json(
      { error: "Missing N8N_URL or N8N_API_KEY environment variables." },
      { status: 500 },
    );
  }

  const body = await req.json();
  const action = body?.action;

  if (!action) {
    return NextResponse.json({ error: "Missing action." }, { status: 400 });
  }

  const baseUrl = trimSlash(n8nUrl);
  const headers = {
    "Content-Type": "application/json",
    "X-N8N-API-KEY": n8nApiKey,
  };

  try {
    if (action === "listWorkflows") {
      const response = await fetch(`${baseUrl}/rest/workflows`, { headers });
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    if (action === "runWorkflow") {
      const workflowId = body.workflowId;
      if (!workflowId || typeof workflowId !== "string") {
        return NextResponse.json(
          { error: "Missing workflowId." },
          { status: 400 },
        );
      }

      const response = await fetch(
        `${baseUrl}/rest/workflows/${encodeURIComponent(workflowId)}/run`,
        {
          method: "POST",
          headers,
        },
      );
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    if (action === "triggerWebhook") {
      const webhookId = body.webhookId;
      const payload = body.payload;
      if (!webhookId || typeof webhookId !== "string") {
        return NextResponse.json(
          { error: "Missing webhookId." },
          { status: 400 },
        );
      }

      const response = await fetch(
        `${baseUrl}/webhook/${encodeURIComponent(webhookId)}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload ?? {}),
        },
      );
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
