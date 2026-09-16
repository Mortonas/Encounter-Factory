import { ScrollText, Sparkles, BookOpen, MessageSquare, Terminal } from "lucide-react";
import { GMSetup } from "../../types";
import { Tooltip } from "../ui/Tooltip";

interface NarrativeDossierProps {
  setup: GMSetup;
  setSetup: (setup: GMSetup) => void;
}

export function NarrativeDossier({ setup, setSetup }: NarrativeDossierProps) {
  return (
    <div className="premium-card p-6 space-y-8">
      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
        <ScrollText className="w-5 h-5 text-amber-500" />
        <h3 className="panel-title text-amber-500/80">Narrative Intelligence</h3>
      </div>

      <div className="space-y-6">
        <div className="space-y-3 pt-2">
          <label className="section-label flex items-center gap-2 text-zinc-400">
            <MessageSquare className="w-3.5 h-3.5 text-amber-500/50" />
            The GM Rant (Unfiltered Intent)
            <Tooltip text="Just rant. Tell me what you want to see, what you're worried about, or any crazy ideas you have. I'll translate the chaos into mechanics." />
          </label>
          <textarea 
            placeholder="Type your unfiltered thoughts here... don't worry about being professional. Just tell me what you want to happen."
            className="premium-input w-full h-40 text-[13px] py-3 bg-amber-500/5 border-amber-500/10 focus:border-amber-500/30 italic text-zinc-400"
            value={setup.gmRant || ""}
            onChange={e => setSetup({...setup, gmRant: e.target.value})}
          />
          <p className="text-[10px] text-zinc-600 px-1">
            *This is the 'Secret Sauce'. I'll analyze this text for hidden tactical desires and thematic flair.*
          </p>
        </div>

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-4">
          <div className="border-l-2 border-amber-500/30 pl-4 py-1">
            <p className="text-[13px] text-zinc-400 font-medium leading-relaxed italic">
              "Rant away. The more unfiltered context you give me, the better. I love weaving small narrative or tactical details into my designs."
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="section-label flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
            Strategic Context
            <Tooltip text="Describe group tropes, player preferences, or what usually makes your sessions 'hit' for this group." />
          </label>
          <textarea 
            className="premium-input w-full h-32 text-[13px] italic leading-relaxed"
            placeholder="Do they love tactical puzzles? Are they risk-averse? Do they prefer cinematic 'rule of cool' moments over raw math?..."
            value={setup.gmNotes || ""}
            onChange={e => setSetup({...setup, gmNotes: e.target.value})}
          />
        </div>

        <div className="space-y-3">
          <label className="section-label flex items-center gap-2">
            <ScrollText className="w-3.5 h-3.5 text-zinc-500" />
            Character Hooks & Seeds
            <Tooltip text="Specific PC goals, unresolved rivalries, or character-specific narrative stakes for this encounter." />
          </label>
          <textarea 
            className="premium-input w-full h-32 text-[13px] italic leading-relaxed"
            placeholder="Describe specific hooks like 'Kaelen's debt to the thieves guild' or 'the party's hunt for the Crimson Eye'..."
            value={setup.gmConcerns || ""}
            onChange={e => setSetup({...setup, gmConcerns: e.target.value})}
          />
        </div>

        <div className="space-y-3">
          <label className="section-label flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
            Foundational Lore
            <Tooltip text="Worldbuilding details, historical context, or specific lore that the bots should weave into the environment/dialogue." />
          </label>
          <textarea 
            className="premium-input w-full h-32 text-[13px] italic leading-relaxed"
            placeholder="Important world details: 'The empire fell 100 years ago', 'Magic is rare and feared', etc..."
            value={setup.loreNotes || ""}
            onChange={e => setSetup({...setup, loreNotes: e.target.value})}
          />
        </div>
      </div>
    </div>
  );
}
