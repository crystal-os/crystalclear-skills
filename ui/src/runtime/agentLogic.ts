// Agent logic for auto-bidding and strategy adjustment

interface Agent {
  id: string;
  name: string;
  role: string;
  rate: number;
  trust?: number;
  latency?: number;
  skills?: string[];
}

interface Job {
  id: string;
  title: string;
  budget: number;
  status: string;
  clickup_id?: string;
}

interface Bid {
  jobId: string;
  agentId: string;
  price: number;
  strategy?: string;
}

export const agentLogic = {
  // Auto-bid on new jobs based on agent capabilities
  async autoBid(
    job: Job,
    agent: Agent,
    existingBids: Bid[],
  ): Promise<Bid | null> {
    // Check if agent is suitable for the job
    if (!this.isSuitableForJob(job, agent)) {
      return null;
    }

    // Calculate competitive bid
    const baseBid = this.calculateBaseBid(job, agent);
    const adjustedBid = this.adjustForCompetition(baseBid, existingBids, agent);

    // Ensure bid is profitable
    if (adjustedBid >= job.budget * 0.9) {
      return null; // Too high, skip
    }

    return {
      jobId: job.id,
      agentId: agent.id,
      price: Math.round(adjustedBid),
      strategy: "auto-competitive",
    };
  },

  // Adjust strategy based on task updates
  async adjustStrategy(
    job: Job,
    taskUpdate: any,
    currentBid?: Bid,
  ): Promise<{ action: string; newBid?: Bid }> {
    const event = taskUpdate.event;

    if (event === "taskUpdated" && taskUpdate.task?.status === "in progress") {
      // Task started, increase bid competitiveness if not awarded
      if (!job.assignedTo && currentBid) {
        const newPrice = Math.round(currentBid.price * 0.95); // 5% lower
        return {
          action: "update_bid",
          newBid: { ...currentBid, price: newPrice },
        };
      }
    }

    if (event === "taskClosed") {
      // Task completed, learn from outcome
      return { action: "learn_outcome" };
    }

    return { action: "no_change" };
  },

  // Check if agent is suitable for job
  isSuitableForJob(job: Job, agent: Agent): boolean {
    // Simple keyword matching - in production, use embeddings
    const jobKeywords = job.title.toLowerCase().split(" ");
    const agentSkills = agent.skills || [agent.role.toLowerCase()];

    return jobKeywords.some((keyword) =>
      agentSkills.some(
        (skill) => skill.includes(keyword) || keyword.includes(skill),
      ),
    );
  },

  // Calculate base bid
  calculateBaseBid(job: Job, agent: Agent): number {
    const baseRate = agent.rate || 50; // Default rate
    const estimatedHours = this.estimateHours(job);
    const baseBid = baseRate * estimatedHours;

    // Adjust for trust and latency
    const trustMultiplier = (agent.trust || 80) / 100;
    const latencyPenalty = (agent.latency || 0) * 0.1;

    return baseBid * trustMultiplier - latencyPenalty;
  },

  // Adjust bid based on competition
  adjustForCompetition(
    baseBid: number,
    existingBids: Bid[],
    agent: Agent,
  ): number {
    if (existingBids.length === 0) return baseBid;

    const lowestBid = Math.min(...existingBids.map((b) => b.price));
    const averageBid =
      existingBids.reduce((sum, b) => sum + b.price, 0) / existingBids.length;

    // If lowest bid is much lower, don't compete
    if (lowestBid < baseBid * 0.7) return baseBid;

    // Otherwise, bid slightly below average
    return Math.min(baseBid, averageBid * 0.95);
  },

  // Estimate hours for job
  estimateHours(job: Job): number {
    // Simple estimation based on budget and typical rates
    const typicalRate = 50; // $50/hour
    return Math.max(1, Math.round(job.budget / typicalRate));
  },

  // Learn from completed jobs
  async learnFromOutcome(job: Job, agent: Agent, success: boolean) {
    // Update agent trust/latency based on performance
    // In production, store in database
    console.log(
      `Learning: Agent ${agent.id} ${success ? "succeeded" : "failed"} on job ${job.id}`,
    );
  },
};
