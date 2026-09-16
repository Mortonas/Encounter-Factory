import { motion } from "motion/react";
import { RotateCcw, Shield, Target, Zap, BookOpen } from "lucide-react";
import { QueuedSession } from "../../types";
import { cn } from "../../lib/utils";

interface ActiveSessionReviewProps {
  session: QueuedSession;
  onBack: () => void;
  onStartForge: () => void;
  onGenerateAdvice: () => void;
}

export function ActiveSessionReview({ session, onBack, onStartForge, onGenerateAdvice }: ActiveSessionReviewProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack} 
          className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-primary transition-all flex items-center gap-2"
        >
          <RotateCcw className="w-3 h-3" /> Back to Dashboard
        </button>
        <div className="text-right">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Reviewing: {session.clientName}</h2>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Received {new Date(session.createdAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="premium-card p-6 space-y-4 border-primary/20 bg-primary/5">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">The Client Rant</h3>
          <p className="text-sm font-medium leading-relaxed italic text-zinc-200">"{session.data.gmNotes || "No notes provided."}"</p>
          
          <h3 className="text-[10px] font-black uppercase tracking-widest text-primary pt-4">Tactical Concerns</h3>
          <p className="text-sm font-medium leading-relaxed text-zinc-400">"{session.data.gmConcerns || "No specific concerns flagged."}"</p>
        </div>

        <div className="space-y-4">
          <div className="premium-card p-6 space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Mission Metadata</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase text-zinc-600 block">Lethality</span>
                <span className="text-sm font-bold">{session.data.difficulty}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase text-zinc-600 block">Tone</span>
                <span className="text-sm font-bold">{session.data.tone}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase text-zinc-600 block">Setting</span>
                <span className="text-sm font-bold">{session.data.setting}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase text-zinc-600 block">Objective</span>
                <span className="text-sm font-bold">{session.data.objective}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase text-zinc-600 block">Entry State</span>
                <span className="text-sm font-bold capitalize">{session.data.entryCondition}</span>
                {session.data.entryContext && (
                  <p className="text-[10px] text-zinc-500 italic leading-tight line-clamp-2" title={session.data.entryContext}>
                    "{session.data.entryContext}"
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase text-zinc-600 block">Target Outcome</span>
                <span className="text-sm font-bold capitalize">{session.data.targetOutcome?.replace(/_/g, ' ')}</span>
                {session.data.exitContext && (
                  <p className="text-[10px] text-zinc-500 italic leading-tight line-clamp-2" title={session.data.exitContext}>
                    "{session.data.exitContext}"
                  </p>
                )}
              </div>
              <div className="col-span-2 space-y-1 pt-2 border-t border-zinc-800/50">
                <span className="text-[8px] font-black uppercase text-zinc-600 block">Engine Mode</span>
                <span className={cn("text-[10px] font-bold uppercase tracking-wider", session.data.letDiceFall ? "text-green-500" : "text-primary")}>
                  {session.data.letDiceFall ? "Classical: Unpredictable Fate" : "Fate-Locked: Controlled Narrative Balance"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={onStartForge}
              className="w-full bg-primary hover:bg-red-600 text-white py-4 rounded-xl font-black italic uppercase tracking-tighter text-lg shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Engage The Forge
            </button>
            <button 
              onClick={onGenerateAdvice}
              className="w-full bg-violet-600 hover:bg-violet-750 text-white py-3 rounded-xl font-black italic uppercase tracking-tighter text-xs shadow-[0_0_20px_rgba(167,139,250,0.15)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 border border-violet-500/20"
            >
              <BookOpen className="w-4 h-4" />
              Generate GM Advice Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
