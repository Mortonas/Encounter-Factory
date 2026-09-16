import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { once } from "events";
import type { AddressInfo } from "net";
import type { Server } from "http";
import { createApp } from "../server.js";
import type { FullPipelineState, GMSetup, Job } from "./types.js";

const jobId = "12345678-1234-4234-8234-1234567890ab";
const sessionId = "22345678-1234-4234-8234-1234567890ab";

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

const fakeJob: Job = {
  id: jobId,
  type: "encounter",
  status: "running",
  createdAt: 1,
  updatedAt: 2,
  ownerId: "12345678-1234-4234-8234-1234567890ab",
  setup: validSetup,
  events: [{ index: 0, status: "running" }]
};

const finalState: FullPipelineState = {
  mcd: {
    premise: {
      setting: "Moon Gate | North\nVault",
      tone: "Heroic"
    },
    parameters: {
      target_difficulty: "Hard",
      pc_objective: "Seal | the gate"
    },
    party: {
      size: 4,
      avg_level: 5
    }
  } as any,
  mechanics: {
    mechanics: {
      xp_budget_adjusted: 2000,
      total_roster_hp: 300,
      damage_per_round_target: 75,
      estimated_lifespan_rounds: 4,
      nova_risk_flag: false,
      nova_dpr_estimated: 120
    }
  } as any,
  section_5_actors_structured: {
    actors: [
      {
        name: "Gate Warden | Prime",
        type: "Anchor",
        hp: 180,
        ac: 17,
        dpr: 42,
        size: "Large",
        speed: 30,
        initiative_bonus: 3,
        behavior_script: "Hold the breach | punish clusters.\nShift when bloodied.",
        design_justification: "Anchor.",
        traits: ["Reactive"],
        actions: ["Gravity Cut"],
        temp_hp: 0,
        is_untargetable: false,
        is_invulnerable: false,
        stall_until_round: null,
        last_phase_transition_round: null,
        current_phase_id: null
      }
    ],
    section_5_actors: "Actors",
    mission_stat_block: "Stats",
    initiative_tracker: "Tracker"
  } as any,
  section_7_8_publisher: {
    chain_of_thought_scratchpad: "Done.",
    semantic_markdown: "<section>Moon Gate</section>",
    vtt_section: "### AI VTT Notes\n- Existing tactical import."
  }
};

const completedJob: Job = {
  ...fakeJob,
  status: "done",
  sessionId,
  finalState: { ...finalState, publisher_output: "<main>Moon Gate</main>" }
};

const completedSession = {
  id: sessionId,
  sessionType: "encounter",
  title: "Moon Gate",
  clientName: "Client",
  createdAt: "2026-07-05T00:00:00.000Z",
  updatedAt: "2026-07-05T00:00:00.000Z",
  completedAt: "2026-07-05T00:00:00.000Z",
  status: "completed",
  ownerId: "12345678-1234-4234-8234-1234567890ab",
  jobId,
  finalState
};

function createFakeJobManager() {
  return {
    listJobs: vi.fn(() => [fakeJob]),
    listSessions: vi.fn(() => []),
    listJobsForOwner: vi.fn(() => [fakeJob]),
    createJob: vi.fn(async () => jobId),
    createAdviceJob: vi.fn(async () => jobId),
    getJobForOwner: vi.fn(() => fakeJob),
    resumeJobForOwner: vi.fn(async () => 1),
    deleteJobForOwner: vi.fn(() => true),
    createSession: vi.fn(() => "session-id"),
    deleteSession: vi.fn(() => true),
    getSession: vi.fn(() => undefined),
    getJob: vi.fn(() => fakeJob),
    generateObsidianMarkdown: vi.fn(() => "# Encounter")
  };
}

async function startTestServer(jobManager: ReturnType<typeof createFakeJobManager>) {
  const app = createApp(jobManager as any, {
    operatorId: "12345678-1234-4234-8234-1234567890ab",
    operatorToken: "test-operator-token-123456789012345"
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    server
  };
}

async function closeServer(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
}

describe("operator-protected API routes", () => {
  const originalOperatorToken = process.env.OPERATOR_TOKEN;
  let server: Server | undefined;
  let jobManager: ReturnType<typeof createFakeJobManager>;
  let baseUrl: string;

  beforeEach(async () => {
    process.env.OPERATOR_TOKEN = "test-operator-token-123456789012345";
    jobManager = createFakeJobManager();
    const started = await startTestServer(jobManager);
    server = started.server;
    baseUrl = started.baseUrl;
  });

  afterEach(async () => {
    if (server) {
      await closeServer(server);
      server = undefined;
    }
    process.env.OPERATOR_TOKEN = originalOperatorToken;
    vi.clearAllMocks();
  });

  it("returns 401 when a protected route has no bearer token", async () => {
    const response = await fetch(`${baseUrl}/api/jobs`);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "AUTH_REQUIRED", message: "Operator authentication is required." } });
    expect(jobManager.listJobsForOwner).not.toHaveBeenCalled();
  });

  it("returns 400 when /api/generate receives an invalid Zod payload", async () => {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer test-operator-token-123456789012345",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        setup: {
          ...validSetup,
          pcs: []
        }
      })
    });

    expect(response.status).toBe(400);
    expect(jobManager.createJob).not.toHaveBeenCalled();
  });

  it("returns 200 and lists only jobs for the authenticated owner", async () => {
    const response = await fetch(`${baseUrl}/api/jobs`, {
      headers: { "Authorization": "Bearer test-operator-token-123456789012345" }
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([expect.objectContaining({ id: jobId, ownerId: "12345678-1234-4234-8234-1234567890ab" })]);
    expect(jobManager.listJobsForOwner).toHaveBeenCalledWith("12345678-1234-4234-8234-1234567890ab");
  });

  it("creates an authenticated owner-scoped job from a valid generate payload", async () => {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer test-operator-token-123456789012345",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ setup: validSetup })
    });

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ jobId });
    expect(jobManager.createJob).toHaveBeenCalledWith(expect.objectContaining({
      setup: validSetup,
      ownerId: "12345678-1234-4234-8234-1234567890ab"
    }));
  });

  it("creates an authenticated owner-scoped advice job", async () => {
    const response = await fetch(`${baseUrl}/api/generate-advice-report`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer test-operator-token-123456789012345",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        partySize: 4,
        startLevel: 5,
        pcs: [{ name: "Thane", className: "Fighter", currentMagicItems: [] }],
        targetDifficulty: "Hard",
        tone: "Heroic"
      })
    });

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ jobId, status: "pending", type: "advice" });
    expect(jobManager.createAdviceJob).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "12345678-1234-4234-8234-1234567890ab"
    }));
  });

  it("returns 200 for authenticated owner-scoped job status", async () => {
    const response = await fetch(`${baseUrl}/api/status/${jobId}`, {
      headers: { "Authorization": "Bearer test-operator-token-123456789012345" }
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({
      jobId,
      status: "running",
      nextCursor: 1
    }));
    expect(jobManager.getJobForOwner).toHaveBeenCalledWith(jobId, "12345678-1234-4234-8234-1234567890ab");
  });

  it("returns 401 when a job VTT export has no bearer token", async () => {
    const response = await fetch(`${baseUrl}/api/export-vtt/${jobId}`);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "AUTH_REQUIRED", message: "Operator authentication is required." } });
    expect(jobManager.getJobForOwner).not.toHaveBeenCalled();
  });

  it("returns 404 when an authenticated job VTT export is missing", async () => {
    jobManager.getJob.mockReturnValueOnce(undefined as any);

    const response = await fetch(`${baseUrl}/api/export-vtt/${jobId}`, {
      headers: { "Authorization": "Bearer test-operator-token-123456789012345" }
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "JOB_NOT_FOUND_OR_EXPIRED", message: "Job not found or expired." } });
  });

  it("returns 200 with builder-generated VTT Markdown for an authenticated owned job", async () => {
    jobManager.getJob.mockReturnValueOnce(completedJob as any);

    const response = await fetch(`${baseUrl}/api/export-vtt/${jobId}`, {
      headers: { "Authorization": "Bearer test-operator-token-123456789012345" }
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(response.headers.get("content-disposition")).toContain(`Encounter-VTT-${jobId}.md`);
    expect(body).toContain("# Moon Gate | North Vault - VTT Tactical Packet");
    expect(body).toContain("| Gate Warden \\| Prime | Base | 180 | 17 | 42 | Start of encounter |");
    expect(body).toContain("### AI VTT Notes");
  });

  it("returns 401 when a job Obsidian export has no bearer token", async () => {
    const response = await fetch(`${baseUrl}/api/export-obsidian/${jobId}`);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "AUTH_REQUIRED", message: "Operator authentication is required." } });
    expect(jobManager.getJobForOwner).not.toHaveBeenCalled();
  });

  it("returns 404 when an authenticated job Obsidian export is missing", async () => {
    jobManager.getJob.mockReturnValueOnce(undefined as any);

    const response = await fetch(`${baseUrl}/api/export-obsidian/${jobId}`, {
      headers: { "Authorization": "Bearer test-operator-token-123456789012345" }
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "JOB_NOT_FOUND_OR_EXPIRED", message: "Job not found or expired." } });
  });

  it("returns 200 with builder-generated Obsidian Markdown for an authenticated owned job", async () => {
    jobManager.getJob.mockReturnValueOnce(completedJob as any);

    const response = await fetch(`${baseUrl}/api/export-obsidian/${jobId}`, {
      headers: { "Authorization": "Bearer test-operator-token-123456789012345" }
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(response.headers.get("content-disposition")).toContain(`Encounter-Obsidian-${jobId}.md`);
    expect(body).toContain('location: "Moon Gate | North\\nVault"');
    expect(body).toContain("| Gate Warden \\| Prime | Anchor | 17 | 180 | 42 |");
  });

  it("returns 401 when a session-scoped VTT export has no bearer token", async () => {
    const response = await fetch(`${baseUrl}/api/sessions/${sessionId}/export/vtt`);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "AUTH_REQUIRED", message: "Operator authentication is required." } });
    expect(jobManager.getSession).not.toHaveBeenCalled();
  });

  it("returns 404 when a session-scoped VTT export is missing archived finalState", async () => {
    jobManager.getSession.mockReturnValueOnce(undefined as any);

    const response = await fetch(`${baseUrl}/api/sessions/${sessionId}/export/vtt`, {
      headers: { "Authorization": "Bearer test-operator-token-123456789012345" }
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "SESSION_NOT_FOUND", message: "Session not found." } });
  });

  it("returns 200 with VTT Markdown from archived session finalState", async () => {
    jobManager.getSession.mockReturnValueOnce(completedSession as any);

    const response = await fetch(`${baseUrl}/api/sessions/${sessionId}/export/vtt`, {
      headers: { "Authorization": "Bearer test-operator-token-123456789012345" }
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain(`Encounter-VTT-${sessionId}.md`);
    expect(body).toContain("# Moon Gate | North Vault - VTT Tactical Packet");
    expect(body).toContain("### AI VTT Notes");
  });

  it("returns 401 when a session-scoped Obsidian export has no bearer token", async () => {
    const response = await fetch(`${baseUrl}/api/sessions/${sessionId}/export/obsidian`);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "AUTH_REQUIRED", message: "Operator authentication is required." } });
    expect(jobManager.getSession).not.toHaveBeenCalled();
  });

  it("returns 404 when a session-scoped Obsidian export is missing archived finalState", async () => {
    jobManager.getSession.mockReturnValueOnce(undefined as any);

    const response = await fetch(`${baseUrl}/api/sessions/${sessionId}/export/obsidian`, {
      headers: { "Authorization": "Bearer test-operator-token-123456789012345" }
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "SESSION_NOT_FOUND", message: "Session not found." } });
  });

  it("returns 200 with Obsidian Markdown from archived session finalState", async () => {
    jobManager.getSession.mockReturnValueOnce(completedSession as any);

    const response = await fetch(`${baseUrl}/api/sessions/${sessionId}/export/obsidian`, {
      headers: { "Authorization": "Bearer test-operator-token-123456789012345" }
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain(`Encounter-Obsidian-${sessionId}.md`);
    expect(body).toContain('location: "Moon Gate | North\\nVault"');
    expect(body).toContain("## VTT Packet");
  });

  it("validates the HTML export request envelope", async () => {
    const response = await fetch(`${baseUrl}/api/export-html`, {
      method: "POST",
      headers: { "Authorization": "Bearer test-operator-token-123456789012345", "Content-Type": "application/json" },
      body: JSON.stringify({ jobId })
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: "INVALID_EXPORT_REQUEST", message: "jobId and sessionId must be UUIDs." } });
  });

  it("distinguishes an invalid HTML export token", async () => {
    const response = await fetch(`${baseUrl}/api/export-html`, {
      method: "POST",
      headers: { "Authorization": "Bearer wrong-operator-token-12345678901234", "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, sessionId })
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "AUTH_INVALID", message: "Operator authentication is invalid." } });
  });

  it("returns the HTML export job and session resource errors independently", async () => {
    jobManager.getJob.mockReturnValueOnce(undefined as any);
    const unknownJob = await fetch(`${baseUrl}/api/export-html`, {
      method: "POST",
      headers: { "Authorization": "Bearer test-operator-token-123456789012345", "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, sessionId })
    });
    expect(unknownJob.status).toBe(404);
    expect(await unknownJob.json()).toEqual({ error: { code: "JOB_NOT_FOUND_OR_EXPIRED", message: "Job not found or expired." } });

    jobManager.getJob.mockReturnValueOnce(completedJob as any);
    jobManager.getSession.mockReturnValueOnce(undefined as any);
    const unknownSession = await fetch(`${baseUrl}/api/export-html`, {
      method: "POST",
      headers: { "Authorization": "Bearer test-operator-token-123456789012345", "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, sessionId })
    });
    expect(unknownSession.status).toBe(404);
    expect(await unknownSession.json()).toEqual({ error: { code: "SESSION_NOT_FOUND", message: "Session not found." } });
  });

  it("denies a cross-owner HTML export without invalidating authentication", async () => {
    jobManager.getJob.mockReturnValueOnce({ ...completedJob, ownerId: "32345678-1234-4234-8234-1234567890ab" } as any);
    const response = await fetch(`${baseUrl}/api/export-html`, {
      method: "POST",
      headers: { "Authorization": "Bearer test-operator-token-123456789012345", "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, sessionId })
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: { code: "OWNER_SCOPE_DENIED", message: "The job is outside the operator ownership scope." } });
  });

  it("rejects inconsistent reciprocal export bindings", async () => {
    jobManager.getJob.mockReturnValueOnce(completedJob as any);
    jobManager.getSession.mockReturnValueOnce({ ...completedSession, jobId: "32345678-1234-4234-8234-1234567890ab" } as any);
    const response = await fetch(`${baseUrl}/api/export-html`, {
      method: "POST",
      headers: { "Authorization": "Bearer test-operator-token-123456789012345", "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, sessionId })
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: { code: "EXPORT_BINDING_MISMATCH", message: "Job and session bindings do not match." } });
  });

  it.each(["pending", "running", "interrupted", "error"])("rejects a %s HTML export job as incomplete", async status => {
    jobManager.getJob.mockReturnValueOnce({ ...completedJob, status } as any);
    jobManager.getSession.mockReturnValueOnce(completedSession as any);
    const response = await fetch(`${baseUrl}/api/export-html`, {
      method: "POST",
      headers: { "Authorization": "Bearer test-operator-token-123456789012345", "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, sessionId })
    });
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("JOB_NOT_COMPLETE");
  });

  it("rejects a completed job without exportable output", async () => {
    jobManager.getJob.mockReturnValueOnce({ ...completedJob, finalState } as any);
    jobManager.getSession.mockReturnValueOnce(completedSession as any);
    const response = await fetch(`${baseUrl}/api/export-html`, {
      method: "POST",
      headers: { "Authorization": "Bearer test-operator-token-123456789012345", "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, sessionId })
    });
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("EXPORT_NOT_AVAILABLE");
  });

  it("downloads HTML only for a completed reciprocally bound owned job", async () => {
    jobManager.getJob.mockReturnValueOnce(completedJob as any);
    jobManager.getSession.mockReturnValueOnce(completedSession as any);
    const response = await fetch(`${baseUrl}/api/export-html`, {
      method: "POST",
      headers: { "Authorization": "Bearer test-operator-token-123456789012345", "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, sessionId })
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("content-disposition")).toContain(`Encounter-Grimoire-${jobId}.html`);
  });

  it("does not expose the removed PDF export route", async () => {
    const response = await fetch(`${baseUrl}/api/export-pdf`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer test-operator-token-123456789012345",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ jobId })
    });

    expect(response.status).toBe(404);
  });
});
