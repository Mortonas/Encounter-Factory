import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionDashboard } from "./SessionDashboard";
import type { QueuedSession } from "../types";

const session: QueuedSession = {
  id: "session-1",
  sessionType: "encounter",
  title: "Moon Gate",
  clientName: "Alyx",
  createdAt: "2026-07-04T12:00:00.000Z",
  status: "processing",
  data: {
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
  }
};

const pendingSession: QueuedSession = {
  ...session,
  id: "session-2",
  title: "Sunken Reliquary",
  clientName: "Mira Vale",
  status: "new",
  data: {
    ...session.data,
    sessionName: "Sunken Reliquary"
  }
};

const sessionSummary = { ...session, data: undefined };
const pendingSessionSummary = { ...pendingSession, data: undefined };

describe("SessionDashboard operator auth headers", () => {
  const fetchMock = vi.fn();
  let anchorClickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sessionStorage.setItem("encounter_factory_operator_token", "front-token");
    vi.stubGlobal("fetch", fetchMock);
    anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:test"),
      revokeObjectURL: vi.fn()
    });

    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/sessions?status=new,reviewed,processing") {
        return { ok: true, json: async () => [sessionSummary, pendingSessionSummary] };
      }
      if (url === "/api/sessions/session-1") {
        return { ok: true, json: async () => session };
      }
      if (url === "/api/sessions?status=completed,archived") {
        return { ok: true, json: async () => [] };
      }
      return { ok: true, json: async () => ({ ok: true }) };
    });
  });

  afterEach(() => {
    anchorClickSpy.mockRestore();
    sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("sends the operator bearer token for session list, delete, and exports", async () => {
    render(<SessionDashboard onEngage={vi.fn()} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/sessions?status=new,reviewed,processing", {
        headers: { Authorization: "Bearer front-token" }
      });
    });

    fireEvent.click(screen.getByText("Export Session Logs"));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/export-logs", {
        headers: { Authorization: "Bearer front-token" }
      });
    });

    fireEvent.click(screen.getAllByTitle("Export Reasoning Logs")[0]);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/sessions/session-1/export", {
        headers: { Authorization: "Bearer front-token" }
      });
    });

    fireEvent.click(screen.getAllByTitle("Delete Briefing")[0]);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/sessions/session-1", {
        method: "DELETE",
        headers: { Authorization: "Bearer front-token" }
      });
    });
  });

  it("prominently renders client names and active queue lifecycle labels", async () => {
    render(<SessionDashboard onEngage={vi.fn()} />);

    expect(await screen.findByText("Sunken Reliquary")).toBeInTheDocument();
    expect(screen.getByText("Moon Gate")).toBeInTheDocument();

    expect(screen.getByText("Mira Vale")).toBeInTheDocument();
    expect(screen.getByText("Alyx")).toBeInTheDocument();

    expect(screen.getByText("Status: Pending Operator Review")).toBeInTheDocument();
    expect(screen.getByText("Status: Processing In Forge")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /Review Brief/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resume Audit/i })).toBeInTheDocument();
  });

  it("loads full session detail before engaging a lightweight queue row", async () => {
    const onEngage = vi.fn();
    render(<SessionDashboard onEngage={onEngage} />);

    fireEvent.click(await screen.findByRole("button", { name: /Resume Audit/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/sessions/session-1", {
        headers: { Authorization: "Bearer front-token" }
      });
      expect(onEngage).toHaveBeenCalledWith(session);
    });
  });

  it("toggles to the completed archive tab", async () => {
    render(<SessionDashboard onEngage={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));

    expect(await screen.findByText("Completed Archive")).toBeInTheDocument();
  });
});
