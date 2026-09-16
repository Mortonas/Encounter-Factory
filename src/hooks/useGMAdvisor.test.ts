import { renderHook, act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGMAdvisor } from "./useGMAdvisor";
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

describe("useGMAdvisor operator auth", () => {
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

  it("starts advice generation without clientId and polls status with the operator token", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "running", events: [], nextCursor: 0 })
      });

    const { result, unmount } = renderHook(() => useGMAdvisor());

    await act(async () => {
      await result.current.generateReport({ ...validSetup, clientId: "legacy-client" } as any);
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/generate-advice-report", expect.objectContaining({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer front-token"
      }
    }));

    const [, generateInit] = fetchMock.mock.calls[0];
    const body = JSON.parse(generateInit.body);
    expect(body).not.toHaveProperty("clientId");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(2, `/api/status/${jobId}?cursor=0`, expect.objectContaining({
        headers: { Authorization: "Bearer front-token" }
      }));
    });

    unmount();
  });
});
