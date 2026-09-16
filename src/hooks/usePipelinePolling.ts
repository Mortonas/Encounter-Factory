import { useState, useCallback, useRef, useEffect } from "react";
import { PIPELINE_SEQUENCE } from "../types";
import type { PipelineStep, GMSetup, ForgeLog, ForgeTelemetry } from "../types";
import { getOperatorJsonHeaders, operatorFetch } from "../utils/operatorAuth";

type StartPipelineOptions = {
  existingJobId?: string;
  sessionId?: string;
};

/**
 * usePipelinePolling
 * 
 * Orchestrates the long-polling lifecycle for the Multi-Bot Encounter Factory pipeline.
 */
export function usePipelinePolling(onComplete?: (finalState: any) => void) {
  const [pipeline, setPipeline] = useState<PipelineStep[]>([]);
  const [logs, setLogs] = useState<ForgeLog[]>([]);
  const [telemetry, setTelemetry] = useState<ForgeTelemetry>({
    partyEHP: 0,
    partyDPR: 0,
    novaPotential: 0,
    killClock: 0,
    lethality: 0,
    novaRisk: "low"
  });
  const [streamingResult, setStreamingResult] = useState<string>("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
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
    if (!signal) return;

    try {
      const response = await operatorFetch(`/api/status/${id}?cursor=${cursorRef.current}`, {
        signal
      });
      if (!response.ok) throw new Error("Polling failed");
      
      const data = await response.json();
      
      if (!signal.aborted) {
        cursorRef.current = data.nextCursor;

        const newEvents = data.events || [];
        if (newEvents.length > 0) {
          setPipeline(prev => {
            const next = [...prev];
            newEvents.forEach((event: any) => {
              if (event.index < next.length) {
                const step = next[event.index];
                step.status = event.status === "completed" ? "completed" : 
                             event.status === "failed" ? "error" : 
                             event.status === "streaming" ? "processing" : "processing";
                
                // Handle Enriched Data (Telemetry)
                if (event.telemetry) {
                  step.telemetry = { ...step.telemetry, ...event.telemetry };
                  setTelemetry(prevTel => ({ ...prevTel, ...event.telemetry }));
                }

                // Handle Publisher/Stylist Streaming (Index 8/9 in 10-bot pipeline)
                if (event.status === "streaming" && (event.index === 8 || event.index === 9)) {
                  setStreamingResult(event.data);
                }

                // Handle Structured Logging
                const newLog: ForgeLog = {
                  timestamp: new Date().toLocaleTimeString(),
                  botId: step.id,
                  botName: step.name,
                  level: event.log?.level || (event.status === "failed" ? "error" : "info"),
                  message: event.log?.message || `${step.name} changed status to ${event.status}`,
                  reasoning: event.log?.reasoning
                };
                setLogs(prevLogs => [...prevLogs, newLog]);
              }
            });
            return next;
          });
        }

        if (data.status === "done") {
          stopPolling();
          if (onComplete) onComplete(data.finalState);
        } else if (data.status === "error") {
          stopPolling();
          setError(data.error || "Generation failed.");
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error("Polling error:", err);
      stopPolling();
      setError("The tactical audit has expired or was removed from the forge. Please re-run the generation.");
    }
  }, [onComplete, stopPolling]);

  const startPipeline = useCallback(async (
    setup: GMSetup,
    options?: StartPipelineOptions | string
  ): Promise<string | undefined> => {
    const startOptions: StartPipelineOptions = typeof options === "string"
      ? { existingJobId: options }
      : options ?? {};

    setError(null);
    setStreamingResult("");
    setTelemetry({
      partyEHP: 0,
      partyDPR: 0,
      novaPotential: 0,
      killClock: 0,
      lethality: 0,
      novaRisk: "low"
    });
    setLogs([{
      timestamp: new Date().toLocaleTimeString(),
      botId: "SYSTEM",
      botName: "System",
      level: "system",
      message: "Initializing connection to the Forge..."
    }]);
    cursorRef.current = 0;
    
    // Use authoritative PIPELINE_SEQUENCE
    const initialSteps: PipelineStep[] = PIPELINE_SEQUENCE.map(step => ({
      ...step,
      status: "pending" as const
    }));
    setPipeline(initialSteps);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      const { clientId: _clientId, ...setupPayload } = setup as GMSetup & { clientId?: string };
      const response = await operatorFetch("/api/generate", {
        method: "POST",
        headers: getOperatorJsonHeaders(),
        body: JSON.stringify({
          setup: setupPayload,
          ...(startOptions.existingJobId ? { jobId: startOptions.existingJobId } : {}),
          ...(startOptions.sessionId ? { sessionId: startOptions.sessionId } : {})
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error("Failed to start pipeline");
      
      const data = await response.json();
      setJobId(data.jobId);
      pollIntervalRef.current = window.setInterval(() => pollStatus(data.jobId), 1500);
      return data.jobId;
    } catch (err: any) {
      if (err.name === 'AbortError') return undefined;
      setError(err.message);
      return undefined;
    }
  }, [pollStatus]);

  const loadExistingJob = useCallback(async (id: string) => {
    stopPolling(); 
    setJobId(id);
    cursorRef.current = 0;
    setStreamingResult("");
    
    const initialSteps: PipelineStep[] = PIPELINE_SEQUENCE.map(step => ({
      ...step,
      status: "pending" as const
    }));
    setPipeline(initialSteps);

    setLogs([{
      timestamp: new Date().toLocaleTimeString(),
      botId: "SYSTEM",
      botName: "System",
      level: "system",
      message: "Reconnecting to existing Forge session..."
    }]);

    abortControllerRef.current = new AbortController();
    pollStatus(id); 
    pollIntervalRef.current = window.setInterval(() => pollStatus(id), 1500);
  }, [pollStatus, stopPolling]);

  const resetError = useCallback(() => setError(null), []);

  return {
    pipeline,
    logs,
    telemetry,
    streamingResult,
    jobId,
    error,
    startPipeline,
    loadExistingJob,
    stopPolling,
    resetError
  };
}
