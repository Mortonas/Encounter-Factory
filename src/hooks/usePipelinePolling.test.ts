import { renderHook, act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePipelinePolling } from "./usePipelinePolling";
import type { GMSetup } from "../types";

const jobId = "12345678-1234-4234-8234-1234567890ab";

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

describe("usePipelinePolling operator auth", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    sessionStorage.setItem("encounter_factory_operator_token", "front-token");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("starts generation with the operator token and without clientId identity payloads", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ jobId })
    });

    const { result, unmount } = renderHook(() => usePipelinePolling());

    await act(async () => {
      await result.current.startPipeline({ ...validSetup, clientId: "legacy-client" } as any, "legacy-job");
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/generate", expect.objectContaining({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer front-token"
      }
    }));

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body).toEqual({ setup: validSetup, jobId: "legacy-job" });
    expect(body).not.toHaveProperty("clientId");
    expect(body.setup).not.toHaveProperty("clientId");

    unmount();
  });

  it("starts generation with a sessionId link and returns the created job id", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ jobId })
    });

    const { result, unmount } = renderHook(() => usePipelinePolling());

    let createdJobId: string | undefined;
    await act(async () => {
      createdJobId = await result.current.startPipeline(validSetup, { sessionId: "12345678-1234-4234-8234-1234567890ac" });
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      setup: validSetup,
      sessionId: "12345678-1234-4234-8234-1234567890ac"
    });
    expect(createdJobId).toBe(jobId);

    unmount();
  });

  it("polls status with the operator token", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "running", events: [], nextCursor: 0 })
    });

    const { result, unmount } = renderHook(() => usePipelinePolling());

    act(() => {
      result.current.loadExistingJob(jobId);
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(`/api/status/${jobId}?cursor=0`, expect.objectContaining({
        headers: { Authorization: "Bearer front-token" }
      }));
    });

    unmount();
  });
});
