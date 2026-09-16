import { useState, useCallback, useRef, useEffect } from "react";
import type { GMSetup, GMAdviceReport, GMAdviceRequest } from "../types";
import { getOperatorJsonHeaders, operatorFetch } from "../utils/operatorAuth";

type AdviceGenerationStatus = "idle" | "pending" | "processing" | "success" | "error";

/**
 * useGMAdvisor
 * 
 * Custom hook to handle asynchronous background generation and polling of the GM Advice Report.
 */
export function useGMAdvisor() {
  const [report, setReport] = useState<GMAdviceReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<AdviceGenerationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cursorRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const pollStatus = useCallback(async (id: string) => {
    const signal = abortControllerRef.current?.signal;
    if (!signal) return false;

    try {
      const response = await operatorFetch(`/api/status/${id}?cursor=${cursorRef.current}`, {
        signal
      });
      if (!response.ok) throw new Error("Polling failed");

      const data = await response.json();

      if (!signal.aborted) {
        cursorRef.current = data.nextCursor;

        if (data.status === "done") {
          stopPolling();
          setReport(data.adviceReport);
          setStatus("success");
          setIsLoading(false);
          return false;
        } else if (data.status === "error") {
          stopPolling();
          setError(data.error || "Generation failed.");
          setStatus("error");
          setIsLoading(false);
          return false;
        } else if (data.status === "interrupted") {
          stopPolling();
          setError("The GM tactical advice generation was interrupted. Please retry.");
          setStatus("error");
          setIsLoading(false);
          return false;
        } else if (data.status === "running") {
          setStatus("processing");
        } else if (data.status === "pending") {
          setStatus("pending");
        }
      }

      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') return false;
      console.error("Polling error:", err);
      stopPolling();
      setError("The GM tactical advice generation timed out or failed. Please retry.");
      setStatus("error");
      setIsLoading(false);
      return false;
    }
  }, [stopPolling]);

  const generateReport = useCallback(async (setup: GMSetup) => {
    stopPolling();

    setIsLoading(true);
    setStatus("pending");
    setJobId(null);
    setError(null);
    setReport(null);
    cursorRef.current = 0;

    abortControllerRef.current = new AbortController();

    try {
      // Formulate request from GMSetup
      const requestPayload: GMAdviceRequest = {
        partySize: setup.pcs.length || 4,
        startLevel: setup.pcs[0]?.level || 5, // Fallback to 5 if empty
        pcs: setup.pcs.map(pc => {
          const subclassContext = [
            pc.subclass,
            pc.generalContext ? `Homebrew/context notes: ${pc.generalContext}` : ""
          ].filter(Boolean).join(" | ");

          return {
            name: pc.name,
            className: pc.className,
            subclass: subclassContext || undefined,
            currentMagicItems: pc.magicItems
              ? pc.magicItems.split(",").map(i => i.trim()).filter(Boolean)
              : []
          };
        }),
        targetDifficulty: (setup.difficulty === "Mythic" ? "Deadly" : setup.difficulty) as any,
        tone: setup.tone || "Heroic"
      };

      const response = await operatorFetch("/api/generate-advice-report", {
        method: "POST",
        headers: getOperatorJsonHeaders(),
        body: JSON.stringify(requestPayload),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to initiate GM Advice Report");
      }

      const { jobId: newJobId } = await response.json();
      setJobId(newJobId);
      const shouldContinuePolling = await pollStatus(newJobId);
      if (shouldContinuePolling) {
        pollIntervalRef.current = window.setInterval(() => pollStatus(newJobId), 1500);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error("[useGMAdvisor] Error:", err);
      setError(err.message || "An unexpected error occurred while initiating the advice report.");
      setStatus("error");
      setIsLoading(false);
    }
  }, [pollStatus, stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setReport(null);
    setError(null);
    setJobId(null);
    setStatus("idle");
    setIsLoading(false);
  }, [stopPolling]);

  return {
    generateReport,
    report,
    isLoading,
    status,
    jobId,
    error,
    reset
  };
}
