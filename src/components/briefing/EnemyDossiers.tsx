import { motion, AnimatePresence } from "motion/react";
import { Swords, Plus, Trash2, ChevronDown, Lock, Unlock, Shield } from "lucide-react";
import { Enemy } from "../../types";
import { Tooltip } from "../ui/Tooltip";
import { cn } from "../../lib/utils";
import { NumberInput } from "../ui/NumberInput";

interface EnemyDossiersProps {
  enemies: Enemy[];
  addEnemy: () => void;
  removeEnemy: (id: string) => void;
  updateEnemy: (id: string, updates: Partial<Enemy>) => void;
  allowExtraMinions: boolean;
  setAllowExtraMinions: (val: boolean) => void;
}

export function EnemyDossiers({ enemies, addEnemy, removeEnemy, updateEnemy, allowExtraMinions, setAllowExtraMinions }: EnemyDossiersProps) {
  const hasNoEnemies = !enemies || enemies.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 mb-2">
        <div className="flex items-center justify-between px-1">
          <h4 className="section-label text-red-500/80">Hostile Personel</h4>
          <button 
            type="button"
            onClick={addEnemy}
            className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 hover:border-red-500/50 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all text-red-500"
          >
            <Plus className="w-3.5 h-3.5" /> Add Enemy
          </button>
        </div>

        <div className="flex items-center justify-between bg-red-500/5 border border-red-500/10 rounded-xl p-3 group cursor-pointer hover:bg-red-500/10 transition-all" onClick={() => setAllowExtraMinions(!allowExtraMinions)}>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-red-500/80 tracking-widest flex items-center gap-2">
              Reinforcement Protocol
              <Tooltip text="If enabled, the architect may add additional minions or thematic low-CR threats beyond your requested roster to ensure tactical density and action economy stability." />
            </span>
            <span className="text-[9px] text-zinc-500 italic mt-0.5">Allow architect to add additional minions?</span>
          </div>
          <div className={cn(
            "relative inline-flex h-5 w-10 items-center rounded-full transition-colors",
            allowExtraMinions ? "bg-red-500" : "bg-zinc-800"
          )}>
            <span className={cn(
              "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
              allowExtraMinions ? "translate-x-6" : "translate-x-1"
            )} />
          </div>
        </div>
      </div>

      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-4">
        <div className="border-l-2 border-red-500/30 pl-4 py-1">
          <p className="text-[11px] text-zinc-400 font-medium leading-relaxed italic">
            "Requesting specific hostiles? I will attempt to preserve your requested roster while maintaining tactical integrity. Note: If you lock an enemy's stats, I will balance the encounter through environmental factors, additional minions, or tactical positioning instead of modifying the boss's core math."
          </p>
        </div>
      </div>

      {hasNoEnemies ? (
        <div className="p-8 text-center bg-red-500/5 border border-dashed border-red-500/10 rounded-2xl">
          <p className="text-sm text-red-900/60 italic">No specific hostiles requested yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence mode="popLayout">
            {(enemies || []).map((enemy, idx) => (
              <motion.div
                key={enemy.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-dark border-red-500/10 hover:border-red-500/30 transition-all rounded-xl relative overflow-hidden"
              >
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 group">
                      <input 
                        className="bg-zinc-950/60 border border-red-500/20 rounded-xl px-4 py-2 font-black tracking-tight text-2xl outline-none w-full focus:border-red-500/60 focus:bg-zinc-950/80 transition-all text-red-50 placeholder:text-red-950/50 uppercase italic shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] hover:bg-zinc-900/60 hover:border-red-500/30 cursor-text"
                        placeholder="Enemy Name..."
                        value={enemy.name}
                        onChange={e => updateEnemy(enemy.id, { name: e.target.value })}
                      />
                      <div className="absolute left-4 -top-2 px-1 bg-black text-[9px] font-black uppercase tracking-widest text-red-500 opacity-100 transition-opacity z-10">Enemy Name</div>
                    </div>
                    <button type="button" onClick={() => removeEnemy(enemy.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-600 hover:text-red-500 transition-all">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="section-label">Classification</label>
                      <div className="relative">
                        <select 
                          className="premium-input w-full appearance-none pr-10 py-2.5 text-xs font-bold bg-zinc-950 text-white border-zinc-800 focus:border-red-500/50 shadow-inner"
                          value={enemy.type}
                          onChange={e => updateEnemy(enemy.id, { type: e.target.value as any })}
                        >
                          <option value="Minion" className="bg-zinc-900 text-white font-bold py-2">Minion</option>
                          <option value="Elite" className="bg-zinc-900 text-white font-bold py-2">Elite</option>
                          <option value="Boss" className="bg-zinc-900 text-white font-bold py-2">Boss</option>
                          <option value="Legendary" className="bg-zinc-900 text-white font-bold py-2">Legendary</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="section-label">Quantity</label>
                      <NumberInput 
                        value={enemy.quantity}
                        min={1}
                        max={50}
                        onChange={val => updateEnemy(enemy.id, { quantity: val })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <label className="section-label">Protocols</label>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={() => updateEnemy(enemy.id, { isFragile: !enemy.isFragile })}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                            enemy.isFragile 
                              ? "bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]" 
                              : "bg-zinc-800 text-zinc-500"
                          )}
                        >
                          {enemy.isFragile ? <Unlock className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                          {enemy.isFragile ? "FRAGILE OVERRIDE" : "STANDARD DURABILITY"}
                        </button>

                        <button 
                          type="button"
                          onClick={() => updateEnemy(enemy.id, { isStatLocked: !enemy.isStatLocked })}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                            enemy.isStatLocked 
                              ? "bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]" 
                              : "bg-zinc-800 text-zinc-500"
                          )}
                        >
                          {enemy.isStatLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          {enemy.isStatLocked ? "STRICT STATS" : "ADAPTIVE STATS"}
                        </button>
                      </div>
                    </div>
                    <textarea 
                      placeholder="Paste statblock highlights or leave empty for MMR default..."
                      className={cn(
                        "premium-input w-full h-24 text-[13px] py-2 transition-all",
                        enemy.isStatLocked ? "border-red-500/50 bg-red-500/5" : ""
                      )}
                      value={enemy.stats}
                      onChange={e => updateEnemy(enemy.id, { stats: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="section-label text-red-500/60">Biographical Identity / Context</label>
                    <textarea 
                      className="premium-input w-full h-16 text-[13px]"
                      placeholder="Who is this NPC? General personality, appearance, or background details..."
                      value={enemy.generalContext}
                      onChange={e => updateEnemy(enemy.id, { generalContext: e.target.value })}
                    />
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
