import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Users, Plus, Trash2, Flame, Dna, ShieldAlert, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { PCProfile } from "../../types";
import { Tooltip } from "../ui/Tooltip";
import { cn } from "../../lib/utils";
import { NumberInput } from "../ui/NumberInput";
import { SegmentedControl } from "../ui/SegmentedControl";
import { CLASS_DEFAULTS } from "../../hooks/useSafeSetup";

interface PartyDossiersProps {
  pcs: PCProfile[];
  addPC: () => void;
  removePC: (id: string) => void;
  updatePC: (id: string, updates: Partial<PCProfile>) => void;
}

export function PartyDossiers({ pcs, addPC, removePC, updatePC }: PartyDossiersProps) {
  const hasNoPCs = !pcs || pcs.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2 px-1">
        <h4 className="section-label text-zinc-400">Heroic Personnel</h4>
        <button 
          type="button"
          onClick={addPC}
          className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 hover:border-primary/50 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
        >
          <Plus className="w-3.5 h-3.5 text-primary" /> Add Hero
        </button>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
        <div className="border-l-2 border-primary/30 pl-4 py-1">
          <p className="text-[13px] text-zinc-400 font-medium leading-relaxed italic">
            "Party details help the deterministic math establish a practical pressure range. Review the resulting HP, damage, and action targets before using any generated tactical script."
          </p>
        </div>
      </div>

      {hasNoPCs ? (
        <div className="p-8 text-center bg-zinc-950/20 border border-dashed border-zinc-800 rounded-2xl">
          <p className="text-sm text-zinc-600 italic">No heroes assigned to the dossier yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence mode="popLayout">
            {(pcs || []).map((pc, idx) => (
              <HeroCard 
                key={pc.id} 
                pc={pc} 
                idx={idx} 
                updatePC={updatePC} 
                removePC={removePC} 
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function HeroCard({ pc, idx, updatePC, removePC }: { 
  pc: PCProfile; 
  idx: number; 
  updatePC: (id: string, updates: Partial<PCProfile>) => void;
  removePC: (id: string) => void;
}) {
  const [showStats, setShowStats] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: idx * 0.05 }}
      className="glass-dark rounded-xl relative group overflow-hidden"
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 group">
            <input 
              className="bg-zinc-950/60 border border-primary/20 rounded-xl px-4 py-2 font-black tracking-tight text-2xl outline-none w-full focus:border-primary/60 focus:bg-zinc-950/80 transition-all text-white placeholder:text-zinc-800 italic shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] hover:bg-zinc-900/60 hover:border-primary/30 cursor-text"
              placeholder="Hero Name..."
              value={pc.name}
              onChange={e => updatePC(pc.id, { name: e.target.value })}
            />
            <div className="absolute left-4 -top-2 px-1 bg-black text-[9px] font-black uppercase tracking-widest text-primary opacity-100 transition-opacity z-10">Hero Name</div>
          </div>
          <button type="button" onClick={() => removePC(pc.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-600 hover:text-red-500 transition-all shrink-0">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr] gap-6 items-start">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="section-label">Identity & Training</label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select 
                      className="premium-input w-full appearance-none pr-10 py-2.5 text-[13px] font-bold bg-zinc-950 text-white border-zinc-800 focus:border-primary/50 cursor-pointer shadow-inner"
                      value={pc.className}
                      onChange={e => updatePC(pc.id, { className: e.target.value })}
                    >
                      {!pc.className && <option value="" disabled className="bg-zinc-900 text-zinc-500">Select Class...</option>}
                      {Object.keys(CLASS_DEFAULTS).map(c => (
                        <option key={c} value={c} className="bg-zinc-900 text-white font-bold py-2">
                          {c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                  </div>
                  <div className="flex items-center gap-1.5 bg-zinc-950/50 px-2.5 py-1.5 rounded-xl border border-white/5 h-[42px] shrink-0">
                    <span className="text-[11px] font-black text-zinc-500 uppercase tracking-widest leading-none">Lvl</span>
                    <NumberInput 
                      value={pc.level}
                      min={1}
                      max={20}
                      compact
                      onChange={val => updatePC(pc.id, { level: val })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group">
                    <input 
                      placeholder="Subclass or specialty"
                      className="premium-input w-full py-2.5 text-[13px] font-medium text-zinc-300 focus:text-primary bg-zinc-950/20"
                      value={pc.subclass || ""}
                      onChange={e => updatePC(pc.id, { subclass: e.target.value })}
                    />
                    <div className="absolute left-1 -top-1.5 px-1 bg-zinc-950/0 text-[11px] font-bold text-zinc-500 uppercase tracking-tight opacity-0 group-focus-within:opacity-100 transition-opacity">Subclass</div>
                  </div>
                  <div className="relative group">
                    <select 
                      className="premium-input w-full appearance-none pr-10 py-2.5 text-xs font-bold bg-zinc-950/20 text-zinc-100 border-zinc-800 focus:border-primary/50 transition-all cursor-pointer"
                      value={pc.role || "I don't know"}
                      onChange={e => updatePC(pc.id, { role: e.target.value as any })}
                    >
                      <option value="Frontline" className="bg-zinc-900 text-white">Frontline</option>
                      <option value="Support" className="bg-zinc-900 text-white">Support</option>
                      <option value="Striker" className="bg-zinc-900 text-white">Striker</option>
                      <option value="Healer" className="bg-zinc-900 text-white">Healer</option>
                      <option value="Controller" className="bg-zinc-900 text-white">Controller</option>
                      <option value="None" className="bg-zinc-900 text-white">None</option>
                      <option value="I don't know" className="bg-zinc-900 text-white">I don't know</option>
                    </select>
                    <div className="absolute left-1 -top-1.5 px-1 bg-zinc-950/0 text-[11px] font-bold text-zinc-500 uppercase tracking-tight opacity-0 group-focus-within:opacity-100 transition-opacity">Combat Role</div>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none group-focus-within:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
            <div className="space-y-2">
              <label className="section-label flex items-center gap-2">
                Burst Damage Potential
                <Tooltip text="Fine-tunes enemy HP pool based on expected DPR spikes." />
              </label>
              <div className="pt-0.5">
                <SegmentedControl 
                  className="h-[42px]"
                  options={[
                    { label: "Low", value: "low" },
                    { label: "Standard", value: "standard" },
                    { label: "High", value: "high" }
                  ]}
                  value={pc.burstPotential || "standard"}
                  onChange={val => updatePC(pc.id, { burstPotential: val as any })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="section-label flex items-center gap-2">
                Reaction Density
                <Tooltip text="High: Monks, Fighters with Interception. Triggers 'Reactive Multi-Act' for bosses." />
              </label>
              <div className="pt-0.5">
                <SegmentedControl 
                  className="h-[42px]"
                  options={[
                    { label: "Low", value: "low" },
                    { label: "High", value: "high" }
                  ]}
                  value={pc.reactionDensity || "low"}
                  onChange={val => updatePC(pc.id, { reactionDensity: val as any })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button 
            type="button"
            onClick={() => setShowStats(!showStats)}
            className="flex items-center justify-between w-full p-3 bg-zinc-950/30 border border-white/5 rounded-xl hover:bg-zinc-950/50 transition-all group"
          >
            <div className="flex items-center gap-2">
              <Dna className="w-4 h-4 text-zinc-500" />
              <span className="text-[12px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300">Ability Scores</span>
            </div>
            {showStats ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
          </button>

          <AnimatePresence>
            {showStats && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-4 px-1"
              >
                <div className="grid grid-cols-3 gap-3">
                  {['str', 'dex', 'con', 'int', 'wis', 'cha'].map((stat) => (
                    <div key={stat} className="flex flex-col gap-1.5 p-2 bg-zinc-950/40 border border-white/5 rounded-lg items-center">
                      <span className="text-[11px] font-black text-zinc-500 uppercase tracking-tighter">{stat}</span>
                      <NumberInput 
                        value={pc.stats?.[stat as keyof typeof pc.stats] || 10}
                        min={1}
                        max={30}
                        compact
                        onChange={val => updatePC(pc.id, { stats: { ...pc.stats!, [stat]: val } })}
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="section-label">Potent Actions</label>
            <textarea 
              className="premium-input w-full h-24 text-[13px]"
              placeholder="Action Surge, Fireball..."
              value={pc.powerMoves}
              onChange={e => updatePC(pc.id, { powerMoves: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="section-label">Tactical Assets</label>
            <textarea 
              className="premium-input w-full h-24 text-[13px]"
              placeholder="Push Mastery, +1 Sword..."
              value={pc.magicItems}
              onChange={e => updatePC(pc.id, { magicItems: e.target.value })}
            />
            <div className="flex items-center justify-between pt-2 px-1">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-tight">Major Magic Items</span>
              <NumberInput 
                value={pc.majorMagicItemsCount || 0}
                min={0}
                max={5}
                compact
                onChange={val => updatePC(pc.id, { majorMagicItemsCount: val })}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="section-label">Hero Context</label>
          <textarea 
            className="premium-input w-full h-16 text-[13px]"
            placeholder="Personality, tactical preference..."
            value={pc.generalContext}
            onChange={e => updatePC(pc.id, { generalContext: e.target.value })}
          />
        </div>
      </div>
    </motion.div>
  );
}
