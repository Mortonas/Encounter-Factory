import { motion } from "motion/react";
import { CheckCircle2, Loader2, AlertCircle, Clock, Zap } from "lucide-react";
import { PipelineStep } from "../../types";
import { cn } from "../../lib/utils";

interface SequenceWaterfallProps {
  pipeline: PipelineStep[];
}

/**
 * SequenceWaterfall
 * 
 * A vertical visualization of the 8-Bot Encounter Factory pipeline.
 * Refined for the "Diagnostic Sequence" console aesthetic.
 * Violet (#a78bfa) = Processing | Emerald (#10b981) = Completed.
 */
export function SequenceWaterfall({ pipeline }: SequenceWaterfallProps) {
  return (
    <div className="space-y-3 relative py-2">
      {/* Visual Connection Line */}
      <div className="absolute left-[19px] top-6 bottom-6 w-[1px] bg-zinc-800" />

      {pipeline.map((step, idx) => {
        const isCompleted = step.status === "completed";
        const isProcessing = step.status === "processing";
        const isError = step.status === "error";
        const isPending = step.status === "pending";

        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "relative pl-12 py-2.5 group transition-all duration-500",
              isPending && "opacity-25",
              isProcessing && "scale-[1.02]"
            )}
          >
            {/* Status Icon */}
            <div className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 z-10 bg-zinc-950",
              isCompleted ? "border-[#10b981]/50 bg-[#10b981]/5" :
              isProcessing ? "border-[#a78bfa] shadow-[0_0_15px_rgba(167,139,250,0.2)] bg-[#a78bfa]/5" :
              isError ? "border-red-600 bg-red-600/5" :
              "border-zinc-800/50"
            )}>
              {isCompleted && <CheckCircle2 className="w-5 h-5 text-[#10b981]" />}
              {isProcessing && <Loader2 className="w-5 h-5 text-[#a78bfa] animate-spin" />}
              {isError && <AlertCircle className="w-5 h-5 text-red-600" />}
              {isPending && <Clock className="w-4 h-4 text-zinc-800" />}
            </div>

            {/* Step Details */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest transition-colors",
                  isProcessing ? "text-[#a78bfa]" : 
                  isCompleted ? "text-[#10b981]/70" : "text-zinc-600"
                )}>
                  {step.bot}
                </span>
                {isProcessing && (
                  <motion.div 
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-1 h-1 rounded-full bg-[#a78bfa]" 
                  />
                )}
              </div>
              <h4 className={cn(
                "text-[11px] font-black uppercase tracking-tight transition-colors",
                isCompleted ? "text-zinc-300" : 
                isProcessing ? "text-white" : "text-zinc-700"
              )}>
                {step.name}
              </h4>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">
                  {step.task}
                </span>
                {isProcessing && (
                  <span className="flex items-center gap-1 text-[7px] font-black text-[#a78bfa]/60 uppercase tracking-widest">
                    <Zap className="w-2 h-2 fill-current" />
                    Syncing
                  </span>
                )}
              </div>
            </div>

            {/* Active Highlight Overlay */}
            {isProcessing && (
              <motion.div 
                layoutId="active-highlight"
                className="absolute inset-0 bg-[#a78bfa]/5 rounded-2xl -z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
