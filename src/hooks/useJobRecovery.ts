import { useState, useEffect, useCallback, useRef } from "react";
import { operatorFetch } from "../utils/operatorAuth";
import type { Job } from "../types";

/**
 * useJobRecovery
 * 
 * Manages the discovery and resumption of active background jobs for the current user.
 */
export function useJobRecovery() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<number | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const response = await operatorFetch("/api/jobs");
      if (!response.ok) throw new Error("Failed to fetch jobs");
      const data = await response.json();
      setJobs(data);
      setError(null);
    } catch (err: any) {
      console.error("[Recovery] Fetch failed:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    // Low frequency polling to keep the dashboard fresh without hammering the server
    pollIntervalRef.current = window.setInterval(fetchJobs, 30000); 
  }, [fetchJobs, stopPolling]);

  const resumeJob = useCallback(async (jobId: string) => {
    // Explicitly stop recovery polling to prevent "Ghost Polling"
    stopPolling();

    try {
      const response = await operatorFetch(`/api/jobs/${jobId}/resume`, { method: "POST" });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to resume job");
      }
      return await response.json();
    } catch (err: any) {
      console.error("[Recovery] Resume failed:", err);
      throw err;
    }
  }, [stopPolling]);

  const deleteJob = useCallback(async (jobId: string) => {
    try {
      const response = await operatorFetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete job");
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch (err: any) {
      console.error("[Recovery] Delete failed:", err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    startPolling();
    return () => stopPolling();
  }, [fetchJobs, startPolling, stopPolling]);

  return {
    jobs,
    isLoading,
    error,
    refreshJobs: fetchJobs,
    resumeJob,
    deleteJob,
    stopPolling,
    startPolling
  };
}
