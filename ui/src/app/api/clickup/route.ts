import { NextRequest, NextResponse } from "next/server";

const clickupApiKey =
  process.env.CLICKUP_API_KEY || process.env.NEXT_PUBLIC_CLICKUP_API_KEY;
const apiBase = "https://api.clickup.com/api/v2";

const makeHeaders = () => {
  return {
    Authorization: clickupApiKey || "",
    "Content-Type": "application/json",
  };
};

export async function POST(req: NextRequest) {
  if (!clickupApiKey) {
    return NextResponse.json(
      { error: "Missing CLICKUP_API_KEY or NEXT_PUBLIC_CLICKUP_API_KEY." },
      { status: 500 },
    );
  }

  const body = await req.json();
  const action = body?.action;
  if (!action) {
    return NextResponse.json({ error: "Missing action." }, { status: 400 });
  }

  try {
    if (action === "createTask") {
      const listId = body.listId;
      const title = body.title;
      const description = body.description || "";

      if (!listId || !title) {
        return NextResponse.json(
          { error: "Missing listId or title." },
          { status: 400 },
        );
      }

      const response = await fetch(
        `${apiBase}/list/${encodeURIComponent(listId)}/task`,
        {
          method: "POST",
          headers: makeHeaders(),
          body: JSON.stringify({ name: title, description }),
        },
      );

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    if (action === "updateTask") {
      const taskId = body.taskId;
      const fields = body.fields;
      if (!taskId || typeof fields !== "object") {
        return NextResponse.json(
          { error: "Missing taskId or fields." },
          { status: 400 },
        );
      }

      const response = await fetch(
        `${apiBase}/task/${encodeURIComponent(taskId)}`,
        {
          method: "PUT",
          headers: makeHeaders(),
          body: JSON.stringify(fields),
        },
      );

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    if (action === "closeTask") {
      const taskId = body.taskId;
      if (!taskId) {
        return NextResponse.json({ error: "Missing taskId." }, { status: 400 });
      }

      const response = await fetch(
        `${apiBase}/task/${encodeURIComponent(taskId)}`,
        {
          method: "PUT",
          headers: makeHeaders(),
          body: JSON.stringify({ status: "complete" }),
        },
      );

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    if (action === "getTasks") {
      const listId = body.listId;
      if (!listId) {
        return NextResponse.json({ error: "Missing listId." }, { status: 400 });
      }

      const response = await fetch(
        `${apiBase}/list/${encodeURIComponent(listId)}/task`,
        {
          headers: makeHeaders(),
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
