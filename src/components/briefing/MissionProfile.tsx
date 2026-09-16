import { motion, AnimatePresence } from "motion/react";
import { 
  MapPin, 
  UserCircle,
  Settings2,
  ChevronDown,
  Mail,
  Terminal,
  ExternalLink
} from "lucide-react";
import { GMSetup } from "../../types";
import { Tooltip } from "../ui/Tooltip";
import { SegmentedControl } from "../ui/SegmentedControl";
import { NumberInput } from "../ui/NumberInput";

interface MissionProfileProps {
  clientName: string;
  setClientName: (name: string) => void;
  setup: GMSetup;
  setSetup: (setup: GMSetup) => void;
}

export function MissionProfile({ clientName, setClientName, setup, setSetup }: MissionProfileProps) {
  const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
      <div className="premium-card p-6 space-y-8">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <Settings2 className="w-5 h-5 text-primary" />
          <h3 className="panel-title">Mission Profile</h3>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="section-label flex items-center gap-2">
              Session Name
              <Tooltip text="A descriptive label for this encounter (e.g., 'The Clockwork Heart', 'Ambush at Shadow Pass')." />
            </label>
            <div className="relative">
              <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <input 
                type="text" 
                placeholder="Enter Session Name..." 
                className="premium-input w-full pl-11 py-3 text-[14px] font-black uppercase tracking-tight italic"
                value={setup.sessionName}
                onChange={e => setSetup({...setup, sessionName: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="section-label flex items-center gap-2">
                Client Name
                <Tooltip text="Who is submitting this brief. Used by the operator queue for review and follow-up." />
              </label>
              <div className="relative group">
                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="Enter Client Name..."
                  className="premium-input w-full pl-11 py-2.5 text-[13px] bg-zinc-950/40 border-white/5 focus:bg-zinc-950/60"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="section-label flex items-center gap-2">
                Delivery Endpoint
                <Tooltip text="Where should we send the finished encounter? (Email or Discord handle)" />
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="Email or Discord..." 
                  className="premium-input w-full pl-11 py-2.5 text-[13px] bg-zinc-950/40 border-white/5 focus:bg-zinc-950/60"
                  value={setup.contactInfo || ""}
                  onChange={e => setSetup({...setup, contactInfo: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="section-label flex items-center gap-2">
                Setting / Environment
                <Tooltip text="The physical location of the struggle. Shapes the terrain, hazards, and tactical geometry." />
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input 
                  type="text" 
                  placeholder="Where does this take place?" 
                  className="premium-input w-full pl-11"
                  value={setup.setting}
                  onChange={e => setSetup({...setup, setting: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="section-label flex items-center gap-2">
                Narrative Tone
                <Tooltip text="Sets the atmospheric baseline for the encounter's narrative flow and sensory details." />
              </label>
              <div className="relative">
                <select 
                  className="premium-input w-full appearance-none pr-10 px-4 bg-zinc-950 text-white border-zinc-800 font-bold focus:border-primary/50 transition-all shadow-inner"
                  value={setup.tone}
                  onChange={e => setSetup({...setup, tone: e.target.value})}
                >
                  <option value="Classic Heroic" className="bg-zinc-900 text-white font-bold py-2">Classic Heroic</option>
                  <option value="Grim Dark" className="bg-zinc-900 text-white font-bold py-2">Grim Dark</option>
                  <option value="High Fantasy" className="bg-zinc-900 text-white font-bold py-2">High Fantasy</option>
                  <option value="Cosmic Horror" className="bg-zinc-900 text-white font-bold py-2">Cosmic Horror</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="section-label flex items-center gap-2">
                Target Experience
                <Tooltip text="Gritty: High lethality, low recovery. Heroic: Standard power fantasy. Gonzo: Wild magic and explosive results." />
              </label>
              <div className="relative">
                <select 
                  className="premium-input w-full appearance-none pr-10 px-4 bg-zinc-950 text-white border-zinc-800 font-bold focus:border-primary/50 transition-all shadow-inner"
                  value={setup.targetExperience}
                  onChange={e => setSetup({...setup, targetExperience: e.target.value as any})}
                >
                  <option value="Heroic">Heroic (Standard)</option>
                  <option value="Gritty">Gritty (Lethal)</option>
                  <option value="Gonzo">Gonzo (Wild)</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="section-label flex items-center gap-2">
                Encounter Structure
                <Tooltip text="Determines the tactical progression of the encounter." />
              </label>
              <div className="relative">
                <select 
                  className="premium-input w-full appearance-none pr-10 px-4 bg-zinc-950 text-white border-zinc-800 font-bold focus:border-primary/50 transition-all shadow-inner"
                  value={setup.encounterStructure}
                  onChange={e => setSetup({...setup, encounterStructure: e.target.value as any})}
                >
                  <option value="Skirmish">Skirmish</option>
                  <option value="Wave">Wave-Based</option>
                  <option value="Siege">Siege / Hold-Out</option>
                  <option value="Boss">Boss Encounter</option>
                  <option value="Puzzle">Tactical Puzzle</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="section-label flex items-center gap-2">
                Combat Philosophy
                <Tooltip text="Standard Brawl focus on damage exchange. Alternative Objective focuses on complex win conditions." />
              </label>
              <div className="relative">
                <select 
                  className="premium-input w-full appearance-none pr-10 px-4 bg-zinc-950 text-white border-zinc-800 font-bold focus:border-primary/50 transition-all shadow-inner"
                  value={setup.combatStyle}
                  onChange={e => setSetup({...setup, combatStyle: e.target.value as any})}
                >
                  <option value="Standard Brawl">Standard Brawl</option>
                  <option value="Alternative Objective">Alternative Objective</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5">
            <div className="space-y-2">
              <label className="section-label flex items-center gap-2">
                Win Condition
                <Tooltip text="What constitutes victory? (e.g., 'Protect the Portal', 'Recover the Idol')." />
              </label>
              <textarea 
                className="premium-input w-full h-24 text-[13px] py-2.5"
                placeholder="Total Victory / Kill all enemies..."
                value={setup.winCondition || ""}
                onChange={e => setSetup({...setup, winCondition: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="section-label flex items-center gap-2">
                Failure Consequence
                <Tooltip text="Narrative Setback: Story continues with a penalty. TPK Risk: Campaign-ending danger." />
              </label>
              <div className="relative">
                <select 
                  className="premium-input w-full appearance-none pr-10 px-4 bg-zinc-950 text-white border-zinc-800 font-bold focus:border-primary/50 transition-all shadow-inner"
                  value={setup.failureConsequence}
                  onChange={e => setSetup({...setup, failureConsequence: e.target.value as any})}
                >
                  <option value="narrative_setback">Narrative Setback</option>
                  <option value="tpk_risk">Campaign End / TPK Risk</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <label className="section-label flex items-center gap-2">
              Combat Frequency
              <Tooltip text="Choose between a single grand struggle or a series of tactical engagements." />
            </label>
            <SegmentedControl 
              options={[
                { label: "Single Major", value: "single", hint: "One grand struggle" },
                { label: "Series", value: "series", hint: "Multiple engagements" }
              ]}
              value={setup.encounterCount === 1 ? "single" : "series"}
              onChange={val => setSetup({...setup, encounterCount: val === "single" ? 1 : 3})}
            />
            
            <AnimatePresence>
              {setup.encounterCount > 1 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center justify-between bg-zinc-950/30 border border-white/5 rounded-xl p-4 mt-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-tight">Number of Engagements</span>
                      <span className="text-[10px] text-zinc-600 italic">Sequential tactical challenges</span>
                    </div>
                    <NumberInput 
                      value={setup.encounterCount}
                      min={2}
                      max={8}
                      onChange={val => setSetup({...setup, encounterCount: val})}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-6 pt-6 border-t border-white/5">
            <div className="flex items-center justify-between">
              <label className="section-label flex items-center gap-2">
                Social Resolution Intent
                <Tooltip text="Enable if the encounter can be resolved through negotiation or intimidation." />
              </label>
              <button 
                type="button"
                onClick={() => setSetup({...setup, socialOut: !setup.socialOut})}
                className={cn(
                  "relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none",
                  setup.socialOut ? "bg-primary" : "bg-zinc-800"
                )}
              >
                <span className={cn(
                  "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                  setup.socialOut ? "translate-x-6" : "translate-x-1"
                )} />
              </button>
            </div>

            <AnimatePresence>
              {setup.socialOut && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-[12px] font-bold text-zinc-500 ml-1">Narrative Context for Resolution</label>
                  <textarea 
                    className="premium-input w-full h-24 text-[13px]"
                    placeholder="Why is a social exit possible?..."
                    value={setup.socialOutContext || ""}
                    onChange={e => setSetup({...setup, socialOutContext: e.target.value})}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="premium-card p-6 space-y-6">
        <div className="flex items-center gap-2 text-zinc-400">
          <Settings2 className="w-4 h-4" />
          <h4 className="text-[13px] font-bold uppercase tracking-[0.15em]">Tactical Tuning</h4>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="section-label flex items-center gap-2">
                Entry State
                <Tooltip text="Party's current resource state." />
              </label>
              <select 
                className="premium-input w-full text-[13px] py-2 bg-zinc-950 text-white border-zinc-800 font-bold shadow-inner"
                value={setup.entryCondition}
                onChange={e => setSetup({...setup, entryCondition: e.target.value as any})}
              >
                <option value="fresh" className="bg-zinc-900 text-white font-bold py-2">Fresh (Ready to Nova)</option>
                <option value="winded" className="bg-zinc-900 text-white font-bold py-2">Winded (Half Resources)</option>
                <option value="depleted" className="bg-zinc-900 text-white font-bold py-2">Depleted (Barely Hanging On)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="section-label flex items-center gap-2">
                Exit Stand
                <Tooltip text="Desired encounter difficulty." />
              </label>
              <select 
                className="premium-input w-full text-[13px] py-2 bg-zinc-950 text-white border-zinc-800 font-bold shadow-inner"
                value={setup.targetOutcome}
                onChange={e => setSetup({...setup, targetOutcome: e.target.value as any})}
              >
                <option value="safe_victory" className="bg-zinc-900 text-white font-bold py-2">Safe Victory</option>
                <option value="heavy_tax" className="bg-zinc-900 text-white font-bold py-2">Heavy Tax</option>
                <option value="brink_of_defeat" className="bg-zinc-900 text-white font-bold py-2">Brink of Defeat</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="section-label flex items-center gap-2">
              Target Duration (Rounds)
              <Tooltip text="Projected duration window." />
            </label>
            <SegmentedControl 
              options={[
                { label: "Short", value: 3, hint: "1-3 Rounds" },
                { label: "Standard", value: 4, hint: "3-5 Rounds" },
                { label: "Long", value: 6, hint: "5-8 Rounds" }
              ]}
              value={setup.targetRounds || 4}
              onChange={val => setSetup({...setup, targetRounds: val})}
            />
          </div>

          <div className="space-y-3">
            <label className="section-label flex items-center gap-2">
              Inspiration Velocity
              <Tooltip text="Low: Players rarely have Inspiration. High: Players frequently have Inspiration (rewards higher reliability)." />
            </label>
            <SegmentedControl 
              options={[
                { label: "Low", value: "low", hint: "Standard/Grim" },
                { label: "High", value: "high", hint: "Heroic/Optimized" }
              ]}
              value={setup.inspirationVelocity || "low"}
              onChange={val => setSetup({...setup, inspirationVelocity: val as any})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="section-label flex items-center gap-2">
                Party Archetype
                <Tooltip text="Defines the tactical behavior of the players. Helps the AI select appropriate reliability counters." />
              </label>
              <select 
                className="premium-input w-full text-[13px] py-2 bg-zinc-950 text-white border-zinc-800 font-bold shadow-inner"
                value={setup.partyArchetype || "Balanced Group"}
                onChange={e => setSetup({...setup, partyArchetype: e.target.value as any})}
              >
                <option value="Balanced Group">Balanced Group</option>
                <option value="Glass Cannon Strikers">Glass Cannon Strikers</option>
                <option value="Control-Heavy Mages">Control-Heavy Mages</option>
                <option value="Unkillable Tanks">Unkillable Tanks</option>
                <option value="I don't know">I don't know / Mixed</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="section-label flex items-center gap-2">
                Primary Material
                <Tooltip text="Defines the narrative skinning of the environmental toys (e.g., Stone, Flesh, Ice)." />
              </label>
              <select 
                className="premium-input w-full text-[13px] py-2 bg-zinc-950 text-white border-zinc-800 font-bold shadow-inner"
                value={setup.primaryMaterial || "Stone"}
                onChange={e => setSetup({...setup, primaryMaterial: e.target.value as any})}
              >
                <option value="Stone">Stone / Dungeon</option>
                <option value="Wood">Wood / Forest</option>
                <option value="Flesh">Flesh / Organic</option>
                <option value="Ice">Ice / Tundra</option>
                <option value="Metal">Metal / Clockwork</option>
                <option value="Magic">Magic / Arcane</option>
                <option value="Water">Water / Nautical</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="section-label flex items-center gap-2">
              Environmental 'Toys'
              <Tooltip text="List interactive objects (e.g., 'Chandelier', 'Blowing Dust', 'Levers'). One per line." />
            </label>
            <textarea 
              className="premium-input w-full h-24 text-[13px] py-2.5"
              placeholder="List interactive elements..."
              value={setup.toyList.join("\n")}
              onChange={e => setSetup({...setup, toyList: e.target.value.split("\n").filter(Boolean)})}
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between group">
              <div className="flex flex-col">
                <span className="section-label text-zinc-300">Intensive Combat Day</span>
                <span className="body-hint">Enables 'One Big Fight' math. Assumes no other encounters occur today, allowing for maximum lethal thresholding.</span>
              </div>
              <button 
                type="button"
                onClick={() => setSetup({...setup, oneFightDay: !setup.oneFightDay})}
                className={cn(
                  "relative inline-flex h-5 w-10 items-center rounded-full transition-colors",
                  setup.oneFightDay ? "bg-primary" : "bg-zinc-800"
                )}
              >
                <span className={cn(
                  "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                  setup.oneFightDay ? "translate-x-6" : "translate-x-1"
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between group">
              <div className="flex flex-col">
                <span className="section-label text-zinc-300">Unfiltered Lethality</span>
                <span className="body-hint">Risk of TPK increases significantly.</span>
              </div>
              <button 
                type="button"
                onClick={() => setSetup({...setup, letDiceFall: !setup.letDiceFall})}
                className={cn(
                  "relative inline-flex h-5 w-10 items-center rounded-full transition-colors",
                  setup.letDiceFall ? "bg-red-500" : "bg-zinc-800"
                )}
              >
                <span className={cn(
                  "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                  setup.letDiceFall ? "translate-x-6" : "translate-x-1"
                )} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="premium-card p-6 space-y-6">
        <div className="flex items-center gap-2 text-zinc-400">
          <ExternalLink className="w-4 h-4" />
          <h4 className="text-[13px] font-bold uppercase tracking-[0.15em]">Publishing & Export</h4>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="section-label flex items-center gap-2">
              Licensing Framework
              <Tooltip text="Automated attribution for professional publishing." />
            </label>
            <select 
              className="premium-input w-full text-[13px] py-2 bg-zinc-950 text-white border-zinc-800 font-bold shadow-inner"
              value={setup.licensingMode}
              onChange={e => setSetup({...setup, licensingMode: e.target.value as any})}
            >
              <option value="None" className="bg-zinc-900 text-white font-bold py-2">None (Private Use)</option>
              <option value="CC-BY-4.0" className="bg-zinc-900 text-white font-bold py-2">Creative Commons (CC-BY-4.0)</option>
              <option value="ORC" className="bg-zinc-900 text-white font-bold py-2">Open RPG Creative (ORC)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="section-label flex items-center gap-2">
              Export Priority
              <Tooltip text="Optimize the layout for your primary platform." />
            </label>
            <select 
              className="premium-input w-full text-[13px] py-2 bg-zinc-950 text-white border-primary/20 font-bold shadow-inner"
              value={setup.exportPriority}
              onChange={e => setSetup({...setup, exportPriority: e.target.value as any})}
            >
              <option value="Standard" className="bg-zinc-900 text-white font-bold py-2">Standard (Print PDF)</option>
              <option value="VTT-First" className="bg-zinc-900 text-white font-bold py-2">VTT-First (Obsidian/Foundry)</option>
              <option value="Phone-Optimized" className="bg-zinc-900 text-white font-bold py-2">Phone-Optimized (Touch Nav)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
