"use client";

import { clickup } from "@/lib/providers/clickup";
import { n8n } from "@/lib/providers/n8n";
import { realtime } from "@/runtime/realtime";
import { dbInsert, dbLogs, dbQuery, dbUpdate } from "@/lib/providers/supabase";
import { awardJobToTask, settleJobToTask } from "@/runtime/taskMapper";
import { agents } from "@/runtime/agents";
import { agentLogic } from "@/runtime/agentLogic";
import { useEffect, useRef, useState } from "react";
import { useOS } from "@/state/os";

const scoreBid = (
  bid: { jobId: string; agentId: string; price: number },
  agent:
    | {
        id: string;
        name: string;
        role: string;
        rate: number;
        trust?: number;
        latency?: number;
      }
    | undefined,
  policy: { maxBudget: number; preferredAgents: string[]; minTrust: number },
) => {
  const priceScore = 100 - bid.price;
  const trust = agent?.trust || 80;
  const trustScore = trust;
  const latencyScore = 100 - (agent?.latency || 50);

  let policyScore = 0;

  if (bid.price > policy.maxBudget) {
    policyScore -= 1000;
  }

  if (trust < policy.minTrust) {
    policyScore -= 500;
  }

  if (
    policy.preferredAgents.length > 0 &&
    agent &&
    policy.preferredAgents.includes(agent.id)
  ) {
    policyScore += 50;
  }

  return priceScore + trustScore + latencyScore + policyScore;
};

export default function TerminalEngine() {
  const { addTerminalOutput } = useOS();
  const [history, setHistory] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addToHistory = (lines: string | string[]) => {
    const lineArray = Array.isArray(lines) ? lines : [lines];
    setHistory((prev) => [...prev, ...lineArray]);
    lineArray.forEach(line => addTerminalOutput(line));
  };

  const [agents] = useState([
    { id: "a1", name: "Researcher Alpha", role: "researcher", rate: 25 },
    { id: "a2", name: "Trader Beta", role: "trader", rate: 40 },
    { id: "a3", name: "Shopper Gamma", role: "shopper", rate: 15 },
  ]);

  const [jobs, setJobs] = useState([
    {
      id: "j1",
      title: "Market scan: AI infra",
      status: "running",
      budget: 200,
      assignedTo: null,
      settled: false,
      clickupTaskId: null,
      clickupTaskRowId: null,
    },
    {
      id: "j2",
      title: "NFT floor analysis",
      status: "pending",
      budget: 150,
      assignedTo: null,
      settled: false,
      clickupTaskId: null,
      clickupTaskRowId: null,
    },
  ]);

  const [bids, setBids] = useState<
    {
      jobId: string;
      agentId: string;
      price: number;
      isTeam?: boolean;
    }[]
  >([]);

  const [teams, setTeams] = useState([
    {
      id: "t1",
      name: "research-squad",
      members: ["a1", "a3"],
      trust: 85,
      latency: 40,
    },
    {
      id: "t2",
      name: "trading-unit",
      members: ["a2"],
      trust: 90,
      latency: 30,
    },
  ]);

  const [execution, setExecution] = useState<
    Record<string, { progress: number; logs: string[] }>
  >({});
  const [logs, setLogs] = useState<any[]>([]);
  const [presence, setPresence] = useState<any[]>([]);
  const [broadcastMessages, setBroadcastMessages] = useState<any[]>([]);

  const [policy, setPolicy] = useState({
    maxBudget: 1000,
    preferredAgents: [] as string[],
    minTrust: 0,
  });

  const clickupDefaultListId = process.env.NEXT_PUBLIC_CLICKUP_LIST_ID || "";
  const n8nTaskCreatedWebhookId = process.env.NEXT_PUBLIC_N8N_TASK_CREATED_WEBHOOK_ID || "";
  const n8nTaskCompletedWebhookId = process.env.NEXT_PUBLIC_N8N_TASK_COMPLETED_WEBHOOK_ID || "";

  const commandRegistry = [
    {
      name: "help",
      description: "Show this help menu",
      handler: () => `Available commands:
help        Show this help menu
clear       Clear the terminal
time        Show current time
echo        Repeat text back
agent       Manage or inspect agents
team        Manage team bidding and negotiation
market      Inspect SteeleMarket jobs and earnings

Market subcommands:
market jobs
market earnings
market bids <jobId>
market simulate <jobId>
market negotiate <jobId>
market award <jobId>
market exec <jobId>
market policy show
market policy set maxBudget=500 minTrust=70 preferredAgents=a1,a2
market new "Title" --budget=200
market settle <jobId>

clickup new <listId> "Title"
clickup ls <listId>
clickup update <taskId> '{"status":"in progress"}'
clickup close <taskId>

db query "select * from jobs"
db insert jobs '{"title":"Test"}'
db logs

n8n workflows
n8n run <workflowId>
n8n trigger <webhookId> '{"key":"value"}'

presence ls
presence watch
presence agent <id>

broadcast send "hello agents"
broadcast watch

realtime on <table>
realtime off <table>`,
    },
    {
      name: "clear",
      description: "Clear the terminal",
      handler: () => {
        setHistory([]);
        return "";
      },
    },
    {
      name: "time",
      description: "Show current time",
      handler: () => new Date().toLocaleTimeString(),
    },
    {
      name: "echo",
      description: "Repeat text back",
      handler: (args: string[]) => args.join(" "),
    },
    {
      name: "agent",
      description: "Manage or inspect agents",
      handler: (args: string[]) => {
        const sub = args[0];

        if (!sub || sub === "ls") {
          return agents
            .map((a) => `${a.id}  ${a.name}  [${a.role}]  $${a.rate}/task`)
            .join("\n");
        }

        if (sub === "info" && args[1]) {
          const agent = agents.find((a) => a.id === args[1]);
          if (!agent) return `No such agent: ${args[1]}`;
          return [
            `id:   ${agent.id}`,
            `name: ${agent.name}`,
            `role: ${agent.role}`,
            `rate: $${agent.rate}/task`,
          ].join("\n");
        }

        if (sub === "bid") {
          const jobId = args[1];
          const priceFlag = args.find((a) => a.startsWith("--price"));
          const price = priceFlag ? Number(priceFlag.split("=")[1]) : null;

          if (!jobId || !price) {
            return `Usage: agent bid <jobId> --price=40`;
          }

          const job = jobs.find((j) => j.id === jobId);
          if (!job) return `No such job: ${jobId}`;

          const agentId = "a1";
          const newBid = { jobId, agentId, price };
          setBids((prev) => [...prev, newBid]);

          return [
            `Bid submitted`,
            `Job: ${jobId}`,
            `Agent: ${agentId}`,
            `Price: $${price}`,
          ].join("\n");
        }

        return "Usage:\nagent ls\nagent info <id>\nagent bid <jobId> --price=40";
      },
    },
    {
      name: "team",
      description: "Manage team bidding and negotiation",
      handler: (args: string[]) => {
        const sub = args[0];

        if (sub === "bid") {
          const jobId = args[1];
          const priceFlag = args.find((a) => a.startsWith("--price"));
          const price = priceFlag ? Number(priceFlag.split("=")[1]) : null;
          const teamId = args[2] || "t1";

          if (!jobId || !price) return `Usage: team bid <jobId> --price=120`;

          const team = teams.find((t) => t.id === teamId);
          if (!team) return `No such team: ${teamId}`;

          const newBid = {
            jobId,
            agentId: teamId,
            price,
            isTeam: true,
          };

          setBids((prev) => [...prev, newBid]);

          return [
            `Team bid submitted`,
            `Team: ${team.name}`,
            `Job: ${jobId}`,
            `Price: $${price}`,
          ].join("\n");
        }

        if (sub === "negotiate") {
          const jobId = args[1];
          if (!jobId) return `Usage: team negotiate <jobId>`;

          let jobBids = bids.filter((b) => b.jobId === jobId && b.isTeam);
          if (jobBids.length === 0) return `No team bids for job ${jobId}`;

          const rounds: string[] = [];

          for (let round = 1; round <= 3; round++) {
            const scored = jobBids.map((bid) => {
              const team = teams.find((t) => t.id === bid.agentId);
              const score = scoreBid(bid, team, policy);
              return { ...bid, score, team };
            });

            scored.sort((a, b) => b.score - a.score);
            const leader = scored[0];

            rounds.push(
              `Round ${round}:`,
              ...scored.map(
                (s) => `  ${s.agentId} → $${s.price} (score: ${s.score})`,
              ),
              `  Leader: ${leader.agentId} at $${leader.price}`,
              "",
            );

            jobBids = jobBids.map((b) =>
              b.agentId === leader.agentId
                ? b
                : { ...b, price: Math.max(b.price - 10, 1) },
            );
          }

          const finalScored = jobBids
            .map((bid) => {
              const entity =
                agents.find((a) => a.id === bid.agentId) ||
                teams.find((t) => t.id === bid.agentId);
              const score = scoreBid(bid, entity, policy);
              return { ...bid, score, entity };
            })
            .sort((a, b) => b.score - a.score);

          const winner = finalScored[0];

          return [
            `Team Negotiation for Job ${jobId}`,
            "",
            ...rounds,
            "Final outcome:",
            ...finalScored.map(
              (s) => `  ${s.agentId} → $${s.price} (score: ${s.score})`,
            ),
            "",
            `Winner (team): ${winner.agentId} at $${winner.price}`,
            "",
            `Use "market award ${jobId}" to assign this team.`,
          ].join("\n");
        }

        return "Usage:\nteam bid <jobId> --price=120 [teamId]\nteam negotiate <jobId>";
      },
    },
    {
      name: "db",
      description: "Run Supabase DB operations",
      handler: async (args: string[]) => {
        const sub = args[0];

        if (sub === "query") {
          const query = args.slice(1).join(" ");
          if (!query) return `Usage: db query "select * from jobs"`;
          const result = await dbQuery(query.replace(/^"|"$/g, ""));
          return JSON.stringify(result, null, 2);
        }

        if (sub === "insert") {
          const table = args[1];
          const recordString = args.slice(2).join(" ");
          if (!table || !recordString)
            return `Usage: db insert jobs '{\"title\":\"Test\"}'`;

          let record;
          try {
            record = JSON.parse(recordString);
          } catch {
            return `Invalid JSON record.`;
          }

          const result = await dbInsert(table, record);
          return JSON.stringify(result, null, 2);
        }

        if (sub === "logs") {
          const result = await dbLogs();
          return JSON.stringify(result, null, 2);
        }

        return 'Usage:\ndb query "select * from jobs"\ndb insert jobs \'{"title":"Test"}\'\ndb logs';
      },
    },
    {
      name: "clickup",
      description: "Interact with ClickUp tasks",
      handler: async (args: string[]) => {
        const sub = args[0];

        if (sub === "new") {
          const listId = args[1];
          const title = args.slice(2).join(" ").replace(/"/g, "");
          if (!listId || !title) return `Usage:\nclickup new <listId> "Title"`;

          const result = await clickup.createTask(listId, title);
          return JSON.stringify(result, null, 2);
        }

        if (sub === "ls") {
          const listId = args[1];
          if (!listId) return `Usage:\nclickup ls <listId>`;

          const result = await clickup.getTasks(listId);
          return JSON.stringify(result, null, 2);
        }

        if (sub === "close") {
          const taskId = args[1];
          if (!taskId) return `Usage:\nclickup close <taskId>`;

          const result = await clickup.closeTask(taskId);
          return JSON.stringify(result, null, 2);
        }

        if (sub === "update") {
          const taskId = args[1];
          const json = args.slice(2).join(" ");
          if (!taskId || !json)
            return `Usage:\nclickup update <taskId> '{"status":"in progress"}'`;

          let fields;
          try {
            fields = JSON.parse(json);
          } catch {
            return "Invalid JSON payload.";
          }

          const result = await clickup.updateTask(taskId, fields);

          const job = jobs.find((j) => j.clickupTaskId === taskId);
          if (job?.clickupTaskRowId) {
            try {
              await dbUpdate("tasks", job.clickupTaskRowId, {
                status: fields.status ?? (result as any).status,
                title: fields.name ?? (result as any).name,
                updated_at: new Date().toISOString(),
              });
            } catch {
              // best-effort sync, ignore failure here
            }
          }

          return JSON.stringify(result, null, 2);
        }

        return `Usage:\nclickup new <listId> "Title"\nclickup ls <listId>\nclickup update <taskId> '{"status":"in progress"}'\nclickup close <taskId>`;
      },
    },
    {
      name: "presence",
      description: "Inspect agent presence and status",
      handler: (args: string[]) => {
        const sub = args[0];
        const agentId = args[1];

        if (!sub || sub === "ls") {
          return presence
            .map(
              (item) =>
                `${item.agent_id}  ${item.status}  last seen ${new Date(
                  item.last_seen,
                ).toLocaleTimeString()}`,
            )
            .join("\n") || "No presence data yet.";
        }

        if (sub === "agent") {
          if (!agentId) return "Usage:\npresence agent <id>";
          const item = presence.find((p) => p.agent_id === agentId);
          if (!item) return `No presence record for ${agentId}`;
          return `agent_id: ${item.agent_id}\nstatus: ${item.status}\nlast_seen: ${item.last_seen}\nmetadata: ${JSON.stringify(item.metadata, null, 2)}`;
        }

        if (sub === "watch") {
          realtime.subscribe("agent_presence", (payload) => {
            addToHistory(`Presence event: ${JSON.stringify(payload)}`);
          });
          return "Watching agent_presence events.";
        }

        return `Usage:\npresence ls\npresence watch\npresence agent <id>`;
      },
    },
    {
      name: "broadcast",
      description: "Send and watch agent broadcast signals",
      handler: async (args: string[]) => {
        const sub = args[0];
        const message = args.slice(1).join(" ");

        if (sub === "send") {
          if (!message) return `Usage:\nbroadcast send "hello agents"`;
          await realtime.sendBroadcast("signal", {
            from: "terminal",
            message: message.replace(/"/g, ""),
            timestamp: new Date().toISOString(),
          });
          return `Broadcast sent: ${message}`;
        }

        if (sub === "watch") {
          realtime.subscribeBroadcast("signal", (payload) => {
            setBroadcastMessages((prev) => [...prev, payload]);
            addToHistory(`Broadcast received: ${JSON.stringify(payload)}`);
          });
          return "Watching broadcast signals.";
        }

        return `Usage:\nbroadcast send "hello agents"\nbroadcast watch`;
      },
    },
    {
      name: "realtime",
      description: "Manage Supabase real-time channels",
      handler: (args: string[]) => {
        const sub = args[0];
        const table = args[1];

        if (sub === "on") {
          if (!table) return "Usage:\nrealtime on <table>";
          realtime.subscribe(table, (payload) => {
            addToHistory(`Realtime ${table}: ${JSON.stringify(payload)}`);
          });
          return `Subscribed to ${table}`;
        }

        if (sub === "off") {
          if (!table) return "Usage:\nrealtime off <table>";
          realtime.unsubscribe(table);
          return `Unsubscribed from ${table}`;
        }

        return `Usage:\nrealtime on <table>\nrealtime off <table>`;
      },
    },
    {
      name: "n8n",
      description: "Inspect and trigger n8n workflows",
      handler: async (args: string[]) => {
        const sub = args[0];

        if (sub === "workflows") {
          const result = await n8n.listWorkflows();
          return JSON.stringify(result, null, 2);
        }

        if (sub === "run") {
          const workflowId = args[1];
          if (!workflowId) return `Usage: n8n run <workflowId>`;

          const result = await n8n.runWorkflow(workflowId);
          return JSON.stringify(result, null, 2);
        }

        if (sub === "trigger") {
          const webhookId = args[1];
          const payloadString = args.slice(2).join(" ");
          if (!webhookId)
            return `Usage: n8n trigger <webhookId> '{"key":"value"}'`;

          let payload = {};
          if (payloadString) {
            try {
              payload = JSON.parse(payloadString);
            } catch {
              return "Invalid JSON payload.";
            }
          }

          const result = await n8n.triggerWebhook(webhookId, payload);
          return JSON.stringify(result, null, 2);
        }

        return 'Usage:\nn8n workflows\nn8n run <workflowId>\nn8n trigger <webhookId> \'{"key":"value"}\'';
      },
    },
    {
      name: "market",
      description: "Inspect SteeleMarket jobs and earnings",
      handler: (args: string[]) => {
        const sub = args[0];

        if (!sub || sub === "jobs") {
          return jobs
            .map((j) => `${j.id}  ${j.title}  [${j.status}]  $${j.budget}`)
            .join("\n");
        }

        if (sub === "earnings") {
          const total = jobs.reduce((sum, j) => sum + j.budget, 0);
          const platformCut = total * 0.03;
          return [
            `Total job volume: $${total.toFixed(2)}`,
            `Platform cut (3%): $${platformCut.toFixed(2)}`,
          ].join("\n");
        }

        if (sub === "bids") {
          const jobId = args[1];
          if (!jobId) return `Usage: market bids <jobId>`;

          const jobBids = bids.filter((b) => b.jobId === jobId);
          if (jobBids.length === 0) return `No bids for job ${jobId}`;

          return jobBids.map((b) => `${b.agentId} → $${b.price}`).join("\n");
        }

        if (sub === "policy") {
          const action = args[1];

          if (!action || action === "show") {
            return [
              "Current policy:",
              `  maxBudget: ${policy.maxBudget}`,
              `  preferredAgents: ${policy.preferredAgents.join(", ") || "(none)"}`,
              `  minTrust: ${policy.minTrust}`,
            ].join("\n");
          }

          if (action === "set") {
            const updates: any = {};

            args.slice(2).forEach((arg) => {
              if (arg.startsWith("maxBudget=")) {
                updates.maxBudget = Number(arg.split("=")[1]);
              } else if (arg.startsWith("minTrust=")) {
                updates.minTrust = Number(arg.split("=")[1]);
              } else if (arg.startsWith("preferredAgents=")) {
                updates.preferredAgents = arg
                  .split("=")[1]
                  .split(",")
                  .map((s) => s.trim());
              }
            });

            setPolicy((prev) => ({ ...prev, ...updates }));

            return "Policy updated.\nUse: market policy show";
          }

          return "Usage:\nmarket policy show\nmarket policy set maxBudget=500 minTrust=70 preferredAgents=a1,a2";
        }

        if (sub === "simulate") {
          const jobId = args[1];
          if (!jobId) return `Usage: market simulate <jobId>`;

          const job = jobs.find((j) => j.id === jobId);
          if (!job) return `No such job: ${jobId}`;

          const jobBids = bids.filter((b) => b.jobId === jobId);
          if (jobBids.length === 0) return `No bids for job ${jobId}`;

          const scored = jobBids.map((bid) => {
            const entity =
              agents.find((a) => a.id === bid.agentId) ||
              teams.find((t) => t.id === bid.agentId);
            const score = scoreBid(bid, entity, policy);
            return { ...bid, score, entity };
          });

          const winner = scored.sort((a, b) => b.score - a.score)[0];

          return [
            `Negotiation Simulation for Job ${jobId}`,
            `Title: ${job.title}`,
            ``,
            `Bids:`,
            ...scored.map(
              (s) => `  ${s.agentId} → $${s.price} (score: ${s.score})`,
            ),
            ``,
            `Winner (simulated):`,
            `  Agent: ${winner.agentId}`,
            `  Price: $${winner.price}`,
            `  Score: ${winner.score}`,
            ``,
            `Use "market award ${jobId}" to assign this agent.`,
          ].join("\n");
        }

        if (sub === "award") {
          const jobId = args[1];
          if (!jobId) return `Usage: market award <jobId>`;

          const job = jobs.find((j) => j.id === jobId);
          if (!job) return `No such job: ${jobId}`;

          const jobBids = bids.filter((b) => b.jobId === jobId);
          if (jobBids.length === 0) return `No bids for job ${jobId}`;

          const scored = jobBids.map((bid) => {
            const entity =
              agents.find((a) => a.id === bid.agentId) ||
              teams.find((t) => t.id === bid.agentId);
            const score = scoreBid(bid, entity, policy);
            return { ...bid, score, entity };
          });

          const winner = scored.sort((a, b) => b.score - a.score)[0];

          const updated = jobs.map((j) =>
            j.id === jobId
              ? { ...j, assignedTo: winner.agentId, status: "running" }
              : j,
          );

          setJobs(updated);

          // Reverse mapping: Update ClickUp task to "in progress"
          const awardedJob = updated.find((j) => j.id === jobId);
          if (awardedJob) {
            try {
              await awardJobToTask(awardedJob);
            } catch (error) {
              console.error("Failed to update ClickUp task:", error);
            }
          }

          let clickupMessage =
            "ClickUp sync skipped because no list id is configured.";
          let clickupTaskId: string | null = null;
          let clickupTaskRowId: string | null = null;

          if (clickupDefaultListId) {
            try {
              const task = await clickup.createTask(
                clickupDefaultListId,
                `Job ${jobId}: ${job.title}`,
                `Awarded to ${winner.agentId}`,
              );
              clickupTaskId = task.id;
              clickupMessage = `ClickUp task created: ${clickupTaskId}`;

              const dbResult = await dbInsert("tasks", {
                clickup_id: task.id,
                title: task.name || `Job ${jobId}`,
                status: task.status || "open",
                job_id: jobId,
                created_at: new Date().toISOString(),
              });

              if (Array.isArray(dbResult) && dbResult[0]?.id) {
                clickupTaskRowId = String(dbResult[0].id);
              }

              if (clickupTaskId && n8nTaskCreatedWebhookId) {
                try {
                  await n8n.triggerWebhook(n8nTaskCreatedWebhookId, {
                    jobId,
                    clickupTaskId,
                    title: task.name || job.title,
                    status: task.status || "open",
                    assignedTo: winner.agentId,
                  });
                  clickupMessage += `; n8n task-created webhook triggered.`;
                } catch (error) {
                  const message =
                    error instanceof Error ? error.message : String(error);
                  clickupMessage += `; n8n webhook failed: ${message}`;
                }
              }
${clickupMessage}`,
          ].join("\n");
        }

        if (sub === "negotiate") {
          const jobId = args[1];
          if (!jobId) return `Usage: market negotiate <jobId>`;

          const job = jobs.find((j) => j.id === jobId);
          if (!job) return `No such job: ${jobId}`;

          let jobBids = bids.filter((b) => b.jobId === jobId);
          if (jobBids.length === 0) return `No bids for job ${jobId}`;

          const rounds: string[] = [];

          for (let round = 1; round <= 3; round++) {
            const scored = jobBids.map((bid) => {
              const entity =
                agents.find((a) => a.id === bid.agentId) ||
                teams.find((t) => t.id === bid.agentId);
              const score = scoreBid(bid, entity, policy);
              return { ...bid, score, entity };
            });

            scored.sort((a, b) => b.score - a.score);
            const leader = scored[0];

            rounds.push(
              `Round ${round}:`,
              ...scored.map(
                (s) => `  ${s.agentId} → $${s.price} (score: ${s.score})`,
              ),
              `  Leader: ${leader.agentId} at $${leader.price}`,
              "",
            );

            jobBids = jobBids.map((b) => {
              if (b.agentId === leader.agentId) return b;
              return { ...b, price: Math.max(b.price - 5, 1) };
            });
          }

          const finalScored = jobBids
            .map((bid) => {
              const entity =
                agents.find((a) => a.id === bid.agentId) ||
                teams.find((t) => t.id === bid.agentId);
              const score = scoreBid(bid, entity, policy);
              return { ...bid, score, entity };
            })
            .sort((a, b) => b.score - a.score);

          const winner = finalScored[0];

          return [
            `Negotiation for Job ${jobId}`,
            `Title: ${job.title}`,
            ``,
            ...rounds,
            `Final outcome:`,
            ...finalScored.map(
              (s) => `  ${s.agentId} → $${s.price} (score: ${s.score})`,
            ),
            ``,
            `Winner (simulated): ${winner.agentId} at $${winner.price} (score: ${winner.score})`,
            ``,
            `Policy in effect:`,
            `  maxBudget=${policy.maxBudget}`,
            `  minTrust=${policy.minTrust}`,
            `  preferredAgents=${policy.preferredAgents.join(", ") || "(none)"}`,
            ``,
            `Use "market award ${jobId}" to assign this agent.`,
          ].join("\n");
        }

        if (sub === "new") {
          const title = args[1];
          const budgetFlag = args.find((a) => a.startsWith("--budget"));
          const budget = budgetFlag ? Number(budgetFlag.split("=")[1]) : 0;

          if (!title) return `Usage: market new "Title" --budget=200`;
          if (!budget) return `Missing or invalid budget. Use --budget=200`;

          const id = "j" + (jobs.length + 1);
          const newJob = {
            id,
            title: title.replace(/"/g, ""),
            status: "pending",
            budget,
            assignedTo: null,
            settled: false,
          };

          setJobs((prev) => [...prev, newJob]);

          return `Created job ${id}\nTitle: ${newJob.title}\nBudget: $${newJob.budget}`;
        }

        if (sub === "exec") {
          const jobId = args[1];
          if (!jobId) return `Usage: market exec <jobId>`;

          const job = jobs.find((j) => j.id === jobId);
          if (!job) return `No such job: ${jobId}`;
          if (!job.assignedTo)
            return `Job ${jobId} has no assigned agent/team.`;

          const current = execution[jobId] || { progress: 0, logs: [] };
          const newProgress = Math.min(current.progress + 25, 100);
          const newLog = `Progress ${newProgress}% by ${job.assignedTo}`;

          const updated = {
            ...execution,
            [jobId]: {
              progress: newProgress,
              logs: [...current.logs, newLog],
            },
          };

          setExecution(updated);

          return [
            `Execution for Job ${jobId}`,
            `Assigned to: ${job.assignedTo}`,
            `Progress: ${newProgress}%`,
            "",
            "Logs:",
            ...updated[jobId].logs.map((l) => `  ${l}`),
            "",
            newProgress === 100
              ? `Job ${jobId} is ready for settlement.`
              : `Run "market exec ${jobId}" again to continue.`,
          ].join("\n");
        }

        if (sub === "settle") {
          const jobId = args[1];
          if (!jobId) return `Usage: market settle <jobId>`;

          const job = jobs.find((j) => j.id === jobId);
          if (!job) return `No such job: ${jobId}`;
          if (!job.assignedTo) return `Job ${jobId} has no assigned agent.`;
          if (job.settled) return `Job ${jobId} is already settled.`;

          const clickupTaskId = job.clickupTaskId;
          const clickupTaskRowId = job.clickupTaskRowId;
          const notifications: string[] = [];

          if (clickupTaskId) {
            try {
              await clickup.closeTask(clickupTaskId);
              notifications.push(`ClickUp task ${clickupTaskId} closed.`);
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              notifications.push(`ClickUp close failed: ${message}`);
            }
          }

          if (clickupTaskRowId) {
            try {
              await dbUpdate("tasks", clickupTaskRowId, {
                status: "complete",
                updated_at: new Date().toISOString(),
              });
              notifications.push(
                `Supabase task row ${clickupTaskRowId} updated.`,
              );
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              notifications.push(`Supabase update failed: ${message}`);
            }
          }

          if (clickupTaskId && n8nTaskCompletedWebhookId) {
            try {
              await n8n.triggerWebhook(n8nTaskCompletedWebhookId, {
                jobId,
                clickupTaskId,
                status: "complete",
                assignedTo: job.assignedTo,
              });
              notifications.push(`n8n completion webhook triggered.`);
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              notifications.push(`n8n completion webhook failed: ${message}`);
            }
          }

          const updated = jobs.map((j) =>
            j.id === jobId ? { ...j, status: "completed", settled: true } : j,
          );

          setJobs(updated);

          // Reverse mapping: Close ClickUp task
          const settledJob = updated.find((j) => j.id === jobId);
          if (settledJob) {
            try {
              await settleJobToTask(settledJob);
            } catch (error) {
              console.error("Failed to close ClickUp task:", error);
            }
          }

          const platformCut = job.budget * 0.03;
          const agentPayout = job.budget - platformCut;

          return [
            `Settled job ${jobId}`,
            `Title: ${job.title}`,
            `Agent: ${job.assignedTo}`,
            `Status: completed`,
            ``,
            `Escrow Released:`,
            `  Agent payout: $${agentPayout.toFixed(2)}`,
            `  Platform cut (3%): $${platformCut.toFixed(2)}`,
            ``,
            `Reputation updated for agent ${job.assignedTo}`,
            ...notifications,
          ].join("\n");
        }

        return 'Usage:\nmarket jobs\nmarket earnings\nmarket bids <jobId>\nmarket simulate <jobId>\nmarket negotiate <jobId>\nmarket exec <jobId>\nmarket award <jobId>\nmarket policy show\nmarket policy set maxBudget=500 minTrust=70 preferredAgents=a1,a2\nmarket new "Title" --budget=200\nmarket settle <jobId>';
      },
    },
  ];

  const runCommand = async (cmd: string) => {
    const parts = cmd.split(" ").filter(Boolean);
    const base = parts[0];
    const args = parts.slice(1);
    const entry = commandRegistry.find((item) => item.name === base);

    if (!entry) return `Command not found: ${cmd}`;
    return await entry.handler(args);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    const output = await runCommand(trimmed);
    if (output) {
      addToHistory(`> ${input}`);
      addToHistory(output.split('\n'));
    }
    setInput("");
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    realtime.subscribe("jobs", (payload) => {
      console.log("Job event:", payload);
      addToHistory(`Realtime jobs event: ${payload.eventType}`);

      if (payload.eventType === "INSERT") {
        setJobs((prev) => [...prev, payload.new]);
      }

      if (payload.eventType === "UPDATE") {
        setJobs((prev) =>
          prev.map((j) => (j.id === payload.new.id ? payload.new : j)),
        );
      }
    });

    realtime.subscribe("agent_logs", (payload) => {
      console.log("Agent log:", payload);
      setLogs((prev) => [...prev, payload.new]);
      addToHistory(`Realtime agent_log: ${JSON.stringify(payload.new)}`);
    });

    const unsubscribeClickUp = agents.onClickUpEvent(async (payload) => {
      const event = payload.event;
      const task = payload.task;

      if (event === "taskCreated") {
        // Find the mapped job
        const job = jobs.find((j) => j.clickup_id === task?.id);
        if (job) {
          // Auto-bid with logic
          const mockAgent = agents.find((a) => a.id === "a1") || {
            id: "a1",
            name: "Agent 1",
            role: "developer",
            rate: 50,
            trust: 85,
            latency: 10,
            skills: ["coding", "api", "database"],
          };

          const bid = await agentLogic.autoBid(job, mockAgent, bids.filter(b => b.jobId === job.id));
          if (bid) {
            setBids((prev) => [...prev, bid]);
            addToHistory(`Auto-bid placed: $${bid.price} for job ${job.id} by ${bid.agentId}`);
          }
        }
        addToHistory(`Agent reaction: New task ${task?.name} - auto-bidding initiated`);
      }

      if (event === "taskUpdated") {
        const job = jobs.find((j) => j.clickup_id === task?.id);
        if (job) {
          const currentBid = bids.find(b => b.jobId === job.id && b.agentId === "a1");
          const adjustment = await agentLogic.adjustStrategy(job, payload, currentBid);
          if (adjustment.action === "update_bid" && adjustment.newBid) {
            setBids((prev) => prev.map(b => b.jobId === job.id && b.agentId === "a1" ? adjustment.newBid! : b));
            addToHistory(`Strategy adjusted: Updated bid to $${adjustment.newBid!.price} for job ${job.id}`);
          }
        }
        addToHistory(`Agent reaction: Task ${task?.name} updated - strategy adjusted`);
      }

      if (event === "taskClosed") {
        const job = jobs.find((j) => j.clickup_id === task?.id);
        if (job) {
          const success = job.status === "completed";
          await agentLogic.learnFromOutcome(job, { id: "a1", name: "Agent 1", role: "developer", rate: 50 }, success);
        }
        addToHistory(`Agent reaction: Task ${task?.name} closed - learning from outcome`);
      }
    });

    return () => {
      realtime.unsubscribe("jobs");
      realtime.unsubscribe("agent_logs");
      unsubscribeClickUp();
    };
  }, []);

  return (
    <div className="w-full h-full bg-black text-green-400 font-mono p-4 overflow-y-auto">
      {history.map((line, i) => (
        <div key={i} className="whitespace-pre-wrap">
          {line}
        </div>
      ))}

      <form onSubmit={onSubmit} className="flex gap-2 mt-2">
        <span>&gt;</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent outline-none text-green-400"
          autoFocus
        />
      </form>
    </div>
  );
}
