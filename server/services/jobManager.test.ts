import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobManager } from "./jobManager.js";
import { JobContractError } from "./jobErrors.js";
import { PersistenceService } from "./persistenceService.js";
import { ZodCreateSessionRequestSchema, ZodGMSetupSchema, ZodGenerateJobRequestSchema, type GMSetup } from "../types.js";

vi.mock("./persistenceService.js", () => ({
  PersistenceService: {
    loadAllJobs: vi.fn(() => new Map()),
    loadSessions: vi.fn(() => []),
    saveJob: vi.fn().mockResolvedValue(undefined),
    deleteJob: vi.fn(),
    saveSessions: vi.fn()
  }
}));

vi.mock("./orchestrator.js", () => ({
  PIPELINE_SEQUENCE: [
    { id: "BOT_0_BRIEFING", label: "Briefing" },
    { id: "BOT_6_PROFILER", label: "Profiler" }
  ],
  runOrchestrator: vi.fn().mockResolvedValue({ publisher_output: "<h1>Moon Gate</h1>" })
}));

vi.mock("./handlers/gmAdvisorHandler.js", () => ({
  GMAdviceHandler: {
    generate: vi.fn().mockResolvedValue({
      party_vulnerability_profile: {
        collective_weaknesses: ["Low ranged pressure"],
        nova_ceiling_outlook: "Moderate"
      },
      tactical_combat_breakdown: {
        role_assignments: [],
        action_economy_verdict: "Stable"
      },
      pacing_sandbox: {
        level: 5,
        dpr_bounds: { min: 20, max: 50 },
        anchor_hp_floor: 100,
        tactical_guidelines: [],
        environmental_recommendations: [],
        budget_allocations: [],
        enemy_tactical_counters: []
      },
      player_specific_ledger: [],
      threat_windows: {
        encounters_before_short_rest: 2,
        encounters_before_long_rest: 5,
        rest_economy_rationale: "Standard"
      },
      mechanical_threshold: {
        level: 5,
        party_sustained_dpr: 30,
        dominant_cr_tier: "CR 5-10",
        monster_avg_save_bonus: 2,
        required_dc_for_50pct: 13,
        threshold_crossover: false
      },
      nova_recoil_engine: {
        level: 5,
        post_nova_sustained_dpr: 30,
        nova_threshold: 40,
        secondary_wave_trigger: "Bloodied",
        resource_depletion_note: "Limited"
      },
      rest_economy_throttle: {
        level: 5,
        slot_drain_per_encounter_pct: 20,
        encounters_to_short_rest: 2,
        encounters_to_long_rest: 5
      },
      attrition_wave_scales: {
        waves_to_force_long_rest: 5,
        wave_hp_budget: 25,
        ability_drain_threshold_note: "After several waves"
      }
    })
  }
}));

const validSetup: GMSetup = {
  sessionName: "Moon Gate",
  setting: "A ruined observatory",
  tone: "Heroic",
  targetExperience: "Heroic",
  partyArchetype: "Balanced Group",
  difficulty: "Hard",
  encounterStructure: "Wave",
  objective: "Seal the gate",
  oneFightDay: false,
  pcs: [
    {
      id: "pc-1",
      name: "Thane",
      className: "Fighter",
      level: 5,
      weaponMasteries: "Push",
      role: "Frontline",
      reactionDensity: "low",
      majorMagicItemsCount: 0
    }
  ],
  allies: [],
  enemies: [
    {
      id: "enemy-1",
      name: "Gate Warden",
      type: "Elite",
      description: "Arcane sentinel",
      quantity: 1,
      isStatLocked: false,
      isFragile: false
    }
  ],
  socialOut: false,
  targetRounds: 4,
  encounterCount: 1,
  entryCondition: "fresh",
  targetOutcome: "heavy_tax",
  letDiceFall: false,
  allowExtraMinions: true,
  combatStyle: "Standard Brawl",
  failureConsequence: "narrative_setback",
  inspirationVelocity: "low",
  toyList: [],
  primaryMaterial: "Stone",
  licensingMode: "None",
  exportPriority: "Standard"
};

describe("JobManager ownership helpers", () => {
  let manager: JobManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = JobManager.getInstance();
    (manager as any).jobStore = new Map();
    (manager as any).sessionStore = new Map();
    (manager as any).activeClaims = new Set();
    (manager as any).isShuttingDown = false;
  });

  it("filters jobs by authenticated ownerId", async () => {
    const ownerAJobId = await manager.createJob({ setup: validSetup, ownerId: "owner-a" });
    const ownerBJobId = await manager.createJob({ setup: validSetup, ownerId: "owner-b" });
    await manager.createJob({ setup: validSetup });

    const ownerAJobs = manager.listJobsForOwner("owner-a");

    expect(ownerAJobs).toHaveLength(1);
    expect(ownerAJobs[0].id).toBe(ownerAJobId);
    expect(manager.getJobForOwner(ownerAJobId, "owner-a")?.id).toBe(ownerAJobId);
    expect(manager.getJobForOwner(ownerBJobId, "owner-a")).toBeUndefined();
  });

  it("does not expose ownerless jobs through owner-scoped helpers", async () => {
    const ownerlessJobId = await manager.createJob({ setup: validSetup });

    expect(manager.getJob(ownerlessJobId)?.id).toBe(ownerlessJobId);
    expect(manager.getJobForOwner(ownerlessJobId, "owner-a")).toBeUndefined();
    expect(manager.listJobsForOwner("owner-a")).toEqual([]);
  });

  it("deletes only jobs owned by the requesting owner", async () => {
    const ownerAJobId = await manager.createJob({ setup: validSetup, ownerId: "owner-a" });
    const ownerBJobId = await manager.createJob({ setup: validSetup, ownerId: "owner-b" });

    expect(manager.deleteJobForOwner(ownerBJobId, "owner-a")).toBe(false);
    expect(manager.getJob(ownerBJobId)).toBeDefined();

    expect(manager.deleteJobForOwner(ownerAJobId, "owner-a")).toBe(true);
    expect(manager.getJob(ownerAJobId)).toBeUndefined();
  });
});

describe("JobManager session helpers", () => {
  let manager: JobManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = JobManager.getInstance();
    (manager as any).jobStore = new Map();
    (manager as any).sessionStore = new Map();
    (manager as any).activeClaims = new Set();
    (manager as any).isShuttingDown = false;
  });

  it("creates queued sessions in the new state without a job link", () => {
    const sessionId = manager.createSession({ clientName: "Mira Vale", data: validSetup });
    const session = manager.getSession(sessionId);

    expect(session).toMatchObject({
      id: sessionId,
      clientName: "Mira Vale",
      status: "new",
      data: validSetup
    });
    expect(session?.jobId).toBeUndefined();
    expect(session?.createdAt).toEqual(expect.any(String));
    expect(session?.updatedAt).toEqual(expect.any(String));
  });

  it("attaches a job and marks the session processing", () => {
    const sessionId = manager.createSession({ clientName: "Mira Vale", data: validSetup });
    const jobId = "12345678-1234-4234-8234-1234567890ab";

    const updatedSession = manager.attachJobToSession(sessionId, jobId);

    expect(updatedSession).toMatchObject({
      id: sessionId,
      jobId,
      status: "processing"
    });
    expect(manager.getSession(sessionId)?.jobId).toBe(jobId);
  });

  it("uses session data and links the session when a job starts from sessionId", async () => {
    const sessionId = manager.createSession({ clientName: "Mira Vale", data: validSetup });
    const jobId = await manager.createJob({ sessionId, ownerId: "operator" });

    expect(manager.getSession(sessionId)).toMatchObject({
      status: "processing",
      jobId
    });
    expect(manager.getJob(jobId)).toMatchObject({
      sessionId,
      setup: validSetup,
      ownerId: "operator"
    });
  });

  it("allows exactly one reciprocal binding under concurrent same-owner generation", async () => {
    // Invariant: one session acquires exactly one reciprocal job binding; later changes must not weaken this guarantee.
    const sessionId = manager.createSession({ clientName: "Mira Vale", data: validSetup });
    const [first, second] = await Promise.allSettled([
      manager.createJob({ sessionId, ownerId: "operator-a" }),
      manager.createJob({ sessionId, ownerId: "operator-a" })
    ]);

    expect([first, second].filter(result => result.status === "fulfilled")).toHaveLength(1);
    const rejected = [first, second].find(result => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ status: 409, code: "SESSION_ALREADY_ENGAGED" });
    const winner = manager.getSession(sessionId)!;
    expect(manager.getJob(winner.jobId!)).toMatchObject({ id: winner.jobId, sessionId, ownerId: "operator-a" });
  });

  it("denies a concurrent different owner without creating a losing job", async () => {
    const sessionId = manager.createSession({ clientName: "Mira Vale", data: validSetup });
    const first = manager.createJob({ sessionId, ownerId: "operator-a" });
    await expect(manager.createJob({ sessionId, ownerId: "operator-b" })).rejects.toMatchObject({
      status: 403,
      code: "OWNER_SCOPE_DENIED"
    } satisfies Partial<JobContractError>);
    const winnerId = await first;
    expect(manager.listJobs()).toHaveLength(1);
    expect(manager.getSession(sessionId)).toMatchObject({ ownerId: "operator-a", jobId: winnerId });
  });

  it("rolls back both sides when initial job persistence fails", async () => {
    const sessionId = manager.createSession({ clientName: "Mira Vale", data: validSetup });
    vi.mocked(PersistenceService.saveJob).mockRejectedValueOnce(new Error("disk unavailable"));

    await expect(manager.createJob({ sessionId, ownerId: "operator-a" })).rejects.toThrow("disk unavailable");
    expect(manager.listJobs()).toEqual([]);
    expect(manager.getSession(sessionId)).toMatchObject({ status: "new" });
    expect(manager.getSession(sessionId)).not.toHaveProperty("jobId");
    expect(manager.getSession(sessionId)).not.toHaveProperty("ownerId");
  });

  it("rolls back both sides when session persistence fails", async () => {
    const sessionId = manager.createSession({ clientName: "Mira Vale", data: validSetup });
    vi.mocked(PersistenceService.saveSessions).mockImplementationOnce(() => { throw new Error("session disk unavailable"); });

    await expect(manager.createJob({ sessionId, ownerId: "operator-a" })).rejects.toThrow("session disk unavailable");
    expect(manager.listJobs()).toEqual([]);
    expect(manager.getSession(sessionId)).toMatchObject({ status: "new" });
    expect(manager.getSession(sessionId)).not.toHaveProperty("jobId");
    expect(manager.getSession(sessionId)).not.toHaveProperty("ownerId");
  });

  it("marks a linked encounter session completed and attaches final state when the job finishes", async () => {
    const sessionId = manager.createSession({ clientName: "Mira Vale", data: validSetup });
    const jobId = await manager.createJob({ sessionId, ownerId: "operator" });

    await vi.waitFor(() => {
      expect(manager.getSession(sessionId)).toMatchObject({
        status: "completed",
        jobId,
        finalState: { publisher_output: "<h1>Moon Gate</h1>" }
      });
    });
    expect(manager.getSession(sessionId)?.completedAt).toEqual(expect.any(String));
  });

  it("creates an internal completed session for standalone GM Advisor jobs", async () => {
    const adviceRequest = {
      partySize: 1,
      startLevel: 5,
      pcs: [{ name: "Thane", className: "Fighter", currentMagicItems: [] }],
      targetDifficulty: "Hard" as const,
      tone: "Heroic"
    };

    const jobId = await manager.createAdviceJob({ adviceRequest, ownerId: "operator" });

    await vi.waitFor(() => {
      const adviceSession = manager.listSessions({ statuses: ["completed"] })
        .find(session => session.sessionType === "advice");
      expect(adviceSession).toMatchObject({
        sessionType: "advice",
        title: "GM Advisor Report: Thane Party",
        clientName: "Internal GM Advisor",
        status: "completed",
        jobId,
        ownerId: "operator",
        adviceRequest
      });
      expect(adviceSession?.adviceReport).toBeDefined();
      expect(adviceSession?.completedAt).toEqual(expect.any(String));
    });
  });
});

describe("job payload Zod validation", () => {
  it("accepts a valid GM setup payload", () => {
    expect(ZodGMSetupSchema.parse(validSetup)).toEqual(validSetup);
  });

  it("accepts a strict generate request without client-supplied ownership metadata", () => {
    const payload = { setup: validSetup };

    expect(ZodGenerateJobRequestSchema.parse(payload)).toEqual(payload);
  });

  it("rejects unknown fields in the generate request envelope", () => {
    expect(() => ZodGenerateJobRequestSchema.parse({
      setup: validSetup,
      unexpected: true
    })).toThrow();
  });

  it("rejects invalid nested setup data", () => {
    expect(() => ZodGenerateJobRequestSchema.parse({
      setup: {
        ...validSetup,
        pcs: []
      }
    })).toThrow();
  });

  it("accepts a strict public session intake request", () => {
    const payload = { clientName: "Mira Vale", data: validSetup };

    expect(ZodCreateSessionRequestSchema.parse(payload)).toEqual(payload);
  });

  it("rejects public session intake without a client name", () => {
    expect(() => ZodCreateSessionRequestSchema.parse({
      clientName: "",
      data: validSetup
    })).toThrow();
  });

  it("requires either a setup payload or a sessionId", () => {
    expect(() => ZodGenerateJobRequestSchema.parse({})).toThrow("Generate job request requires either setup or sessionId.");
  });
});
