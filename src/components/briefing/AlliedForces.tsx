import { motion, AnimatePresence } from "motion/react";
import { Handshake, Plus, Trash2, ChevronDown, Shield } from "lucide-react";
import { NPCAlly } from "../../types";
import { Tooltip } from "../ui/Tooltip";
import { cn } from "../../lib/utils";
import { NumberInput } from "../ui/NumberInput";

interface AlliedForcesProps {
  allies: NPCAlly[];
  addAlly: () => void;
  removeAlly: (id: string) => void;
  updateAlly: (id: string, updates: Partial<NPCAlly>) => void;
}

export function AlliedForces({ allies, addAlly, removeAlly, updateAlly }: AlliedForcesProps) {
  const hasNoAllies = !allies || allies.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2 px-1">
        <h4 className="section-label text-emerald-500/80">Support Personnel</h4>
        <button 
          type="button"
          onClick={addAlly}
          className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all text-emerald-500"
        >
          <Plus className="w-3.5 h-3.5" /> Add Ally
        </button>
      </div>

      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-4">
        <div className="border-l-2 border-emerald-500/30 pl-4 py-1">
          <p className="text-[13px] text-zinc-400 font-medium leading-relaxed italic">
            "Don't hold back on the allies. I’ve developed a custom encounter engine that makes it easy to handle any amount of allies. Just be careful dedicating too many allies to actual combat roles, as too much shine can be taken away from the players. But don't worry: even if there are super powerful allies on the field, I'll ensure the players have the best opportunities to shine as the true heroes of the scene."
          </p>
        </div>
      </div>

      {hasNoAllies ? (
        <div className="p-8 text-center bg-emerald-500/5 border border-dashed border-emerald-500/10 rounded-2xl">
          <p className="text-sm text-emerald-900/60 italic">No supporting forces assigned yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence mode="popLayout">
            {(allies || []).map((ally, idx) => (
              <motion.div
                key={ally.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-dark border-emerald-500/10 hover:border-emerald-500/30 transition-all rounded-xl relative overflow-hidden"
              >
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 group">
                      <input 
                        className="bg-zinc-950/60 border border-emerald-500/20 rounded-xl px-4 py-2 font-black tracking-tight text-2xl outline-none w-full focus:border-emerald-500/60 focus:bg-zinc-950/80 transition-all text-emerald-50 placeholder:text-emerald-950/50 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] hover:bg-zinc-900/60 hover:border-emerald-500/30 cursor-text"
                        placeholder="Ally Name..."
                        value={ally.name}
                        onChange={e => updateAlly(ally.id, { name: e.target.value })}
                      />
                      <div className="absolute left-4 -top-2 px-1 bg-black text-[9px] font-black uppercase tracking-widest text-emerald-500 opacity-100 transition-opacity z-10">Ally Name</div>
                    </div>
                    <button type="button" onClick={() => removeAlly(ally.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-600 hover:text-red-500 transition-all">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="section-label">Force Type</label>
                      <div className="relative">
                        <select 
                          className="premium-input w-full appearance-none pr-10 py-2.5 text-xs font-bold bg-zinc-950 text-white border-zinc-800 focus:border-emerald-500/50 shadow-inner"
                          value={ally.type}
                          onChange={e => updateAlly(ally.id, { type: e.target.value as any })}
                        >
                          <option value="General" className="bg-zinc-900 text-white font-bold py-2">General Bunch (Mobs)</option>
                          <option value="Specific" className="bg-zinc-900 text-white font-bold py-2">Unique Individual</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="section-label">Combat Role</label>
                      <div className="relative group">
                        <select 
                          className="premium-input w-full appearance-none pr-10 py-2.5 text-xs font-bold bg-zinc-950 text-white border-zinc-800 focus:border-emerald-500/50 transition-all cursor-pointer shadow-inner"
                          value={ally.role}
                          onChange={e => updateAlly(ally.id, { role: e.target.value as any })}
                        >
                          <option value="Frontline" className="bg-zinc-900 text-white font-bold py-2">Frontline</option>
                          <option value="Support" className="bg-zinc-900 text-white font-bold py-2">Support</option>
                          <option value="Striker" className="bg-zinc-900 text-white font-bold py-2">Striker</option>
                          <option value="Cannon Fodder" className="bg-zinc-900 text-white font-bold py-2">Cannon Fodder</option>
                          <option value="None" className="bg-zinc-900 text-white font-bold py-2">None</option>
                          <option value="I don't know" className="bg-zinc-900 text-white font-bold py-2">I don't know</option>
                        </select>
                        <div className="absolute left-1 -top-1 px-1 bg-zinc-950/0 text-[8px] font-bold text-zinc-600 uppercase tracking-tighter opacity-0 group-focus-within:opacity-100 transition-opacity">Combat Role</div>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none group-focus-within:text-emerald-500 transition-colors" />
                      </div>
                    </div>
                  </div>

                  {ally.type === "General" ? (
                    <div className="space-y-2">
                      <label className="section-label">Personnel Count</label>
                      <NumberInput 
                        value={ally.quantity}
                        min={1}
                        max={100}
                        onChange={val => updateAlly(ally.id, { quantity: val })}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="section-label">Mechanical Assets</label>
                      <textarea 
                        placeholder="Key abilities or stat highlights..."
                        className="premium-input w-full h-24 text-[13px] py-2"
                        value={ally.stats}
                        onChange={e => updateAlly(ally.id, { stats: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="section-label text-emerald-500/60">Narrative Context / Bio</label>
                    <textarea 
                      className="premium-input w-full h-16 text-[13px]"
                      placeholder="Who is this NPC? General personality, appearance, or background details..."
                      value={ally.generalContext}
                      onChange={e => updateAlly(ally.id, { generalContext: e.target.value })}
                    />
                  </div>

                  <div className="pt-4 flex flex-col gap-4 border-t border-white/5">
                    <div className="flex items-center justify-between group cursor-pointer" onClick={() => updateAlly(ally.id, { isIndependent: !ally.isIndependent })}>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-zinc-200 transition-colors">Independent Turns</span>
                          <Tooltip text="Determines if this ally acts independently in the initiative order or alongside their primary hero." />
                        </div>
                        <span className="text-[9px] text-zinc-600">Acts on their own initiative order.</span>
                      </div>
                      <div className={cn(
                        "w-10 h-5 rounded-full transition-all relative",
                        ally.isIndependent ? "bg-emerald-500" : "bg-zinc-800"
                      )}>
                        <div className={cn(
                          "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                          ally.isIndependent ? "left-5.5" : "left-0.5"
                        )} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between group cursor-pointer" onClick={() => updateAlly(ally.id, { dismissOrganically: !ally.dismissOrganically })}>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-zinc-200 transition-colors">Cinematic Departure</span>
                          <Tooltip text="Enables a cinematic departure for this ally during the struggle, ensuring they resolve their own narrative threads without overshadowing the heroes." />
                        </div>
                        <span className="text-[9px] text-zinc-600">May leave the fight for narrative reasons.</span>
                      </div>
                      <div className={cn(
                        "w-10 h-5 rounded-full transition-all relative",
                        ally.dismissOrganically ? "bg-amber-500" : "bg-zinc-800"
                      )}>
                        <div className={cn(
                          "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                          ally.dismissOrganically ? "left-5.5" : "left-0.5"
                        )} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
