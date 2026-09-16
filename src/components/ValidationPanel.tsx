import { motion } from "motion/react";
import { CheckCircle2, XCircle, ShieldCheck, ShieldAlert, ListChecks } from "lucide-react";
import { cn } from "../lib/utils";

interface ValidationPanelProps {
  validation: {
    passed: boolean;
    report: string;
  };
}

/**
 * ValidationPanel
 * 
 * Displays the 18-check audit report from Bot 5 (Editor/Auditor).
 * Parses the raw markdown report into a structured UI checklist.
 */
export function ValidationPanel({ validation }: ValidationPanelProps) {
  const { passed, report } = validation;

  // ─── Parsing Logic ────────────────────────────────────────────────────────
  // Bot 5 produces a markdown list of 18 checks.
  // We extract these into a structured array for clean rendering.
  const auditItems = report
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.startsWith("- [") || line.startsWith("* [") || line.match(/^[-*]\s/))
    .map(line => {
      const isChecked = line.includes("[x]");
      // Remove the markdown prefix (e.g., "- [x] " or "- ")
      const label = line
        .replace(/^[-*]\s(\[([ xX])\]\s)?/, "")
        .trim();
      
      return { label, status: isChecked ? "pass" : "fail" };
    })
    .filter(item => item.label.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "premium-card overflow-hidden",
        passed ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
      )}
    >
      {/* Header Banner */}
      <div className={cn(
        "p-4 flex items-center justify-between border-b",
        passed ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            passed ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}>
            {passed ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
          </div>
          <div>
            <h3 className={cn(
              "text-lg font-black uppercase tracking-tighter italic leading-none",
              passed ? "text-green-400" : "text-red-400"
            )}>
              {passed ? "System Integrity Verified" : "Audit Failure Detected"}
            </h3>
            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mt-1">
              Bot 5 Auditor Report • 18 Engineering Constraints
            </p>
          </div>
        </div>
        
        <div className={cn(
          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
          passed 
            ? "bg-green-500/20 text-green-400 border-green-500/30" 
            : "bg-red-500/20 text-red-400 border-red-500/30"
        )}>
          {passed ? "PASSED" : "REJECTED"}
        </div>
      </div>

      {/* Checklist Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
          {auditItems.length > 0 ? (
            auditItems.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="flex items-start gap-3 group"
              >
                <div className="mt-0.5">
                  {item.status === "pass" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500/60 group-hover:text-green-500 transition-colors" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500/60 group-hover:text-red-500 transition-colors" />
                  )}
                </div>
                <span className={cn(
                  "text-[11px] leading-tight font-medium transition-colors",
                  item.status === "pass" ? "text-zinc-400 group-hover:text-zinc-200" : "text-red-400/80 group-hover:text-red-400"
                )}>
                  {item.label}
                </span>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-8 text-zinc-600">
              <ListChecks className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-xs italic">No structured audit items found in report.</p>
              <pre className="mt-4 p-4 bg-black/40 rounded text-[10px] w-full overflow-x-auto">
                {report}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Context */}
      {!passed && (
        <div className="px-6 pb-6 pt-2">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-red-400 leading-normal">
              <span className="font-bold uppercase mr-1">GM Action Required:</span>
              The Auditor has identified mechanical or narrative contradictions that violate the current deterministic targets.
              Manual review of the generated content is recommended before session deployment.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
