import { useState, useEffect } from "react";
import { ChevronRight, Lightbulb } from "lucide-react";
import { QueuedSession } from "../../types";

interface ForgeAnalyticsProps {
  sessions: QueuedSession[];
  onExportLogs?: () => void;
  onMassCrystallize?: () => void;
  isLoading?: boolean;
}

const DESIGNER_TIPS = [
  "The math is the foundation. If the DPR:HP ratio slips, the tension evaporates. Use the Auditor to enforce the 4:10 rule.",
  "Never run a true solo boss. Use fragile minions to soak player actions and prevent the party from overwhelming your anchor.",
  "AC stays low; Attack Bonuses stay high. Prioritize hitting over dodging to keep the game's momentum forward.",
  "Every tactical map must feature specific terrain that rewards Push, Topple, or Slow weapon masteries.",
  "Phased encounters beat spongy health pools. Break the boss fight into waves to force players to pace their resources.",
  "Give your boss Initiative Expertise. Ensuring the anchor acts before the party can establish a threat is critical for tension.",
  "Design encounters for 100% Party HP Expenditure on deadly days. Mechanical integrity is the foundation of narrative tension."
];

export function ForgeAnalytics({ 
  sessions, 
  onExportLogs, 
  onMassCrystallize, 
  isLoading 
}: ForgeAnalyticsProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const newBriefings = sessions.filter(s => s.status === "new").length;

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % DESIGNER_TIPS.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="space-y-4">
      <div className="premium-card p-6 bg-primary/5 border-primary/20">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">Sequence Analytics</h4>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase">Queue Depth</span>
            <span className="text-xl font-black italic text-zinc-100">{sessions.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase">New Briefings</span>
            <span className="text-xl font-black italic text-primary">{newBriefings}</span>
          </div>
        </div>
      </div>
      
      <div className="premium-card p-6">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">Quick Actions</h4>
        <div className="space-y-2">
          <button 
            onClick={onExportLogs}
            disabled={isLoading}
            className="w-full text-left p-3 rounded-lg hover:bg-zinc-900 transition-all text-xs font-bold uppercase tracking-tight text-zinc-400 hover:text-white flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Exporting..." : "Export Session Logs"}
            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
          </button>
          <button 
            onClick={onMassCrystallize}
            disabled={isLoading}
            className="w-full text-left p-3 rounded-lg hover:bg-zinc-900 transition-all text-xs font-bold uppercase tracking-tight text-zinc-400 hover:text-white flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
          >
             Mass Crystallization (Alpha)
            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
          </button>
        </div>
      </div>

      <div className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-950/50 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
          <Lightbulb className="w-8 h-8 text-primary" />
        </div>
        <p className="text-[9px] text-zinc-400 font-medium italic leading-relaxed relative z-10 min-h-[40px] flex items-center">
          "{DESIGNER_TIPS[tipIndex]}"
        </p>
        <p className="text-[8px] text-zinc-500 font-black uppercase mt-3 tracking-tighter relative z-10">— Lead Mechanist Note</p>
      </div>
    </div>
  );
}
