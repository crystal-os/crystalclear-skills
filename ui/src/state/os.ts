import { create } from "zustand";

export const useOS = create((set) => ({
  activePanel: "terminal",
  setActivePanel: (panel) => set({ activePanel: panel }),

  jobs: [],
  setJobs: (jobs) => set({ jobs }),

  tasks: [],
  setTasks: (tasks) => set({ tasks }),

  agents: [],
  setAgents: (agents) => set({ agents }),

  logs: [],
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),

  terminalOutput: [],
  addTerminalOutput: (line) =>
    set((state) => ({
      terminalOutput: [...state.terminalOutput, line],
    })),

  terminalHistory: [],
  addTerminalHistory: (entry) =>
    set((state) => ({
      terminalHistory: [...state.terminalHistory, entry],
    })),
  setTerminalHistory: (history) => set({ terminalHistory: history }),
}));
