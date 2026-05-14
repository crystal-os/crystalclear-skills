type AgentCallback = (payload: any) => void;

const listeners = new Map<string, Set<AgentCallback>>();

export const agents = {
  subscribe(event: string, callback: AgentCallback) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)?.add(callback);
  },

  unsubscribe(event: string, callback: AgentCallback) {
    listeners.get(event)?.delete(callback);
  },

  broadcast(event: string, payload: any) {
    listeners.get(event)?.forEach((callback) => {
      try {
        callback(payload);
      } catch (error) {
        console.error(`Agent event handler failed for ${event}:`, error);
      }
    });
  },

  onClickUpEvent(callback: AgentCallback) {
    this.subscribe("clickup_event", callback);
    return () => this.unsubscribe("clickup_event", callback);
  },

  onNotionEvent(callback: AgentCallback) {
    this.subscribe("notion_event", callback);
    return () => this.unsubscribe("notion_event", callback);
  },
};
