import { agents } from "@/runtime/agents";
import { autoMapTaskToJob, mirrorTask } from "@/runtime/taskMapper";
import { verifyClickUpSignature } from "@/security/clickupSignature";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const n8nUrl = process.env.N8N_URL;

const baseHeaders = {
  apikey: supabaseKey || "",
  Authorization: `Bearer ${supabaseKey || ""}`,
  "Content-Type": "application/json",
};

export async function POST(req: NextRequest) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Missing Supabase environment variables." },
      { status: 500 },
    );
  }

  const rawBody = await req.text();
  const signature =
    req.headers.get("x-signature") || req.headers.get("X-Signature");

  if (!verifyClickUpSignature(rawBody, signature || undefined)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const event = payload.event;
  const task = payload.task;

  try {
    await fetch(`${supabaseUrl}/rest/v1/clickup_events`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify({
        event,
        task_id: task?.id || null,
        payload,
        created_at: new Date().toISOString(),
      }),
    });

    await mirrorTask(task);
    await autoMapTaskToJob(event, task);

    if (n8nUrl) {
      try {
        await fetch(`${n8nUrl.replace(/\/+$/, "")}/webhook/clickup-event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        console.error("n8n trigger failed:", error);
      }
    }

    agents.broadcast("clickup_event", payload);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
