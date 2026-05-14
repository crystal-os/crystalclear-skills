"use client";
import { supabase } from "@/lib/providers/supabase";
import { useOS } from "@/state/os";
import { useEffect } from "react";

export function OSProvider({ children }) {
  const { setJobs, setTasks, setAgents, addLog } = useOS();

  useEffect(() => {
    // Initial fetch
    const fetchInitial = async () => {
      try {
        const { data: jobs } = await supabase.from("jobs").select("*");
        const { data: tasks } = await supabase.from("tasks").select("*");
        const { data: agents } = await supabase
          .from("agent_presence")
          .select("*");

        setJobs(jobs || []);
        setTasks(tasks || []);
        setAgents(agents || []);
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      }
    };

    fetchInitial();

    // Realtime: jobs
    supabase
      .channel("jobs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs" },
        (payload) => {
          fetchInitial();
        },
      )
      .subscribe();

    // Realtime: tasks
    supabase
      .channel("tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => fetchInitial(),
      )
      .subscribe();

    // Realtime: agent presence
    supabase
      .channel("agent_presence")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_presence" },
        () => fetchInitial(),
      )
      .subscribe();

    // Realtime: execution logs
    supabase
      .channel("execution_logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "execution_logs" },
        (payload) => addLog(payload.new),
      )
      .subscribe();

    // Boot TerminalEngine (already initialized in component)
  }, []);

  return <>{children}</>;
}
