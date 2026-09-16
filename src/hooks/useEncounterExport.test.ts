import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEncounterExport } from "./useEncounterExport";

const jobId = "12345678-1234-4234-8234-1234567890ab";
const sessionId = "22345678-1234-4234-8234-1234567890ab";

describe("useEncounterExport", () => {
  const fetchMock = vi.fn();
  const createObjectUrlMock = vi.fn(() => "blob:encounter-export");
  const revokeObjectUrlMock = vi.fn();
  const clickMock = vi.fn();

  beforeEach(() => {
    sessionStorage.setItem("encounter_factory_operator_token", "front-token");
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window.URL, "createObjectURL").mockImplementation(createObjectUrlMock);
    vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(revokeObjectUrlMock);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(clickMock);
    fetchMock.mockImplementation(async () => new Response("markdown", { status: 200 }));
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("dispatches authorized live-job export requests", async () => {
    const { result } = renderHook(() => useEncounterExport({ jobId, sessionId }));

    await act(async () => {
      await result.current.handleExportVtt();
    });

    await act(async () => {
      await result.current.handleExportObsidian();
    });

    await act(async () => {
      await result.current.handleExportHtml();
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, `/api/sessions/${sessionId}/export/vtt`, {
      headers: { Authorization: "Bearer front-token" }
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, `/api/sessions/${sessionId}/export/obsidian`, {
      headers: { Authorization: "Bearer front-token" }
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/export-html", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer front-token"
      },
      body: JSON.stringify({ jobId, sessionId })
    });
    expect(clickMock).toHaveBeenCalledTimes(3);
    expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:encounter-export");
  });

  it("dispatches authorized archived-session VTT and Obsidian export requests", async () => {
    const { result } = renderHook(() => useEncounterExport({ sessionId }));

    await act(async () => {
      await result.current.handleExportVtt();
    });

    await act(async () => {
      await result.current.handleExportObsidian();
    });

    await act(async () => {
      await result.current.handleExportHtml();
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, `/api/sessions/${sessionId}/export/vtt`, {
      headers: { Authorization: "Bearer front-token" }
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, `/api/sessions/${sessionId}/export/obsidian`, {
      headers: { Authorization: "Bearer front-token" }
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(clickMock).toHaveBeenCalledTimes(2);
  });
});
