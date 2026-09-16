import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GMSetup, Job, QueuedSession } from "../types.js";

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

describe("PersistenceService job hydration validation", () => {
  const originalCwd = process.cwd();
  let tempRoot: string;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("../db/schemaMigration.js", () => ({
      SchemaMigration: {
        run: vi.fn().mockResolvedValue(undefined)
      }
    }));

    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "encounter-persistence-"));
    process.chdir(tempRoot);
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    consoleErrorSpy.mockRestore();
    vi.doUnmock("../db/schemaMigration.js");
    vi.resetModules();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("quarantines invalid persisted jobs and hydrates valid jobs", async () => {
    const { PersistenceService } = await import("./persistenceService.js");
    const jobsDir = path.join(tempRoot, "storage", "jobs");
    const validJobId = "12345678-1234-4234-8234-1234567890ab";
    const validJob: Job = {
      id: validJobId,
      type: "encounter",
      status: "running",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ownerId: "operator",
      setup: validSetup,
      events: [{ index: 0, status: "running" }]
    };

    fs.writeFileSync(path.join(jobsDir, `${validJobId}.json`), JSON.stringify(validJob, null, 2));
    fs.writeFileSync(path.join(jobsDir, "invalid.json"), JSON.stringify({
      id: "not-a-uuid",
      status: "running",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      setup: { sessionName: "broken" },
      events: []
    }, null, 2));

    const jobs = PersistenceService.loadAllJobs();

    expect(jobs.size).toBe(1);
    expect(jobs.get(validJobId)).toMatchObject({ id: validJobId, ownerId: "operator" });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Quarantined invalid job file invalid.json:"),
      expect.any(String)
    );
  });

  it("quarantines invalid persisted sessions and hydrates valid sessions", async () => {
    const { PersistenceService } = await import("./persistenceService.js");
    const sessionsFile = path.join(tempRoot, "storage", "sessions.json");
    const validSession: QueuedSession = {
      id: "12345678-1234-4234-8234-1234567890ab",
      sessionType: "encounter",
      clientName: "Mira Vale",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "new",
      data: validSetup
    };

    fs.writeFileSync(sessionsFile, JSON.stringify([
      validSession,
      {
        id: "not-a-uuid",
        clientName: "",
        createdAt: "not-a-date",
        status: "new",
        data: { sessionName: "broken" }
      }
    ], null, 2));

    const sessions = PersistenceService.loadSessions();

    expect(sessions).toEqual([validSession]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Quarantined invalid session not-a-uuid:"),
      expect.any(String)
    );
  });
});
