import http from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../server.js";
import type { GMSetup, QueuedSession } from "./types.js";

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
      weaponMasteries: "Push"
    }
  ],
  allies: [],
  enemies: [],
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

const session: QueuedSession = {
  id: "12345678-1234-4234-8234-1234567890ab",
  sessionType: "encounter",
  clientName: "Mira Vale",
  createdAt: "2026-07-04T12:00:00.000Z",
  updatedAt: "2026-07-04T12:00:00.000Z",
  status: "new",
  data: validSetup
};

const completedSession: QueuedSession = {
  ...session,
  id: "12345678-1234-4234-8234-1234567890ac",
  status: "completed",
  completedAt: "2026-07-04T12:30:00.000Z",
  jobId: "12345678-1234-4234-8234-1234567890ad",
  adviceRequest: { hidden: "heavy" },
  adviceReport: { hidden: "heavy" },
  finalState: { publisher_output: "<h1>Moon Gate</h1>" }
};

const archivedSession: QueuedSession = {
  ...completedSession,
  id: "12345678-1234-4234-8234-1234567890ae",
  status: "archived"
};

const summarizeSession = (queuedSession: QueuedSession) => {
  const { data, finalState, adviceRequest, adviceReport, ...summary } = queuedSession;
  return summary;
};

describe("session API route protections", () => {
  let server: http.Server;
  let baseUrl: string;
  let previousOperatorToken: string | undefined;
  const createSession = vi.fn(() => session.id);
  const createJob = vi.fn();
  const getSession = vi.fn((id: string) => [session, completedSession, archivedSession].find(candidate => candidate.id === id));
  const listSessions = vi.fn((filters?: { statuses?: string[] }) => {
    const sessions = [session, completedSession, archivedSession];
    if (!filters?.statuses?.length) return sessions;
    return sessions.filter(candidate => filters.statuses!.includes(candidate.status));
  });

  beforeEach(async () => {
    previousOperatorToken = process.env.OPERATOR_TOKEN;
    process.env.OPERATOR_TOKEN = "test-operator-token-123456789012345";
    createSession.mockClear();
    createJob.mockClear();
    getSession.mockClear();
    listSessions.mockClear();

    const app = createApp({
      createSession,
      createJob,
      listSessions,
      deleteSession: vi.fn(),
      getSession,
      getJob: vi.fn(),
      listJobs: vi.fn(() => []),
      listJobsForOwner: vi.fn(() => []),
      createAdviceJob: vi.fn(),
      getJobForOwner: vi.fn(),
      resumeJobForOwner: vi.fn(),
      deleteJobForOwner: vi.fn(),
      generateObsidianMarkdown: vi.fn()
    } as any, {
      operatorId: "12345678-1234-4234-8234-1234567890ab",
      operatorToken: "test-operator-token-123456789012345"
    });

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind test server.");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    process.env.OPERATOR_TOKEN = previousOperatorToken;
    await new Promise<void>((resolve, reject) => {
      server.close((err) => err ? reject(err) : resolve());
    });
  });

  it("accepts unauthenticated public session intake without starting a job", async () => {
    const response = await fetch(`${baseUrl}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientName: "Mira Vale", data: validSetup })
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      sessionId: session.id,
      status: "new"
    });
    expect(createSession).toHaveBeenCalledWith({ clientName: "Mira Vale", data: validSetup });
    expect(createJob).not.toHaveBeenCalled();
  });

  it("rejects invalid public session intake", async () => {
    const response = await fetch(`${baseUrl}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: validSetup })
    });

    expect(response.status).toBe(400);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("requires operator auth to list sessions", async () => {
    const response = await fetch(`${baseUrl}/api/sessions`);

    expect(response.status).toBe(401);
    expect(listSessions).not.toHaveBeenCalled();
  });

  it("returns queued sessions for authenticated operators", async () => {
    const response = await fetch(`${baseUrl}/api/sessions`, {
      headers: { Authorization: "Bearer test-operator-token-123456789012345" }
    });

    expect(response.status).toBe(200);
    const sessions = await response.json();
    expect(sessions).toEqual([session, completedSession, archivedSession].map(summarizeSession));
    sessions.forEach((queuedSession: QueuedSession) => {
      expect(queuedSession).not.toHaveProperty("data");
      expect(queuedSession).not.toHaveProperty("finalState");
      expect(queuedSession).not.toHaveProperty("adviceRequest");
      expect(queuedSession).not.toHaveProperty("adviceReport");
    });
    expect(listSessions).toHaveBeenCalledTimes(1);
    expect(listSessions).toHaveBeenCalledWith(undefined);
  });

  it("filters sessions by comma-delimited status for authenticated operators", async () => {
    const response = await fetch(`${baseUrl}/api/sessions?status=completed,archived`, {
      headers: { Authorization: "Bearer test-operator-token-123456789012345" }
    });

    expect(response.status).toBe(200);
    const sessions = await response.json();
    expect(sessions).toHaveLength(2);
    expect(sessions[0]).not.toHaveProperty("data");
    expect(sessions[0]).not.toHaveProperty("finalState");
    expect(sessions[0]).not.toHaveProperty("adviceRequest");
    expect(sessions[0]).not.toHaveProperty("adviceReport");
    expect(listSessions).toHaveBeenCalledWith({ statuses: ["completed", "archived"] });
  });

  it("returns full session detail for authenticated operators", async () => {
    const response = await fetch(`${baseUrl}/api/sessions/${completedSession.id}`, {
      headers: { Authorization: "Bearer test-operator-token-123456789012345" }
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(completedSession);
    expect(getSession).toHaveBeenCalledWith(completedSession.id);
  });

  it("rejects invalid session status filters", async () => {
    const response = await fetch(`${baseUrl}/api/sessions?status=done`, {
      headers: { Authorization: "Bearer test-operator-token-123456789012345" }
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid session status filter: done" });
  });
});
