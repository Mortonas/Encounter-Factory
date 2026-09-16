import { renderHook, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useJobRecovery } from "./useJobRecovery";

const jobId = "12345678-1234-4234-8234-1234567890ab";

describe("useJobRecovery auth headers", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    sessionStorage.setItem("encounter_factory_operator_token", "front-token");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => []
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("fetches jobs with the operator bearer token and no clientId query", async () => {
    const { unmount } = renderHook(() => useJobRecovery());

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/jobs", {
        headers: { Authorization: "Bearer front-token" }
      });
    });

    unmount();
  });

  it("resumes and deletes jobs with the operator bearer token", async () => {
    const { result, unmount } = renderHook(() => useJobRecovery());

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    fetchMock.mockClear();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "resumed", jobId, resumeIndex: 1 })
    });

    await act(async () => {
      await result.current.resumeJob(jobId);
    });

    expect(fetchMock).toHaveBeenCalledWith(`/api/jobs/${jobId}/resume`, {
      method: "POST",
      headers: { Authorization: "Bearer front-token" }
    });

    fetchMock.mockClear();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({})
    });

    await act(async () => {
      await result.current.deleteJob(jobId);
    });

    expect(fetchMock).toHaveBeenCalledWith(`/api/jobs/${jobId}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer front-token" }
    });

    unmount();
  });
});
