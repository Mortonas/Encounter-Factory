import { BookOpen, CheckCircle2, FileText, Loader2, RefreshCw, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useCompletedArchive } from "../../hooks/useCompletedArchive";
import { useEncounterExport } from "../../hooks/useEncounterExport";
import { cn } from "../../lib/utils";
import type { EncounterResult, GMAdviceReport, QueuedSession } from "../../types";
import { EncounterManifest } from "./EncounterManifest";
import { GMAdvisorReport } from "./GMAdvisorReport";

const mapFinalStateToResult = (session: QueuedSession): EncounterResult => {
  const finalState = session.finalState || {};
  return {
    id: session.jobId,
    htmlContent: finalState?.publisher_output || finalState?.styled_output || "<h1>Encounter Complete</h1><p>No manifest body was archived.</p>",
    mathExplanation: "Archived Encounter Factory run.",
    mechanics: finalState?.mechanics?.mechanics && {
      ...finalState.mechanics.mechanics,
      target_difficulty: finalState.mcd?.parameters?.target_difficulty || session.data?.difficulty || "Medium",
      is_dpr_estimated: finalState.mcd?.party?.is_dpr_estimated,
      is_ac_estimated: finalState.mcd?.party?.is_ac_estimated,
      is_hp_estimated: finalState.mcd?.party?.is_hp_estimated
    },
    validation: finalState?.auditor_report && {
      passed: finalState.auditor_report.validation_passed,
      report: finalState.auditor_report.validation_report
    }
  };
};

const getTitle = (session: QueuedSession) => (
  session.title || session.data?.sessionName || (session.sessionType === "advice" ? "GM Advisor Report" : "Untitled Encounter")
);

export function CompletedArchivePanel() {
  const {
    items,
    selectedSession,
    isLoading,
    isDetailLoading,
    error,
    fetchArchive,
    fetchSessionDetail,
    setSelectedSession
  } = useCompletedArchive();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "encounter" | "advice">("all");
  const [advisorReport, setAdvisorReport] = useState<GMAdviceReport | null>(null);
  const archiveExportHandlers = useEncounterExport({
    jobId: selectedSession?.jobId || null,
    sessionId: selectedSession && (selectedSession.sessionType || "encounter") === "encounter" ? selectedSession.id : null
  });

  const filteredItems = useMemo(() => {
    return items
      .filter(item => typeFilter === "all" || (item.sessionType || "encounter") === typeFilter)
      .filter(item => {
        const haystack = `${getTitle(item)} ${item.clientName} ${item.status}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      })
      .sort((a, b) => new Date(b.completedAt || b.updatedAt || b.createdAt).getTime() - new Date(a.completedAt || a.updatedAt || a.createdAt).getTime());
  }, [items, query, typeFilter]);

  const handleSelect = async (session: QueuedSession) => {
    setAdvisorReport(null);
    const detail = await fetchSessionDetail(session.id);
    if (detail?.sessionType === "advice" && detail.adviceReport) {
      setAdvisorReport(detail.adviceReport);
    }
  };

  const selectedEncounter = selectedSession && (selectedSession.sessionType || "encounter") === "encounter" && selectedSession.finalState
    ? mapFinalStateToResult(selectedSession)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Completed Archive</h3>
          <p className="text-xs font-medium text-zinc-500">Browse completed encounter manifests and GM Advisor reports.</p>
        </div>
        <button
          onClick={fetchArchive}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-full border border-white/5 bg-zinc-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search archive..."
            className="w-full rounded-full border border-zinc-800 bg-zinc-900/50 py-2 pl-10 pr-4 text-xs font-medium text-zinc-200 outline-none transition-all focus:border-primary/50"
          />
        </div>
        <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-1">
          {(["all", "encounter", "advice"] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setTypeFilter(filter)}
              className={cn(
                "rounded-md px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all",
                typeFilter === filter ? "bg-primary text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-3">
          {isLoading && (
            <div className="premium-card p-8 text-center text-xs font-bold uppercase tracking-widest text-zinc-500">
              Loading Archive...
            </div>
          )}

          {!isLoading && filteredItems.length === 0 && (
            <div className="premium-card p-10 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-zinc-700" />
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500">No completed records found.</p>
            </div>
          )}

          {filteredItems.map(item => {
            const type = item.sessionType || "encounter";
            const TypeIcon = type === "advice" ? Sparkles : FileText;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className={cn(
                  "premium-card w-full p-4 text-left transition-all hover:border-primary/40",
                  selectedSession?.id === item.id && "border-primary/50 bg-primary/5"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "rounded-xl border p-2",
                    type === "advice" ? "border-violet-500/20 bg-violet-500/10 text-violet-300" : "border-primary/20 bg-primary/10 text-primary"
                  )}>
                    <TypeIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest",
                        type === "advice" ? "border-violet-500/30 bg-violet-500/10 text-violet-300" : "border-primary/30 bg-primary/10 text-primary"
                      )}>
                        {type}
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">{item.status}</span>
                    </div>
                    <p className="truncate text-sm font-black uppercase italic tracking-tight text-white">{getTitle(item)}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{item.clientName}</p>
                    <p className="text-[10px] text-zinc-600">{new Date(item.completedAt || item.updatedAt || item.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="min-h-[360px]">
          {isDetailLoading && (
            <div className="premium-card flex min-h-[360px] items-center justify-center gap-3 text-xs font-black uppercase tracking-widest text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading Detail
            </div>
          )}

          {!isDetailLoading && !selectedSession && (
            <div className="premium-card flex min-h-[360px] flex-col items-center justify-center gap-3 p-10 text-center">
              <BookOpen className="h-10 w-10 text-zinc-700" />
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Select an archive record to review.</p>
            </div>
          )}

          {!isDetailLoading && selectedEncounter && (
            <EncounterManifest
              result={selectedEncounter}
              onExportHtml={archiveExportHandlers.handleExportHtml}
              onExportVtt={archiveExportHandlers.handleExportVtt}
              onExportObsidian={archiveExportHandlers.handleExportObsidian}
              isExportingHtml={archiveExportHandlers.isExportingHtml}
              isExportingVtt={archiveExportHandlers.isExportingVtt}
              isExportingObsidian={archiveExportHandlers.isExportingObsidian}
              onNewEncounter={() => setSelectedSession(null)}
              exportError={archiveExportHandlers.exportError}
            />
          )}

          {!isDetailLoading && selectedSession?.sessionType === "advice" && (
            <div className="premium-card flex min-h-[360px] flex-col items-center justify-center gap-4 p-10 text-center">
              <Sparkles className="h-10 w-10 text-violet-400" />
              <div>
                <h4 className="text-lg font-black uppercase italic tracking-tighter text-white">{getTitle(selectedSession)}</h4>
                <p className="text-xs font-medium text-zinc-500">GM Advisor report loaded.</p>
              </div>
              <button
                onClick={() => selectedSession.adviceReport && setAdvisorReport(selectedSession.adviceReport)}
                className="rounded-full bg-violet-600 px-5 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-violet-700"
              >
                Open Advisor Report
              </button>
            </div>
          )}
        </div>
      </div>

      {advisorReport && (
        <GMAdvisorReport
          report={advisorReport}
          startLevel={selectedSession?.adviceRequest?.startLevel || 5}
          onClose={() => setAdvisorReport(null)}
        />
      )}
    </div>
  );
}
