import { motion, AnimatePresence } from "motion/react";
import { Terminal, BrainCircuit, AlertTriangle, CheckCircle, Info, Cpu, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { ForgeLog } from "../../types";
import { cn } from "../../lib/utils";

interface SystemTerminalProps {
  logs: ForgeLog[];
  isStreaming?: boolean;
}

/**
 * SystemTerminal
 * 
 * A high-fidelity console output for the Encounter Forge.
 * Visualizes the raw bot feed and the cinematic "Reasoning" trace.
 * Features a sensitive scroll-lock to prevent "scroll-jacking" during audits.
 */
export function SystemTerminal({ logs, isStreaming }: SystemTerminalProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef<number>(0);

  // ─── Scroll-Lock Logic ──────────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    
    // Safety margin to prevent accidental un-pinning from fractional pixel shifts (15px)
    // Wrap in Math.ceil to protect against sub-pixel rounding errors
    const isAtBottom = Math.ceil(scrollHeight - scrollTop - clientHeight) < 15;
    
    // If user scrolls up, disable auto-scroll
    if (!isAtBottom && scrollTop < lastScrollTop.current) {
      setAutoScroll(false);
    } 
    
    // If user manually scrolls back to the very bottom, re-enable
    if (isAtBottom) {
      setAutoScroll(true);
    }

    lastScrollTop.current = scrollTop;
  }, []);

  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
      setAutoScroll(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/80 border border-zinc-800 rounded-xl overflow-hidden backdrop-blur-xl shadow-2xl relative">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-3 h-3 text-cc-ruby" />
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Intelligence.Feed</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full bg-cc-ruby", isStreaming && "animate-pulse")} />
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">Live_Trace</span>
          </div>
        </div>
      </div>

      {/* Log Feed */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-[11px] custom-scrollbar"
      >
        <AnimatePresence initial={false}>
          {logs.map((log, idx) => (
            <motion.div
              key={`${log.timestamp}-${idx}`}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-2"
            >
              {/* Log Main Line */}
              <div className="flex items-start gap-3">
                <span className="text-zinc-700 shrink-0 select-none tracking-tighter">[{log.timestamp}]</span>
                
                <div className={cn(
                  "flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight shrink-0",
                  log.level === "error" ? "bg-red-500/10 text-red-500" :
                  log.level === "warn" ? "bg-orange-500/10 text-orange-500" :
                  log.level === "success" ? "bg-cc-emerald/10 text-cc-emerald" :
                  log.level === "system" ? "bg-cc-ruby/10 text-cc-ruby border border-cc-ruby/20" :
                  "bg-zinc-800 text-zinc-400"
                )}>
                  {log.level === "error" && <AlertTriangle className="w-2.5 h-2.5" />}
                  {log.level === "success" && <CheckCircle className="w-2.5 h-2.5" />}
                  {log.level === "system" && <Cpu className="w-2.5 h-2.5" />}
                  {log.level === "info" && <Info className="w-2.5 h-2.5" />}
                  {log.botName}
                </div>

                <span className={cn(
                  "flex-1 leading-relaxed brutal-text lowercase text-[10px]",
                  log.level === "error" ? "text-red-400" :
                  log.level === "warn" ? "text-orange-400" :
                  log.level === "success" ? "text-cc-emerald" :
                  log.level === "system" ? "text-cc-ruby italic font-bold" :
                  "text-zinc-300"
                )}>
                  {log.message}
                </span>
              </div>

              {/* Bot Reasoning (The Architect's Monologue) */}
              {log.reasoning && (
                <div className="ml-10 relative">
                  <div className="absolute left-[-15px] top-0 bottom-0 w-px bg-zinc-800" />
                  <div className="flex items-start gap-3 p-4 glass-premium border-cc-ruby/20 rounded-lg group hover:border-cc-ruby/40 transition-all ruby-glow">
                    <BrainCircuit className="w-4 h-4 text-cc-ruby mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cc-ruby/60 mb-1">Reasoning_Trace</p>
                      <p className="text-zinc-200 italic leading-relaxed text-[11px] font-medium selection:bg-cc-ruby/30">
                        {log.reasoning}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Cursor / Idle Indicator */}
        {isStreaming && (
          <div className="flex items-center gap-2 text-cc-ruby pt-2">
            <div className="w-1.5 h-3 bg-cc-ruby animate-pulse" />
            <span className="text-[9px] font-bold uppercase tracking-widest animate-pulse">Awaiting_Bot_Reasoning...</span>
          </div>
        )}
      </div>

      {/* ─── Jump to Live Button ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {!autoScroll && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-cc-ruby text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:scale-105 transition-transform z-20"
          >
            <ChevronDown className="w-3 h-3" />
            Jump to Live
          </motion.button>
        )}
      </AnimatePresence>

      {/* Terminal Footer */}
      <div className="px-4 py-1.5 bg-zinc-900/30 border-t border-zinc-800 flex items-center justify-between text-[9px] font-medium text-zinc-600">
        <div className="flex items-center gap-3">
          <span>Log_Count: {logs.length}</span>
          <span className={cn(autoScroll ? "text-cc-ruby" : "text-zinc-500")}>
            Sync: {autoScroll ? "ACTIVE" : "PAUSED"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="animate-pulse opacity-50">●</span>
          <span>5.5e_ARCHITECT_ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
