import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompletedArchivePanel } from "./CompletedArchivePanel";

const mocks = vi.hoisted(() => ({
  fetchArchive: vi.fn(),
  fetchSessionDetail: vi.fn(),
  setSelectedSession: vi.fn(),
  handleExportHtml: vi.fn(),
  handleExportVtt: vi.fn(),
  handleExportObsidian: vi.fn(),
  useEncounterExport: vi.fn(),
  selectedSession: null as any,
  items: [] as any[]
}));

vi.mock("../../hooks/useCompletedArchive", () => ({
  useCompletedArchive: () => ({
    items: mocks.items,
    selectedSession: mocks.selectedSession,
    isLoading: false,
    isDetailLoading: false,
    error: null,
    fetchArchive: mocks.fetchArchive,
    fetchSessionDetail: mocks.fetchSessionDetail,
    setSelectedSession: mocks.setSelectedSession
  })
}));

vi.mock("../../hooks/useEncounterExport", () => ({
  useEncounterExport: (source: any) => mocks.useEncounterExport(source)
}));

vi.mock("./EncounterManifest", () => ({
  EncounterManifest: ({ result, onExportHtml, onExportVtt, onExportObsidian }: any) => (
    <div data-testid="encounter-manifest">
      <div>{result.htmlContent}</div>
      <button onClick={onExportHtml}>Export HTML</button>
      <button onClick={onExportVtt}>Export VTT</button>
      <button onClick={onExportObsidian}>Export Obsidian</button>
    </div>
  )
}));

vi.mock("./GMAdvisorReport", () => ({
  GMAdvisorReport: ({ startLevel }: any) => <div data-testid="advisor-report">Advisor level {startLevel}</div>
}));

describe("CompletedArchivePanel", () => {
  beforeEach(() => {
    mocks.fetchArchive.mockReset();
    mocks.fetchSessionDetail.mockReset();
    mocks.setSelectedSession.mockReset();
    mocks.handleExportHtml.mockReset();
    mocks.handleExportVtt.mockReset();
    mocks.handleExportObsidian.mockReset();
    mocks.useEncounterExport.mockReset();
    mocks.useEncounterExport.mockReturnValue({
      handleExportHtml: mocks.handleExportHtml,
      handleExportVtt: mocks.handleExportVtt,
      handleExportObsidian: mocks.handleExportObsidian,
      isExportingHtml: false,
      isExportingVtt: false,
      isExportingObsidian: false,
      exportError: false
    });
    mocks.selectedSession = null;
    mocks.items = [
      {
        id: "encounter-session",
        sessionType: "encounter",
        title: "Ashen Crown",
        clientName: "Dorian",
        status: "completed",
        completedAt: "2026-07-04T12:00:00.000Z"
      },
      {
        id: "advice-session",
        sessionType: "advice",
        title: "GM Advisor Report",
        clientName: "Internal GM Advisor",
        status: "completed",
        completedAt: "2026-07-04T13:00:00.000Z"
      }
    ];
  });

  it("renders encounter and advice archive rows with type labels", () => {
    render(<CompletedArchivePanel />);

    expect(screen.getByText("Ashen Crown")).toBeInTheDocument();
    expect(screen.getByText("GM Advisor Report")).toBeInTheDocument();
    expect(screen.getAllByText("encounter").length).toBeGreaterThan(0);
    expect(screen.getAllByText("advice").length).toBeGreaterThan(0);
  });

  it("fetches detail when an archive row is selected", async () => {
    mocks.fetchSessionDetail.mockResolvedValue({
      id: "encounter-session",
      sessionType: "encounter",
      finalState: { publisher_output: "<h1>Archived Encounter</h1>" }
    });

    render(<CompletedArchivePanel />);
    fireEvent.click(screen.getByText("Ashen Crown"));

    await waitFor(() => {
      expect(mocks.fetchSessionDetail).toHaveBeenCalledWith("encounter-session");
    });
  });

  it("renders selected encounter detail through EncounterManifest", () => {
    mocks.selectedSession = {
      id: "encounter-session",
      sessionType: "encounter",
      jobId: "job-1",
      finalState: { publisher_output: "<h1>Archived Encounter</h1>" }
    };

    render(<CompletedArchivePanel />);

    expect(screen.getByTestId("encounter-manifest")).toHaveTextContent("Archived Encounter");
  });

  it("wires selected encounter exports through useEncounterExport with the archive session id", () => {
    mocks.selectedSession = {
      id: "encounter-session",
      sessionType: "encounter",
      jobId: "job-1",
      finalState: { publisher_output: "<h1>Archived Encounter</h1>" }
    };

    render(<CompletedArchivePanel />);

    expect(mocks.useEncounterExport).toHaveBeenCalledWith({
      jobId: "job-1",
      sessionId: "encounter-session"
    });

    fireEvent.click(screen.getByText("Export HTML"));
    fireEvent.click(screen.getByText("Export VTT"));
    fireEvent.click(screen.getByText("Export Obsidian"));

    expect(mocks.handleExportHtml).toHaveBeenCalledOnce();
    expect(mocks.handleExportVtt).toHaveBeenCalledOnce();
    expect(mocks.handleExportObsidian).toHaveBeenCalledOnce();
  });

  it("renders selected advisor detail through GMAdvisorReport", () => {
    mocks.selectedSession = {
      id: "advice-session",
      sessionType: "advice",
      adviceRequest: { startLevel: 7 },
      adviceReport: { party_vulnerability_profile: {} }
    };

    render(<CompletedArchivePanel />);
    fireEvent.click(screen.getByText("Open Advisor Report"));

    expect(screen.getByTestId("advisor-report")).toHaveTextContent("Advisor level 7");
  });
});
