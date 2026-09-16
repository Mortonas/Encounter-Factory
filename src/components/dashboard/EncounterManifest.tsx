import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { AlertCircle, Download, RotateCcw, AlertTriangle, Hourglass, Zap, Eye, Printer, Terminal, ClipboardCopy, Check, BookOpen } from "lucide-react";
import { EncounterResult } from "../../types";
import { BalanceGauge } from "../BalanceGauge";
import { ValidationPanel } from "../ValidationPanel";
import { sanitizeHtml } from "../../utils/sanitizeHtml";

interface EncounterManifestProps {
  result: EncounterResult;
  onExportHtml: () => void;
  onExportVtt: () => void;
  onExportObsidian: () => void;
  isExportingVtt?: boolean;
  isExportingHtml?: boolean;
  isExportingObsidian?: boolean;
  onNewEncounter: () => void;
  exportError?: boolean;
  onGenerateAdvice?: () => void;
}

type ViewMode = 'grimoire' | 'tactical' | 'print';

const getSeverityStyles = (severity: string) => {
  switch (severity) {
    case "critical":
      return "border-rose-500/50 bg-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.1)] text-rose-950";
    case "warning":
      return "border-amber-500/50 bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)] text-amber-950";
    default:
      return "border-zinc-800 bg-zinc-900/50 text-zinc-400";
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case "critical": return <Zap className="w-4 h-4" />;
    case "warning": return <Hourglass className="w-4 h-4" />;
    default: return <AlertTriangle className="w-4 h-4" />;
  }
};

export function EncounterManifest({ 
  result, 
  onExportHtml,
  onExportVtt,
  onExportObsidian,
  isExportingVtt,
  isExportingHtml,
  isExportingObsidian,
  onNewEncounter, 
  exportError,
  onGenerateAdvice
}: EncounterManifestProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('encounter_builder_view_mode') as ViewMode) || 'grimoire';
  });

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem('encounter_builder_view_mode', viewMode);
  }, [viewMode]);

  const handleCopyToClipboard = async () => {
    const sanitize = (str: string | number) => String(str || '').replace(/\|/g, '\\|').replace(/[\n\r]/g, ' ');
    
    let markdown = "```markdown\n";
    markdown += `### ⚔️ Encounter Tactical Data\n\n`;
    
    // Group by Actor
    const breakdown: any[] = [];
    if (result.phase_breakdown) {
      Object.entries(result.phase_breakdown).forEach(([actorName, phases]) => {
        if (Array.isArray(phases)) {
          phases.forEach(p => {
            breakdown.push({
              ...p,
              actor: actorName
            });
          });
        }
      });
    }
    const actors = Array.from(new Set(breakdown.map(p => String(p.actor || ''))));
    
    actors.forEach(actor => {
      const actorPhases = breakdown.filter(p => p.actor === actor);
      markdown += `#### ${sanitize(actor)}\n`;
      markdown += `| Phase | HP | AC | DPR | Trigger |\n`;
      markdown += `| :--- | :--- | :--- | :--- | :--- |\n`;
      
      actorPhases.forEach(p => {
        markdown += `| ${sanitize(p.name)} | ${p.hp} | ${p.ac} | ${p.dpr} | ${sanitize(p.trigger)} |\n`;
      });
      
      markdown += `\n**Tactical Notes:**\n`;
      actorPhases.forEach(p => {
        if (p.traits?.length) {
          markdown += `- *${sanitize(p.name)}:* ${p.traits.map(t => sanitize(t)).join(', ')}\n`;
        }
      });
      markdown += `\n---\n\n`;
    });

    markdown += "```";

    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy tactical data:', err);
    }
  };

  // --- Severity Suppression Logic ---
  const auditResults = result.validation?.phase_duration_audit || [];
  const groupedAudits = auditResults.reduce((acc, audit) => {
    const key = `${audit.actor}-phase-${audit.phase}`;
    const current = acc[key];
    
    const severityWeight = { critical: 3, warning: 2, info: 1 };
    const auditSev = (audit.severity || "info") as keyof typeof severityWeight;
    const currentSev = (current?.severity || "info") as keyof typeof severityWeight;

    if (!current || severityWeight[auditSev] > severityWeight[currentSev]) {
      acc[key] = audit;
    }
    return acc;
  }, {} as Record<string, any>);

  const finalAudits = (Object.values(groupedAudits) as any[]).filter(a => a.severity !== "info");

  // Group by actor for the UI
  const actorAudits = finalAudits.reduce((acc, audit) => {
    if (!acc[audit.actor]) acc[audit.actor] = [];
    acc[audit.actor].push(audit);
    return acc;
  }, {} as Record<string, any[]>);

  const getThemeClass = () => {
    switch(viewMode) {
      case 'grimoire': return 'grimoire-theme';
      case 'tactical': return 'tactical-theme';
      case 'print': return 'print-theme';
      default: return 'grimoire-theme';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 pb-20"
    >
      <AnimatePresence>
        {exportError && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-center gap-4 text-primary mb-2 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-xs font-bold uppercase tracking-tight">
                The Forge overheated during export. Please wait a moment and try again.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight uppercase italic tracking-tighter">Encounter Manifest</h2>
          <p className="text-xs text-zinc-500 font-mono">Job ID: {result.id?.substring(0, 8)}</p>
        </div>

        {/* PH9: THEME TOGGLE */}
        <div className="flex items-center gap-4 bg-zinc-900/40 p-1.5 rounded-2xl border border-white/5 shadow-inner backdrop-blur-sm print:hidden">
          <div className="flex gap-1">
            {(['grimoire', 'tactical', 'print'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                  viewMode === mode 
                    ? 'bg-primary text-white shadow-[0_0_15px_rgba(167,139,250,0.4)] scale-105' 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                {mode === 'grimoire' && <Eye className="w-3 h-3" />}
                {mode === 'tactical' && <Terminal className="w-3 h-3" />}
                {mode === 'print' && <Printer className="w-3 h-3" />}
                {mode}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {viewMode === 'tactical' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -10 }}
                className="flex items-center pl-2 border-l border-white/10"
              >
                <button
                  onClick={handleCopyToClipboard}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                    copied 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  {copied ? <Check className="w-3 h-3" /> : <ClipboardCopy className="w-3 h-3" />}
                  {copied ? 'COPIED TO VTT' : 'COPY TACTICAL DATA'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onExportHtml}
            disabled={isExportingHtml}
            className="flex items-center gap-2 bg-violet-600/20 backdrop-blur-xl border border-violet-500/30 text-violet-400 px-6 py-2 rounded-full font-bold text-xs hover:bg-violet-600/30 transition-all shadow-[0_0_20px_rgba(124,58,237,0.15)] disabled:opacity-50"
          >
            {isExportingHtml ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            DIGITAL GRIMOIRE (.HTML)
          </button>
          
          <button
            onClick={onExportObsidian}
            disabled={isExportingObsidian}
            className="flex items-center gap-2 bg-blue-500/20 backdrop-blur-xl border border-blue-500/30 text-blue-400 px-6 py-2 rounded-full font-bold text-xs hover:bg-blue-500/30 transition-all shadow-[0_0_20px_rgba(59,130,246,0.1)] disabled:opacity-50"
          >
            {isExportingObsidian ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            OBSIDIAN READY (.MD)
          </button>

          <button
            onClick={onExportVtt}
            disabled={isExportingVtt}
            className="flex items-center gap-2 bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/30 text-emerald-400 px-6 py-2 rounded-full font-bold text-xs hover:emerald-500/30 transition-all shadow-[0_0_20px_rgba(16,185,129,0.1)] disabled:opacity-50"
          >
            {isExportingVtt ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            VTT STATBLOCKS (.MD)
          </button>

          {onGenerateAdvice && (
            <button
              onClick={onGenerateAdvice}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-750 text-white px-6 py-2 rounded-full font-bold text-xs transition-all shadow-[0_0_20px_rgba(167,139,250,0.2)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <BookOpen className="w-4 h-4" />
              TACTICAL ADVICE
            </button>
          )}

          <button
            onClick={onNewEncounter}
            className="flex items-center gap-2 bg-zinc-800 text-zinc-400 px-4 py-2 rounded-full font-bold text-xs hover:bg-zinc-700 transition-all"
          >
            <RotateCcw className="w-3 h-3" /> NEW
          </button>
        </div>
      </div>

      {result.mechanics && <BalanceGauge mechanics={result.mechanics} />}
      {result.validation && <ValidationPanel validation={result.validation} />}

      {/* PH9: SIMULATION AUDIT FEED */}
      <div className="space-y-4 print:hidden">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-rose-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Simulation Integrity Audit</h3>
          </div>
        </div>
        
        {auditResults.length > 0 && (
          <div className="max-h-[320px] overflow-y-auto pr-4 custom-scrollbar space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
              {Array.from(new Set(auditResults.map(a => a.actor))).map((actorName) => {
                const audits = actorAudits[actorName] || [];
                return (
                  <div key={actorName} className="space-y-3">
                    <div className="flex items-center justify-between px-1 mb-2">
                      <p className="text-[10px] font-black uppercase text-zinc-500 tracking-tighter">
                        Entity: {actorName}
                      </p>
                      {audits.length === 0 && (
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                          <span className="text-[8px] font-black text-emerald-400 uppercase tracking-tighter">Optimal Simulation</span>
                        </div>
                      )}
                    </div>
                    
                    {audits.length > 0 ? (
                      <div className="space-y-3">
                        {audits.map((audit, i) => (
                          <motion.div
                            key={`${actorName}-${i}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`p-4 rounded-xl border flex flex-col gap-2 transition-all ${getSeverityStyles(audit.severity)}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getSeverityIcon(audit.severity)}
                                <span className="text-[10px] font-bold uppercase tracking-tight">
                                  Phase {audit.phase}: {audit.severity === "critical" ? "Bypass Risk" : "Narrative Risk"}
                                </span>
                              </div>
                              <span className="text-[9px] font-mono opacity-60">
                                {audit.duration} ROUNDS
                              </span>
                            </div>
                            <p className="text-[11px] leading-relaxed font-medium">
                              {audit.audit_note}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 flex items-center justify-center py-8">
                         <p className="text-[10px] font-bold text-emerald-500/40 uppercase tracking-[0.2em]">Zero Risks Detected</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className={`premium-card p-0 shadow-2xl rounded-sm overflow-hidden ring-1 ring-black/5 transition-all duration-700 ${getThemeClass()}`}>
        <div 
          className="encounter-preview min-h-[800px]"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(result.htmlContent) }}
        />
      </div>
    </motion.div>
  );
}
