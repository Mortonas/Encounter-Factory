import { renderHook, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCompletedArchive } from "./useCompletedArchive";

describe("useCompletedArchive", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    sessionStorage.setItem("encounter_factory_operator_token", "front-token");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/sessions?status=completed,archived") {
        return { ok: true, json: async () => [{ id: "session-1", sessionType: "encounter", status: "completed" }] };
      }
      if (url === "/api/sessions/session-1") {
        return { ok: true, json: async () => ({ id: "session-1", finalState: { publisher_output: "<h1>Done</h1>" } }) };
      }
      return { ok: false, json: async () => ({}) };
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("fetches lightweight archive summaries with operator auth", async () => {
    const { result } = renderHook(() => useCompletedArchive());

    await waitFor(() => {
      expect(result.current.items).toEqual([{ id: "session-1", sessionType: "encounter", status: "completed" }]);
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/sessions?status=completed,archived", {
      headers: { Authorization: "Bearer front-token" }
    });
  });

  it("fetches full session detail by ID", async () => {
    const { result } = renderHook(() => useCompletedArchive());

    await act(async () => {
      await result.current.fetchSessionDetail("session-1");
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/sessions/session-1", {
      headers: { Authorization: "Bearer front-token" }
    });
    expect(result.current.selectedSession).toEqual({
      id: "session-1",
      finalState: { publisher_output: "<h1>Done</h1>" }
    });
  });
});
