import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { AlertCircle } from "lucide-react";
import { AppRouter } from "./components/AppRouter";
import { BriefingForm } from "./components/BriefingForm";
import { GMAdvisorReport } from "./components/dashboard/GMAdvisorReport";
import { OperatorUnlock } from "./components/OperatorUnlock";
import { useEncounterExport } from "./hooks/useEncounterExport";
import { useGMAdvisor } from "./hooks/useGMAdvisor";
import { useJobRecovery } from "./hooks/useJobRecovery";
import { usePipelinePolling } from "./hooks/usePipelinePolling";
import type { CreateSessionRequest, EncounterResult, GMSetup, QueuedSession } from "./types";
import { getOperatorToken, OPERATOR_AUTH_CLEARED_EVENT, setOperatorToken } from "./utils/operatorAuth";

type AppView = "dashboard" | "form" | "monitoring" | "result";

const mapFinalStateToResult = (finalState: any): EncounterResult => ({
  htmlContent: finalState?.publisher_output || "<h1>Generation Complete</h1><p>No content returned.</p>",
  mathExplanation: "Encounter engineered via full 8-Bot sequence.",
  mechanics: finalState?.mechanics?.mechanics && {
    ...finalState.mechanics.mechanics,
    target_difficulty: finalState.mcd?.parameters?.target_difficulty || "Medium",
    is_dpr_estimated: finalState.mcd?.party?.is_dpr_estimated,
    is_ac_estimated: finalState.mcd?.party?.is_ac_estimated,
    is_hp_estimated: finalState.mcd?.party?.is_hp_estimated
  },
  validation: finalState?.auditor_report && {
    passed: finalState.auditor_report.validation_passed,
    report: finalState.auditor_report.validation_report
  }
});

export default function EncounterFactoryShell() {
  const [unlocked, setUnlocked] = useState(() => Boolean(getOperatorToken()));
  const [publicBriefing, setPublicBriefing] = useState(false);
  const [submittedSessionId, setSubmittedSessionId] = useState<string | null>(null);

  useEffect(() => {
    const lock = () => setUnlocked(false);
    window.addEventListener(OPERATOR_AUTH_CLEARED_EVENT, lock);
    return () => window.removeEventListener(OPERATOR_AUTH_CLEARED_EVENT, lock);
  }, []);

  if (publicBriefing) {
    if (submittedSessionId) {
      return <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center p-6"><div className="max-w-lg rounded-2xl border border-emerald-500/30 bg-zinc-950 p-8"><h1 className="text-2xl font-black">Briefing submitted</h1><p className="mt-3 text-zinc-400">Reference: {submittedSessionId}</p><button className="mt-6 rounded-xl border border-zinc-700 px-4 py-2" onClick={() => { setSubmittedSessionId(null); setPublicBriefing(false); }}>Return</button></div></div>;
    }
    return <div className="min-h-screen bg-black text-zinc-100 p-6"><BriefingForm onComplete={async (request) => {
      const response = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
      if (!response.ok) throw new Error("Failed to submit briefing for operator review.");
      const data = await response.json();
      setSubmittedSessionId(data.sessionId);
    }} /></div>;
  }

  if (!unlocked) {
    return <OperatorUnlock onUnlock={(token) => { setOperatorToken(token); setUnlocked(true); }} onPublicBriefing={() => setPublicBriefing(true)} />;
  }
  return <AuthenticatedEncounterFactoryShell />;
}

function AuthenticatedEncounterFactoryShell() {
  const [view, setView] = useState<AppView>("dashboard");
  const [setup, setSetup] = useState<GMSetup | null>(null);
  const [result, setResult] = useState<EncounterResult | null>(null);
  const [resultJobId, setResultJobId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<QueuedSession | null>(null);
  const { jobs: recoveryJobs, resumeJob, deleteJob } = useJobRecovery();
  const {
    generateReport: generateAdvice,
    report: adviceReport,
    isLoading: isAdviceLoading,
    status: adviceStatus,
    error: adviceError,
    reset: resetAdvice
  } = useGMAdvisor();

  const handleJobDone = useCallback((finalState: any) => {
    setResult(mapFinalStateToResult(finalState));
    setView("result");
  }, []);

  const {
    pipeline,
    logs,
    telemetry,
    streamingResult,
    jobId: pipelineJobId,
    error: pipelineError,
    startPipeline,
    loadExistingJob,
    stopPolling
  } = usePipelinePolling(handleJobDone);
  const exportJobId = resultJobId || pipelineJobId;
  const exportSessionId = activeSession?.id || recoveryJobs.find((job) => job.id === exportJobId)?.sessionId || null;
  const exportHandlers = useEncounterExport({ jobId: exportJobId, sessionId: exportSessionId });

  const handleResume = async (id: string) => {
    console.log("[Shell] Resume requested", id);
    const job = recoveryJobs.find((candidate) => candidate.id === id);
    if (job?.setup) {
      setSetup(job.setup);
    }
    setResult(null);
    setResultJobId(null);
    setView("monitoring");
    await resumeJob(id);
    loadExistingJob(id);
  };

  const triggerDelete = async (id: string) => {
    console.log("[Shell] Delete requested", id);
    await deleteJob(id);
  };

  const handleViewResults = (id: string) => {
    console.log("[Shell] View results requested", id);
    const job = recoveryJobs.find((candidate) => candidate.id === id);
    if (!job?.finalState) {
      console.warn("[Shell] Completed job state was not available", id);
      return;
    }
    setSetup(job.setup);
    setResult(mapFinalStateToResult(job.finalState));
    setResultJobId(id);
    setView("result");
  };

  const handleEngage = (session: QueuedSession) => {
    setActiveSession(session);
    setSetup(session.data);
  };

  const handleStartForge = async () => {
    console.log("[Shell] Start forge requested", activeSession?.id);
    if (!activeSession) {
      return;
    }
    setSetup(activeSession.data);
    setResult(null);
    setResultJobId(null);
    setView("monitoring");
    const jobId = await startPipeline(activeSession.data, { sessionId: activeSession.id });
    if (jobId) {
      setActiveSession({
        ...activeSession,
        status: "processing",
        jobId,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handlePublicSubmission = async (request: CreateSessionRequest) => {
    console.log("[Shell] Public submission received", request.data.sessionName);
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      throw new Error("Failed to submit briefing for operator review.");
    }

    setSetup(request.data);
    setResult(null);
    setResultJobId(null);
    setActiveSession(null);
  };

  const handleGenerateAdvice = async () => {
    console.log("[Shell] GM Advisor requested", activeSession?.id || setup?.sessionName);
    const adviceSetup = activeSession?.data || setup;
    if (!adviceSetup) {
      return;
    }
    await generateAdvice(adviceSetup);
  };

  const handleNewEncounter = () => {
    stopPolling();
    setResult(null);
    setResultJobId(null);
    setSetup(null);
    setActiveSession(null);
    setView("dashboard");
  };

  const handleRetryEncounter = () => {
    console.log("[Shell] Retry requested");
    stopPolling();
    setView("dashboard");
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-primary/30">
      <main className="container mx-auto px-6 py-12">
        <AppRouter
          view={view}
          setView={setView}
          setup={setup}
          result={result}
          activeSession={activeSession}
          recoveryJobs={recoveryJobs}
          pipeline={pipeline}
          logs={logs}
          telemetry={telemetry}
          streamingResult={streamingResult}
          pipelineError={pipelineError}
          exportHandlers={exportHandlers}
          actions={{
            handleResume,
            handleViewResults,
            triggerDelete,
            handleEngage,
            handleStartForge,
            handlePublicSubmission,
            handleNewEncounter,
            handleRetryEncounter,
            setActiveSession,
            handleGenerateAdvice
          }}
        />
      </main>

      <AnimatePresence>
        {adviceReport && setup && (
          <GMAdvisorReport
            report={adviceReport}
            onClose={resetAdvice}
            startLevel={setup.pcs[0]?.level || 5}
          />
        )}
      </AnimatePresence>

      {isAdviceLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-violet-500/20 border-t-violet-500" />
          <h3 className="text-sm font-black uppercase tracking-widest text-violet-400 animate-pulse">
            {adviceStatus === "pending" ? "Queuing GM Tactical Advice..." : "Synthesizing GM Tactical Advice..."}
          </h3>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">
            Consulting 5.5e Ground-Truth Registry & party profiles
          </p>
        </div>
      )}

      {adviceError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-red-500/30 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-lg font-black uppercase tracking-tighter italic">Advice Request Interrupted</h3>
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">{adviceError}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={resetAdvice}
                className="rounded-xl border border-white/5 bg-zinc-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white"
              >
                Dismiss
              </button>
              <button
                onClick={handleGenerateAdvice}
                className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-violet-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
