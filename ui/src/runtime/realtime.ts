import { supabase } from "@/lib/providers/supabaseClient";

type Callback = (payload: any) => void;

export const realtime = {
  channels: {} as Record<string, any>,
  broadcastChannel: null as any,

  subscribe(table: string, callback: Callback) {
    if (!supabase) {
      throw new Error("Supabase client is not initialized.");
    }

    const channel = supabase
      .channel(`table:${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload: any) => callback(payload),
      )
      .subscribe();

    this.channels[table] = channel;
  },

  unsubscribe(table: string) {
    const channel = this.channels[table];
    if (channel) {
      supabase.removeChannel(channel);
      delete this.channels[table];
    }
  },

  async heartbeat(agent: {
    agent_id: string;
    status: string;
    metadata: Record<string, unknown>;
  }) {
    if (!supabase) {
      throw new Error("Supabase client is not initialized.");
    }

    return supabase.from("agent_presence").upsert(
      {
        agent_id: agent.agent_id,
        status: agent.status,
        last_seen: new Date().toISOString(),
        metadata: agent.metadata,
      },
      { onConflict: "agent_id" },
    );
  },

  async getBroadcastChannel() {
    if (!supabase) {
      throw new Error("Supabase client is not initialized.");
    }

    if (!this.broadcastChannel) {
      this.broadcastChannel = supabase.channel("agent-broadcast");
      await this.broadcastChannel.subscribe();
    }

    return this.broadcastChannel;
  },

  async subscribeBroadcast(event: string, callback: Callback) {
    const channel = await this.getBroadcastChannel();
    channel.on("broadcast", { event }, (payload: any) => callback(payload));
    this.channels[`broadcast:${event}`] = channel;
  },

  unsubscribeBroadcast(event: string) {
    const key = `broadcast:${event}`;
    const channel = this.channels[key] || this.broadcastChannel;
    if (channel) {
      supabase.removeChannel(channel);
      delete this.channels[key];
      if (this.broadcastChannel === channel) {
        this.broadcastChannel = null;
      }
    }
  },

  async sendBroadcast(event: string, payload: any) {
    const channel = await this.getBroadcastChannel();
    await channel.send({ type: "broadcast", event, payload });
  },
};
