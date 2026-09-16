import type { 
  MechanicsData, 
  Difficulty, 
  NPCAlly, 
  PCProfile, 
  GMSetup,
  Job,
  AdviceJob,
  Enemy,
  GMAdviceReport,
  GMAdviceRequest
} from "../server/types";

export type { 
  MechanicsData, 
  Difficulty, 
  NPCAlly, 
  PCProfile, 
  GMSetup,
  Job,
  AdviceJob,
  Enemy,
  GMAdviceReport,
  GMAdviceRequest
};

export interface CreateSessionRequest {
  clientName: string;
  data: GMSetup;
}

export interface QueuedSession {
  id: string;
  sessionType?: "encounter" | "advice";
  title?: string;
  clientName: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  status: "new" | "reviewed" | "processing" | "completed" | "archived";
  data?: GMSetup;
  finalState?: any;
  adviceRequest?: GMAdviceRequest;
  adviceReport?: GMAdviceReport;
  jobId?: string;
  ownerId?: string;
}

export interface ForgeLog {
  timestamp: string;
  botId: string;
  botName: string;
  level: "info" | "warn" | "error" | "success" | "system";
  message: string;
  reasoning?: string;
}

export interface ForgeTelemetry {
  partyEHP: number;
  partyDPR: number;
  novaPotential: number;
  killClock: number;
  lethality: number;
  novaRisk: "low" | "medium" | "high" | "critical";
}

export interface PipelineStep {
  id: string;
  name: string;
  bot: string;
  task: string;
  status: "pending" | "processing" | "completed" | "error" | "rate_limited";
  log?: string;
  output?: any;
  telemetry?: Partial<ForgeTelemetry>;
}

export interface EncounterResult {
  id?: string;
  htmlContent: string;
  mathExplanation: string;
  mechanics?: MechanicsData & { 
    target_difficulty: string;
    is_dpr_estimated?: boolean;
    is_ac_estimated?: boolean;
    is_hp_estimated?: boolean;
  };
  validation?: {
    passed: boolean;
    report: string;
    simulation_warnings?: string[];
    phase_duration_audit?: any[];
  };
  phase_breakdown?: Record<string, { id: string, ehp: number }[]>;
}

export const PIPELINE_SEQUENCE = [
  { id: "BOT_0_BRIEFING", name: "Briefing Officer", bot: "Bot 0", task: "MCD Generation" },
  { id: "BOT_6_PROFILER", name: "Party Profiler", bot: "Bot 6", task: "Party Power Profile" },
  { id: "BOT_4_BALANCE", name: "Balance Analyst", bot: "Bot 4", task: "Mechanics Block" },
  { id: "BOT_2_CARTOGRAPHER", name: "Tactical Cartographer", bot: "Bot 2", task: "Zone Map & Timeline" },
  { id: "BOT_3_MECHANIST", name: "Lead Mechanist", bot: "Bot 3", task: "Actor Scripts & Initiative" },
  { id: "BOT_1_NARRATIVE", name: "Narrative Architect", bot: "Bot 1", task: "Flavor & Read-Aloud" },
  { id: "BOT_5_AUDITOR", name: "Editor / Auditor", bot: "Bot 5", task: "Cross-Bot Validation" },
  { id: "BOT_9_SUMMARIST", name: "Tactical Summarist", bot: "Bot 9", task: "Tactical Summary" },
  { id: "BOT_8_PUBLISHER", name: "Grimoire Publisher", bot: "Bot 8", task: "Digital Grimoire Export" },
  { id: "BOT_10_STYLIST", name: "Cinematic Stylist", bot: "Bot 10", task: "Visual Styling & Polish" },
] as const;
