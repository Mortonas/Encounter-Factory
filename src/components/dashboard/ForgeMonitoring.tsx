import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, Activity, Layout } from "lucide-react";
import { PipelineStep, ForgeLog, ForgeTelemetry } from "../../types";
import { SequenceWaterfall } from "./SequenceWaterfall";
import { SystemTerminal } from "./SystemTerminal";
import { MathMonitor } from "./MathMonitor";
import { sanitizeHtml } from "../../utils/sanitizeHtml";

interface ForgeMonitoringProps {
  pipeline: PipelineStep[];
  logs: ForgeLog[];
  telemetry: ForgeTelemetry;
  streamingResult: string;
  error: string | null;
  onBack: () => void;
}

/**
 * ForgeMonitoring
 * 
 * The "Forge Command Center" (Systems Diagnostic Console).
 * Features an asymmetric grid (15% / 55% / 30%) with responsive reflow.
 * 
 * 1. Sequence Waterfall (Left): Diagnostic Checklist (Violet).
 * 2. Intelligence Feed (Center): Architect's Monologue (Ruby).
 * 3. Vital Signs Monitor (Right): Kill Clock & Telemetry (Emerald).
 */
export function ForgeMonitoring({ 
  pipeline, 
  logs, 
  telemetry, 
  streamingResult, 
  error,
  onBack 
}: ForgeMonitoringProps) {
  const isProcessing = pipeline.some(s => s.status === "processing");
  const isAuditorDone = pipeline[6]?.status === "completed"; // Bot 5 (Auditor)
  const isBot8Active = pipeline[7]?.status === "processing" || pipeline[7]?.status === "completed";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-[1600px] mx-auto space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_320px] gap-6 h-[85vh] min-h-[700px]">
        {/* ─── Pane 1: Diagnostic Checklist (15% approx) ────────────────────── */}
        <div className="flex flex-col gap-4 overflow-hidden bg-zinc-950/40 border border-zinc-800/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2 px-2">
            <div className="w-1 h-3 bg-cc-violet" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Diagnostic.Sequence</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <SequenceWaterfall pipeline={pipeline} />
          </div>
        </div>

        {/* ─── Pane 2: Intelligence Feed (55% approx) ───────────────────────── */}
        <div className="flex flex-col gap-4 relative overflow-hidden group">
          <SystemTerminal 
            logs={logs} 
            isStreaming={isProcessing} 
          />

          {/* ─── Error Overlay ──────────────────────────────────────────────── */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-8"
              >
                <div className="max-w-md w-full bg-zinc-900 border border-primary/30 p-8 rounded-2xl space-y-6 text-center shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black uppercase tracking-tighter italic text-white">System Failure</h3>
                    <p className="text-sm font-medium text-zinc-400 leading-relaxed">
                      {error}
                    </p>
                  </div>
                  <button 
                    onClick={onBack}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all"
                  >
                    Return to Console
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* ─── Bot 8: Final Assembly "Crystallization" Overlay ────────────── */}
          <AnimatePresence>
            {isBot8Active && isAuditorDone && (
              <motion.div 
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
                exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                className="absolute inset-0 z-30 bg-zinc-950/60 flex flex-col items-center justify-center p-8 overflow-hidden"
              >
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-full max-w-2xl glass-premium border-cc-violet/30 p-8 flex flex-col gap-6 relative"
                >
                  {/* Decorative Scanline */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cc-violet/5 to-transparent h-20 animate-scanline pointer-events-none" />
                  
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                      <Layout className="w-5 h-5 text-cc-violet animate-pulse" />
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">Final_Assembly_Sequence</h3>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Bot 8: Semantic HTML Crystallization</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-cc-violet/10 border border-cc-violet/20 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-cc-violet animate-ping" />
                      <span className="text-[9px] font-black text-cc-violet uppercase">Crystallizing</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-hidden opacity-40 select-none relative h-[300px]">
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent z-10" />
                    <div 
                      className="prose prose-invert prose-sm pointer-events-none scale-90 origin-top"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(streamingResult || "<h1>Initializing_Semantic_Structure...</h1>") }}
                    />
                  </div>

                  <div className="flex items-center justify-center gap-4 pt-4">
                    <div className="flex-1 h-px bg-zinc-800" />
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Auditor_Approved</span>
                    <div className="flex-1 h-px bg-zinc-800" />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── Pane 3: Vital Signs Monitor (30% approx) ────────────────────── */}
        <div className="flex flex-col gap-4 overflow-hidden bg-zinc-950/40 border border-zinc-800/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2 px-2">
            <Activity className="w-3 h-3 text-cc-emerald" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Mechanical.Vitals</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <MathMonitor telemetry={telemetry} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanline {
          from { top: -20%; }
          to { top: 120%; }
        }
        .animate-scanline {
          animation: scanline 4s linear infinite;
        }
      `}</style>
    </motion.div>
  );
}
