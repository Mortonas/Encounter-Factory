import { motion } from "motion/react";
import { BriefingForm } from "./BriefingForm";
import { SessionDashboard } from "./SessionDashboard";
import { ActiveSessionReview } from "./dashboard/ActiveSessionReview";
import { ForgeMonitoring } from "./dashboard/ForgeMonitoring";
import { EncounterManifest } from "./dashboard/EncounterManifest";
import { JobDashboard } from "./dashboard/JobDashboard";
import { ErrorBoundary } from "./ErrorBoundary";
import type { CreateSessionRequest, GMSetup, EncounterResult, QueuedSession, PipelineStep, ForgeLog, ForgeTelemetry } from "../types";

interface AppRouterProps {
  view: "dashboard" | "form" | "monitoring" | "result";
  setView: (view: "dashboard" | "form" | "monitoring" | "result") => void;
  setup: GMSetup | null;
  result: EncounterResult | null;
  activeSession: QueuedSession | null;
  recoveryJobs: any[];
  pipeline: PipelineStep[];
  logs: ForgeLog[];
  telemetry: ForgeTelemetry;
  streamingResult: string;
  pipelineError: string | null;
  exportHandlers: {
    handleExportVtt: () => void;
    handleExportHtml: () => void;
    handleExportObsidian: () => void;
    isExportingVtt: boolean;
    isExportingHtml: boolean;
    isExportingObsidian: boolean;
    exportError: boolean;
  };
  actions: {
    handleResume: (id: string) => void;
    handleViewResults: (id: string) => void;
    triggerDelete: (id: string) => void;
    handleEngage: (session: QueuedSession) => void;
    handleStartForge: () => void;
    handlePublicSubmission: (request: CreateSessionRequest) => void;
    handleNewEncounter: () => void;
    handleRetryEncounter: () => void;
    setActiveSession: (session: QueuedSession | null) => void;
    handleGenerateAdvice: () => void;
  };
}

/**
 * AppRouter
 * 
 * Manages the high-level view state transitions of the Encounter Factory.
 * Handles the clean "Handoff" of data between the Briefing, Monitoring, and Manifest stages.
 */
export function AppRouter({
  view,
  setView,
  setup,
  result,
  activeSession,
  recoveryJobs,
  pipeline,
  logs,
  telemetry,
  streamingResult,
  pipelineError,
  exportHandlers,
  actions
}: AppRouterProps) {
  
  if (view === "form") {
    return <BriefingForm onComplete={async (request) => { actions.handlePublicSubmission(request); }} />;
  }

  return (
    <motion.div
      key={view}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {view === "dashboard" && (
        <>
          {activeSession ? (
            <ActiveSessionReview 
              session={activeSession}
              onBack={() => actions.setActiveSession(null)}
              onStartForge={actions.handleStartForge}
              onGenerateAdvice={actions.handleGenerateAdvice}
            />
          ) : (
            <div className="space-y-12">
              <JobDashboard 
                jobs={recoveryJobs} 
                onResume={actions.handleResume} 
                onViewResults={actions.handleViewResults} 
                onDelete={actions.triggerDelete}
              />
              <SessionDashboard onEngage={actions.handleEngage} />
            </div>
          )}
        </>
      )}

      {view === "monitoring" && (
        <ForgeMonitoring 
          pipeline={pipeline} 
          logs={logs} 
          telemetry={telemetry}
          streamingResult={streamingResult}
          error={pipelineError}
          onBack={actions.handleRetryEncounter}
        />
      )}

      {view === "result" && result && (
        <ErrorBoundary>
          <EncounterManifest 
            result={result} 
            onExportHtml={exportHandlers.handleExportHtml}
            onExportVtt={exportHandlers.handleExportVtt}
            onExportObsidian={exportHandlers.handleExportObsidian}
            isExportingVtt={exportHandlers.isExportingVtt}
            isExportingHtml={exportHandlers.isExportingHtml}
            isExportingObsidian={exportHandlers.isExportingObsidian}
            onNewEncounter={actions.handleNewEncounter}
            exportError={exportHandlers.exportError}
            onGenerateAdvice={actions.handleGenerateAdvice}
          />
        </ErrorBoundary>
      )}
    </motion.div>
  );
}
