import { useState } from "react";
import { motion } from "motion/react";
import { ShieldAlert, Zap, Skull, Timer, Target, Info } from "lucide-react";
import { cn } from "../lib/utils";
// Import the shared type derived from ZodMechanicsSchema so the component's
// prop contract is always identical to the server's validated output.
import type { MechanicsData } from "../../server/types";

// ─── Static lookup maps ──────────────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy:   "text-green-400 bg-green-500/10 border-green-500/30",
  Medium: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  Hard:   "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  Deadly: "text-red-500 bg-red-500/10 border-red-500/30",
  Mythic: "text-purple-500 bg-purple-500/10 border-purple-500/30",
};

const DIFFICULTY_WIDTHS: Record<string, string> = {
  Easy:   "20%",
  Medium: "40%",
  Hard:   "60%",
  Deadly: "80%",
  Mythic: "100%",
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface BalanceGaugeProps {
  mechanics: MechanicsData & { 
    target_difficulty: string;
    is_dpr_estimated?: boolean;
    is_ac_estimated?: boolean;
    is_hp_estimated?: boolean;
  };
}

// ─── Tooltip Component ───────────────────────────────────────────────────────

function EstimateBadge({ label }: { label: string }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div 
      className="group relative flex items-center gap-1 cursor-help"
      onClick={() => setShowTooltip(!showTooltip)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Info className="w-3 h-3 text-warning animate-pulse" />
      <span className="text-[9px] text-warning uppercase font-bold tracking-widest">Estimated</span>
      
      {/* Tooltip */}
      <div className={cn(
        "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-warning/50 text-[10px] text-white whitespace-nowrap transition-all pointer-events-none z-50 shadow-xl shadow-black/50",
        showTooltip ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
      )}>
        AI-Estimated Baseline: {label}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 w-1.5 h-1.5 bg-zinc-900 border-r border-b border-warning/50" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function BalanceGauge({ mechanics }: BalanceGaugeProps) {
  const currentDiffColor =
    DIFFICULTY_COLORS[mechanics.target_difficulty] ?? DIFFICULTY_COLORS.Medium;
  const currentDiffWidth =
    DIFFICULTY_WIDTHS[mechanics.target_difficulty] ?? "40%";

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
      {/* Difficulty Meter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("premium-card p-4 flex flex-col items-center justify-center text-center", currentDiffColor)}
      >
        <span className="text-[10px] uppercase font-bold tracking-tighter opacity-70 mb-1">Encounter Intensity</span>
        <div className="text-xl font-black uppercase tracking-tighter italic">{mechanics.target_difficulty}</div>
        <div className="w-full h-1 bg-zinc-800 rounded-full mt-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: currentDiffWidth }}
            className="h-full bg-current"
          />
        </div>
      </motion.div>

      {/* Lethality Gauge (DPR) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={cn(
          "premium-card p-4 flex flex-col transition-all",
          mechanics.is_dpr_estimated 
            ? "border-warning/40 bg-warning/5" 
            : "border-zinc-800 bg-zinc-950/50"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className={cn("w-4 h-4", mechanics.is_dpr_estimated ? "text-warning" : "text-primary")} />
            <span className="text-[10px] uppercase font-bold text-zinc-500">Lethality Index</span>
          </div>
          {mechanics.is_dpr_estimated && <EstimateBadge label="DPR Assumption" />}
        </div>
        <div className="flex items-baseline gap-1">
          <span className={cn("text-2xl font-black", mechanics.is_dpr_estimated ? "text-warning" : "text-white")}>
            {mechanics.damage_per_round_target}
          </span>
          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">DPR</span>
        </div>
        <div className="text-[10px] text-zinc-600 mt-1 leading-tight">
          Calibrated for Tier {mechanics.tier} party attrition rates.
        </div>
      </motion.div>

      {/* Lifespan Metric */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={cn(
          "premium-card p-4 flex flex-col transition-all",
          mechanics.is_hp_estimated 
            ? "border-warning/40 bg-warning/5" 
            : "border-zinc-800 bg-zinc-950/50"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Timer className={cn("w-4 h-4", mechanics.is_hp_estimated ? "text-warning" : "text-primary")} />
            <span className="text-[10px] uppercase font-bold text-zinc-500">Estimated Lifespan</span>
          </div>
          {mechanics.is_hp_estimated && <EstimateBadge label="HP Assumption" />}
        </div>
        <div className="flex items-baseline gap-1">
          <span className={cn("text-2xl font-black", mechanics.is_hp_estimated ? "text-warning" : "text-white")}>
            {mechanics.estimated_lifespan_rounds.toFixed(1)}
          </span>
          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Rounds</span>
        </div>
        <div className="text-[10px] text-zinc-600 mt-1 leading-tight">
          Total Roster EHP: {mechanics.total_roster_hp}
        </div>
      </motion.div>

      {/* Nova DPR Audit Trail */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="premium-card p-4 border-zinc-800 bg-zinc-950/50 flex flex-col"
      >
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-orange-400" />
          <span className="text-[10px] uppercase font-bold text-zinc-500">Nova Strike (R1)</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-white">{mechanics.nova_dpr_estimated}</span>
          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">HP Burst</span>
        </div>
        <div className="text-[10px] text-zinc-600 mt-1 leading-tight">
          Anchor min required: {mechanics.anchor_hp_range.min} HP
        </div>
      </motion.div>

      {/* Slog Risk / Pacing Block (New Row) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className={cn(
          "col-span-full premium-card p-4 flex flex-col md:flex-row items-center justify-between gap-4 border-dashed",
          mechanics.slog_risk_warning
            ? "border-amber-500/50 bg-amber-500/5"
            : "border-zinc-800 bg-zinc-950/50"
        )}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            mechanics.slog_risk_warning ? "bg-amber-500/20 text-amber-500" : "bg-zinc-800 text-zinc-500"
          )}>
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-zinc-500">Estimated Combat Duration</div>
            <div className="text-lg font-black text-white italic tracking-tight">
              ~{mechanics.pacing_estimate_minutes} MINUTES
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-md">
          {mechanics.slog_risk_warning ? (
            <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg flex items-center gap-3">
              <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-[10px] font-bold text-amber-200/80 leading-snug">
                <span className="text-amber-500 uppercase">Slog Risk Detected:</span> Homogenous roster or high pacing estimate. Tactical variety prescription has been issued in Section 7.
              </p>
            </div>
          ) : (
            <div className="text-[10px] text-zinc-500 italic">
              Tactical variety audit passed. No significant slog indicators detected for this roster composition.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
