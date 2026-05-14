import { notion } from "@/lib/providers/notion";
import { agents } from "@/runtime/agents";
import { embeddings } from "@/runtime/embeddings";
import { verifyNotionSignature } from "@/security/notionSignature";
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

function extractTitle(page: any): string {
  try {
    return (
      page.properties?.title?.title?.[0]?.plain_text ||
      page.properties?.Name?.title?.[0]?.plain_text ||
      "Untitled"
    );
  } catch {
    return "Untitled";
  }
}

function extractPlainText(blocks: any[]): string {
  if (!blocks) return "";

  return blocks
    .map((block) => {
      if (block.paragraph?.rich_text) {
        return block.paragraph.rich_text
          .map((t: any) => t.plain_text)
          .join(" ");
      }
      if (block.heading_1?.rich_text) {
        return block.heading_1.rich_text
          .map((t: any) => t.plain_text)
          .join(" ");
      }
      if (block.heading_2?.rich_text) {
        return block.heading_2.rich_text
          .map((t: any) => t.plain_text)
          .join(" ");
      }
      if (block.heading_3?.rich_text) {
        return block.heading_3.rich_text
          .map((t: any) => t.plain_text)
          .join(" ");
      }
      return "";
    })
    .join("\n");
}

export async function POST(req: NextRequest) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Missing Supabase environment variables." },
      { status: 500 },
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-notion-signature");

  if (!verifyNotionSignature(rawBody, signature || undefined)) {
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
  const page = payload.data;

  try {
    // Log raw event
    await fetch(`${supabaseUrl}/rest/v1/notion_events`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify({
        event,
        page_id: page?.id || null,
        payload,
        created_at: new Date().toISOString(),
      }),
    });

    if (page?.id) {
      // Get full page
      const fullPage = await notion.getPage(page.id);
      const contentBlocks = await notion.getPageContent(page.id);
      const text = extractPlainText(contentBlocks.results);

      // Mirror into knowledge table
      await fetch(`${supabaseUrl}/rest/v1/knowledge?on_conflict=id`, {
        method: "POST",
        headers: {
          ...baseHeaders,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          id: page.id,
          title: extractTitle(fullPage),
          content: text,
          updated_at: new Date().toISOString(),
        }),
      });

      // Update embeddings
      await embeddings.index(page.id, text);
    }

    // Notify agents
    agents.broadcast("notion_event", payload);

    // Trigger n8n
    if (n8nUrl) {
      try {
        await fetch(`${n8nUrl.replace(/\/+$/, "")}/webhook/notion-event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        console.error("n8n trigger failed:", error);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
