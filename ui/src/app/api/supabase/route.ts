import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const baseHeaders = {
  apikey: supabaseKey || "",
  Authorization: `Bearer ${supabaseKey || ""}`,
  "Content-Type": "application/json",
};

const parseQuery = (query: string) => {
  const normalized = query.trim().replace(/\s+/g, " ");
  const match = normalized.match(/^select\s+(.+)\s+from\s+(\w+)$/i);
  if (!match) return null;
  return { select: match[1], table: match[2] };
};

export async function POST(req: NextRequest) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Missing Supabase environment variables." },
      { status: 500 },
    );
  }

  const body = await req.json();
  const action = body?.action;

  if (!action) {
    return NextResponse.json({ error: "Missing action." }, { status: 400 });
  }

  try {
    if (action === "query") {
      const query = body.query;
      if (!query || typeof query !== "string") {
        return NextResponse.json({ error: "Missing query." }, { status: 400 });
      }

      const parsed = parseQuery(query);
      if (!parsed) {
        return NextResponse.json(
          { error: "Unsupported query format. Use: select * from <table>." },
          { status: 400 },
        );
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/${parsed.table}?select=${encodeURIComponent(parsed.select)}`,
        {
          headers: baseHeaders,
        },
      );

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    if (action === "insert") {
      const table = body.table;
      const record = body.record;
      if (!table || typeof table !== "string" || typeof record !== "object") {
        return NextResponse.json(
          { error: "Missing table or record." },
          { status: 400 },
        );
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
        method: "POST",
        headers: {
          ...baseHeaders,
          Prefer: "return=representation",
        },
        body: JSON.stringify(record),
      });

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    if (action === "update") {
      const table = body.table;
      const id = body.id;
      const record = body.record;
      if (
        !table ||
        typeof table !== "string" ||
        !id ||
        typeof record !== "object"
      ) {
        return NextResponse.json(
          { error: "Missing table, id, or record." },
          { status: 400 },
        );
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(String(id))}`,
        {
          method: "PATCH",
          headers: {
            ...baseHeaders,
            Prefer: "return=representation",
          },
          body: JSON.stringify(record),
        },
      );

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    if (action === "upsert") {
      const table = body.table;
      const record = body.record;
      const conflictKey = body.conflictKey || "id";
      if (!table || typeof table !== "string" || typeof record !== "object") {
        return NextResponse.json(
          { error: "Missing table or record." },
          { status: 400 },
        );
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/${table}?on_conflict=${encodeURIComponent(
          String(conflictKey),
        )}`,
        {
          method: "POST",
          headers: {
            ...baseHeaders,
            Prefer: "return=representation",
          },
          body: JSON.stringify(record),
        },
      );

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    if (action === "logs") {
      const response = await fetch(`${supabaseUrl}/rest/v1/events?select=*`, {
        headers: baseHeaders,
      });
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
