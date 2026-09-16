import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GMAdviceReport, GMSetup, Job, QueuedSession } from "./types";

const mocks = vi.hoisted(() => ({
  recoveryJobs: [] as Job[],
  resumeJob: vi.fn(),
  deleteJob: vi.fn(),
  startPipeline: vi.fn(),
  loadExistingJob: vi.fn(),
  stopPolling: vi.fn(),
  exportHtml: vi.fn(),
  exportVtt: vi.fn(),
  exportObsidian: vi.fn(),
  exportHookJobId: null as unknown,
  generateReport: vi.fn(),
  resetAdvice: vi.fn(),
  pipelineComplete: undefined as ((finalState: any) => void) | undefined,
  adviceReport: null as GMAdviceReport | null,
  adviceLoading: false,
  adviceStatus: "idle",
  adviceError: null as string | null,
  fetch: vi.fn()
}));

vi.mock("./hooks/useJobRecovery", () => ({
  useJobRecovery: () => ({
    jobs: mocks.recoveryJobs,
    resumeJob: mocks.resumeJob,
    deleteJob: mocks.deleteJob
  })
}));

vi.mock("./hooks/usePipelinePolling", () => ({
  usePipelinePolling: (onComplete?: (finalState: any) => void) => {
    mocks.pipelineComplete = onComplete;
    return {
      pipeline: [],
      logs: [],
      telemetry: {
        partyEHP: 0,
        partyDPR: 0,
        novaPotential: 0,
        killClock: 0,
        lethality: 0,
        novaRisk: "low"
      },
      streamingResult: "",
      error: null,
      startPipeline: mocks.startPipeline,
      loadExistingJob: mocks.loadExistingJob,
      stopPolling: mocks.stopPolling
    };
  }
}));

vi.mock("./hooks/useGMAdvisor", () => ({
  useGMAdvisor: () => ({
    generateReport: mocks.generateReport,
    report: mocks.adviceReport,
    isLoading: mocks.adviceLoading,
    status: mocks.adviceStatus,
    error: mocks.adviceError,
    reset: mocks.resetAdvice
  })
}));

vi.mock("./hooks/useEncounterExport", () => ({
  useEncounterExport: (jobId: string | null) => {
    mocks.exportHookJobId = jobId;
    return {
      handleExportHtml: mocks.exportHtml,
      handleExportVtt: mocks.exportVtt,
      handleExportObsidian: mocks.exportObsidian,
      isExportingHtml: false,
      isExportingVtt: false,
      isExportingObsidian: false,
      exportError: false
    };
  }
}));

vi.mock("./components/dashboard/GMAdvisorReport", () => ({
  GMAdvisorReport: ({ startLevel, onClose }: { startLevel: number; onClose: () => void }) => (
    <div data-testid="advisor-report">
      Advisor level {startLevel}
      <button onClick={onClose}>Close Advisor</button>
    </div>
  )
}));

vi.mock("./components/AppRouter", () => ({
  AppRouter: ({ view, result, exportHandlers, actions }: any) => (
    <div>
      <div data-testid="view">{view}</div>
      <div data-testid="result-html">{result?.htmlContent || ""}</div>
      <button onClick={() => actions.handlePublicSubmission({ clientName: "Alyx", data: validSetup })}>Submit Public</button>
      <button onClick={() => actions.handleEngage(validSession)}>Engage Session</button>
      <button onClick={actions.handleStartForge}>Start Forge</button>
      <button onClick={() => actions.handleViewResults("done-job")}>View Done Job</button>
      <button onClick={() => actions.handleResume("running-job")}>Resume Job</button>
      <button onClick={() => actions.triggerDelete("done-job")}>Delete Job</button>
      <button onClick={actions.handleGenerateAdvice}>Generate Advice</button>
      <button onClick={exportHandlers.handleExportHtml}>Export HTML</button>
      <button onClick={exportHandlers.handleExportObsidian}>Export Obsidian</button>
      <button onClick={exportHandlers.handleExportVtt}>Export VTT</button>
    </div>
  )
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

const validSession: QueuedSession = {
  id: "session-1",
  clientName: "Alyx",
  createdAt: "2026-07-04T12:00:00.000Z",
  status: "new",
  data: validSetup
};

const finalState = {
  publisher_output: "<h1>Moon Gate Complete</h1>",
  mechanics: {
    mechanics: {
      party_hp: 120,
      party_dpr: 45,
      enemy_hp_budget: 180,
      enemy_dpr_budget: 30,
      rounds_to_survive: 4,
      difficulty_rating: "Hard",
      math_notes: "Solid pressure."
    }
  },
  mcd: {
    parameters: { target_difficulty: "Hard" },
    party: { is_dpr_estimated: true, is_ac_estimated: false, is_hp_estimated: true }
  },
  auditor_report: {
    validation_passed: true,
    validation_report: "Ready."
  }
};

const adviceReport = {
  party_vulnerability_profile: {},
  tactical_combat_breakdown: {},
  pacing_sandbox: { level: 5 },
  player_specific_ledger: []
} as GMAdviceReport;

async function renderShell() {
  const module = await import("./EncounterFactoryShell");
  const EncounterFactoryShell = module.default;
  return render(<EncounterFactoryShell />);
}

describe("EncounterFactoryShell generation wiring", () => {
  beforeEach(() => {
    sessionStorage.setItem("encounter_factory_operator_token", "front-token");
    mocks.recoveryJobs = [];
    mocks.resumeJob.mockResolvedValue({ status: "resumed" });
    mocks.deleteJob.mockResolvedValue(undefined);
    mocks.startPipeline.mockResolvedValue(undefined);
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ sessionId: "session-1", status: "new" })
    });
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.loadExistingJob.mockReset();
    mocks.stopPolling.mockReset();
    mocks.exportHtml.mockReset();
    mocks.exportVtt.mockReset();
    mocks.exportObsidian.mockReset();
    mocks.exportHookJobId = null;
    mocks.generateReport.mockResolvedValue(undefined);
    mocks.resetAdvice.mockReset();
    mocks.pipelineComplete = undefined;
    mocks.adviceReport = null;
    mocks.adviceLoading = false;
    mocks.adviceStatus = "idle";
    mocks.adviceError = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("submits a public briefing to the session queue without starting the pipeline", async () => {
    await renderShell();

    fireEvent.click(screen.getByText("Submit Public"));

    await waitFor(() => {
      expect(mocks.fetch).toHaveBeenCalledWith("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName: "Alyx", data: validSetup })
      });
    });
    expect(mocks.startPipeline).not.toHaveBeenCalled();
    expect(screen.getByTestId("view")).toHaveTextContent("dashboard");
  });

  it("starts the pipeline from an active session and links it by sessionId", async () => {
    mocks.startPipeline.mockResolvedValue("linked-job");

    await renderShell();

    fireEvent.click(screen.getByText("Engage Session"));
    fireEvent.click(screen.getByText("Start Forge"));

    await waitFor(() => {
      expect(mocks.startPipeline).toHaveBeenCalledWith(validSetup, { sessionId: "session-1" });
    });
    expect(screen.getByTestId("view")).toHaveTextContent("monitoring");
  });

  it("maps completed polling state into the result view", async () => {
    await renderShell();

    act(() => {
      mocks.pipelineComplete?.(finalState);
    });

    expect(screen.getByTestId("view")).toHaveTextContent("result");
    expect(screen.getByTestId("result-html")).toHaveTextContent("Moon Gate Complete");
  });

  it("loads a completed recovery job into the result view", async () => {
    mocks.recoveryJobs = [{
      id: "done-job",
      status: "done",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      setup: validSetup,
      events: [],
      finalState: finalState as any
    }];

    await renderShell();

    fireEvent.click(screen.getByText("View Done Job"));

    expect(screen.getByTestId("view")).toHaveTextContent("result");
    expect(screen.getByTestId("result-html")).toHaveTextContent("Moon Gate Complete");
    expect(mocks.exportHookJobId).toEqual({ jobId: "done-job", sessionId: null });
  });

  it("passes manifest export actions through useEncounterExport", async () => {
    mocks.recoveryJobs = [{
      id: "done-job",
      status: "done",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      setup: validSetup,
      events: [],
      finalState: finalState as any
    }];

    await renderShell();

    fireEvent.click(screen.getByText("View Done Job"));
    fireEvent.click(screen.getByText("Export HTML"));
    fireEvent.click(screen.getByText("Export Obsidian"));
    fireEvent.click(screen.getByText("Export VTT"));

    expect(mocks.exportHtml).toHaveBeenCalledOnce();
    expect(mocks.exportObsidian).toHaveBeenCalledOnce();
    expect(mocks.exportVtt).toHaveBeenCalledOnce();
  });

  it("resumes a recovery job and attaches polling to the job", async () => {
    mocks.recoveryJobs = [{
      id: "running-job",
      status: "running",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      setup: validSetup,
      events: []
    }];

    await renderShell();

    fireEvent.click(screen.getByText("Resume Job"));

    await waitFor(() => {
      expect(mocks.resumeJob).toHaveBeenCalledWith("running-job");
      expect(mocks.loadExistingJob).toHaveBeenCalledWith("running-job");
    });
    expect(screen.getByTestId("view")).toHaveTextContent("monitoring");
  });

  it("generates GM advice for the active session setup", async () => {
    await renderShell();

    fireEvent.click(screen.getByText("Engage Session"));
    fireEvent.click(screen.getByText("Generate Advice"));

    await waitFor(() => {
      expect(mocks.generateReport).toHaveBeenCalledWith(validSetup);
    });
  });

  it("renders GM Advisor loading, error, and report overlays from the hook state", async () => {
    mocks.adviceLoading = true;
    mocks.adviceStatus = "pending";
    const loadingView = await renderShell();
    expect(screen.getByText("Queuing GM Tactical Advice...")).toBeInTheDocument();
    loadingView.unmount();

    mocks.adviceLoading = false;
    mocks.adviceError = "Advice service failed.";
    const errorView = await renderShell();
    expect(screen.getByText("Advice Request Interrupted")).toBeInTheDocument();
    expect(screen.getByText("Advice service failed.")).toBeInTheDocument();
    errorView.unmount();

    mocks.adviceError = null;
    mocks.adviceReport = adviceReport;
    await renderShell();
    fireEvent.click(screen.getByText("Engage Session"));
    expect(screen.getByTestId("advisor-report")).toHaveTextContent("Advisor level 5");
  });
});
