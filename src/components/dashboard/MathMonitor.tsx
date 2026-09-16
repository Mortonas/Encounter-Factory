import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Shield, Sword, Zap, Hourglass, Activity, AlertCircle } from "lucide-react";
import { ForgeTelemetry } from "../../types";
import { cn } from "../../lib/utils";

interface MathMonitorProps {
  telemetry: ForgeTelemetry;
}

/**
 * MathMonitor
 * 
 * Visualizes the "Kill Clock" and mechanical telemetry.
 * 
 * Local Update Loop: This component tracks the telemetry prop via ref and 
 * syncs to local state every 100ms. This isolates the "tick" to this component,
 * preventing high-frequency telemetry updates from thrashing the parent grid layout.
 */
export const MathMonitor = React.memo(({ telemetry }: MathMonitorProps) => {
  const [displayTelemetry, setDisplayTelemetry] = useState<ForgeTelemetry>(telemetry);
  const latestTelemetryRef = useRef<ForgeTelemetry>(telemetry);

  // Sync ref with incoming props
  useEffect(() => {
    latestTelemetryRef.current = telemetry;
  }, [telemetry]);

  // Local 100ms heartbeat for display sync
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayTelemetry(latestTelemetryRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const { partyEHP, partyDPR, novaPotential, killClock, lethality, novaRisk } = displayTelemetry;

  // Derived status color for the Kill Clock
  const statusColor = useMemo(() => {
    if (novaRisk === "critical") return "text-red-500";
    if (novaRisk === "high") return "text-orange-500";
    return "text-cc-emerald";
  }, [novaRisk]);

  return (
    <div className="space-y-4">
      {/* ─── Kill Clock Header ─────────────────────────────────────────────── */}
      <div className="glass-premium p-5 border-cc-emerald/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
          <Hourglass className="w-12 h-12 text-cc-emerald" />
        </div>
        
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-cc-emerald">Kill_Clock_Manifest</h4>
            <div className={cn(
              "text-[8px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1.5",
              novaRisk === "critical" ? "bg-red-500/20 text-red-500 animate-pulse" :
              novaRisk === "high" ? "bg-orange-500/20 text-orange-500" :
              "bg-cc-emerald/20 text-cc-emerald"
            )}>
              <div className={cn("w-1 h-1 rounded-full", 
                novaRisk === "critical" ? "bg-red-500" : 
                novaRisk === "high" ? "bg-orange-500" : "bg-cc-emerald"
              )} />
              Risk: {novaRisk}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-5xl font-black italic tracking-tighter tabular-nums", statusColor)}>
              {killClock || "---"}
            </span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase italic">Rounds to TPK</span>
          </div>
        </div>
      </div>

      {/* ─── Combat Statistics ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard 
          icon={<Shield className="w-3 h-3" />} 
          label="Party EHP" 
          value={partyEHP} 
          unit="Pool"
          color="text-cc-emerald"
        />
        <MetricCard 
          icon={<Sword className="w-3 h-3" />} 
          label="Avg DPR" 
          value={partyDPR} 
          unit="Sec"
          color="text-cc-violet"
        />
        <MetricCard 
          icon={<Zap className="w-3 h-3" />} 
          label="Nova Ceiling" 
          value={novaPotential} 
          unit="Burst"
          color="text-yellow-500"
        />
        <MetricCard 
          icon={<Activity className="w-3 h-3" />} 
          label="Lethality" 
          value={`${lethality}:10`} 
          unit="Ratio"
          color="text-zinc-300"
        />
      </div>

      {/* ─── Mechanical Audit Alert ────────────────────────────────────────── */}
      {novaRisk === "critical" && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-red-500">Nova Potential Redline</p>
            <p className="text-[9px] text-zinc-400 font-medium leading-relaxed italic">
              "Party burst potential exceeds Anchor HP. Bot 4 suggesting Phase Triggers or EHP Multipliers."
            </p>
          </div>
        </motion.div>
      )}

      {/* ─── Designer Note ─────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-950/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-cc-emerald/20" />
        <p className="text-[9px] text-zinc-500 font-medium leading-relaxed italic">
          The 4:10 ratio is immutable. If the enemy DPR falls below 40% of their total HP pool, the encounter loses tactical friction.
        </p>
      </div>

      {/* ─── VTT Performance Guardrail ─────────────────────────────────────── */}
      <div className="p-3 bg-cc-violet/5 border border-cc-violet/20 rounded-xl space-y-1">
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-cc-violet" />
          <span className="text-[9px] font-black uppercase text-cc-violet tracking-widest">Performance Protocol</span>
        </div>
        <p className="text-[9px] text-zinc-500 font-medium leading-tight italic">
          "Complex rosters detected. Enable Hardware Acceleration in browser and use Compendium Packs to minimize VTT latency."
        </p>
      </div>
    </div>
  );
});

const MetricCard = React.memo(({ icon, label, value, unit, color }: { icon: any, label: string, value: any, unit: string, color: string }) => {
  return (
    <div className="glass-premium p-3 space-y-1 bg-zinc-900/40 border-white/5">
      <div className="flex items-center gap-1.5 text-zinc-500">
        <span className={cn("opacity-70", color)}>{icon}</span>
        <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-xl font-black italic tracking-tighter tabular-nums", color)}>
          {value || "---"}
        </span>
        <span className="text-[8px] font-bold text-zinc-700 uppercase italic">{unit}</span>
      </div>
    </div>
  );
});
