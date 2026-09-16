import { useState } from "react";
import { motion } from "motion/react";
import { 
  Swords, 
  CheckCircle2,
  Shield,
  Terminal,
  Users,
  Handshake,
  Youtube,
  ExternalLink
} from "lucide-react";
import { useSafeSetup } from "../hooks/useSafeSetup";
import { MissionProfile } from "./briefing/MissionProfile";
import { PartyDossiers } from "./briefing/PartyDossiers";
import { AlliedForces } from "./briefing/AlliedForces";
import { NarrativeDossier } from "./briefing/NarrativeDossier";
import { EnemyDossiers } from "./briefing/EnemyDossiers";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import type { CreateSessionRequest } from "../types";

interface BriefingFormProps {
  onComplete: (request: CreateSessionRequest) => Promise<void>;
}

export function BriefingForm({ onComplete }: BriefingFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const { 
    setup, setSetup, clientName, setClientName,
    updatePC, addPC, removePC, 
    updateAlly, addAlly, removeAlly,
    updateEnemy, addEnemy, removeEnemy 
  } = useSafeSetup();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !setup.setting || !setup.sessionName) return;
    
    await onComplete({ clientName, data: setup });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="premium-card p-12 text-center space-y-6 max-w-md"
        >
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(34,197,94,0.3)]">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Briefing Sent</h2>
          <p className="text-zinc-500 font-medium text-sm leading-relaxed">
            Your mission parameters have been securely transmitted and are pending operator review.
          </p>
          <button 
            onClick={() => setSubmitted(false)}
            className="text-primary font-black uppercase text-[10px] tracking-widest hover:underline"
          >
            Submit Another Briefing
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-primary/30 pb-20 overflow-x-hidden">
      <header className="border-b border-zinc-800/50 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.4)]">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-black tracking-tighter uppercase italic text-white">
              Encounter Intake <span className="text-primary text-[10px] not-italic align-top ml-1 italic">Local Preview</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
               <Shield className="w-3 h-3 text-primary" />
               High-Fidelity Tactics
             </div>
             <button 
               type="submit"
               form="briefing-form"
               disabled={!clientName || !setup.setting || !setup.sessionName || setup.pcs.length === 0}
               className="bg-white text-black px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg"
             >
               Submit
             </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[2400px] mx-auto px-12 py-12">
        <form 
          id="briefing-form" 
          onSubmit={handleSubmit} 
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
              e.preventDefault();
            }
          }}
          className="w-full space-y-12"
        >
          <header className="space-y-2 border-l-4 border-primary pl-6 py-2">
            <h2 className="text-4xl font-black tracking-tight text-white uppercase italic">Mission Briefing</h2>
            <p className="text-zinc-500 text-sm font-medium">Define the tactical parameters for the upcoming engagement. Use the dashboard below to configure your encounter.</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[1fr_1.5fr_1.5fr_1fr_1fr] gap-8 xl:gap-10 items-start">
            {/* Column 1: Mission Profile */}
            <div className="space-y-8">
              <ErrorBoundary componentName="Mission Profile">
                <MissionProfile 
                  clientName={clientName} 
                  setClientName={setClientName} 
                  setup={setup} 
                  setSetup={setSetup} 
                />
              </ErrorBoundary>
            </div>

            {/* Column 2: Party Dossiers */}
            <div className="space-y-8">
              <div className="premium-card p-6 space-y-8">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <Users className="w-5 h-5 text-primary" />
                  <h3 className="panel-title">Heroic Personnel</h3>
                </div>
                
                <ErrorBoundary componentName="Party Dossiers">
                  <PartyDossiers 
                    pcs={setup.pcs} 
                    addPC={addPC} 
                    removePC={removePC} 
                    updatePC={updatePC} 
                  />
                </ErrorBoundary>
              </div>
            </div>

            {/* Column 3: Enemy Dossiers (New) */}
            <div className="space-y-8">
              <div className="premium-card p-6 space-y-8 border-red-500/10">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <Swords className="w-5 h-5 text-red-500" />
                  <h3 className="panel-title text-red-500/80">Hostile Personnel</h3>
                </div>
                
                <ErrorBoundary componentName="Enemy Dossiers">
                  <EnemyDossiers 
                    enemies={setup.enemies} 
                    addEnemy={addEnemy} 
                    removeEnemy={removeEnemy} 
                    updateEnemy={updateEnemy} 
                    allowExtraMinions={setup.allowExtraMinions}
                    setAllowExtraMinions={(val) => setSetup({...setup, allowExtraMinions: val})}
                  />
                </ErrorBoundary>
              </div>
            </div>

            {/* Column 4: Allied Forces */}
            <div className="space-y-8">
              <div className="premium-card p-6 space-y-8 border-emerald-500/10">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <Handshake className="w-5 h-5 text-emerald-500" />
                  <h3 className="panel-title text-emerald-500/80">Support Forces</h3>
                </div>
                
                <ErrorBoundary componentName="Allied Forces">
                  <AlliedForces 
                    allies={setup.allies} 
                    addAlly={addAlly} 
                    removeAlly={removeAlly} 
                    updateAlly={updateAlly} 
                  />
                </ErrorBoundary>
              </div>
            </div>

            {/* Column 5: Narrative Intelligence */}
            <div className="space-y-8">
              <ErrorBoundary componentName="Narrative Dossier">
                <NarrativeDossier 
                  setup={setup} 
                  setSetup={setSetup} 
                />
              </ErrorBoundary>
            </div>
          </div>
        </form>
      </main>

      <footer className="max-w-[1600px] mx-auto px-6 pb-12 mt-12 pt-8 border-t border-white/5 flex flex-col items-center gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="flex items-center gap-4 px-6 py-3 bg-zinc-900/30 rounded-2xl border border-white/5 hover:border-violet-500/30 hover:bg-zinc-900/50 transition-all duration-500 group cursor-pointer backdrop-blur-xl"
          onClick={() => window.open('https://youtu.be/LyrB05cG890', '_blank')}
        >
          <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center group-hover:bg-red-500/20 transition-all duration-500 shadow-inner">
            <Youtube className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] leading-none">Architectural Foundation</p>
              <ExternalLink className="w-2.5 h-2.5 text-zinc-700 group-hover:text-violet-400 transition-colors" />
            </div>
            <p className="text-[12px] text-zinc-400 font-medium mt-1">
              Built around <span className="text-white font-bold">objectives, pressure, and inspectable encounter math</span>
            </p>
          </div>
        </motion.div>
        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest opacity-50">
          Encounter Factory v2.5 • Senior Systems Design Suite
        </p>
      </footer>
    </div>
  );
}
