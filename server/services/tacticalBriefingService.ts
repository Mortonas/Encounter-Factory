
import { 
  FullPipelineState, 
  TacticalBriefing, 
  CartographerOutput,
  MechanistOutput
} from "../types.js";
import { VTT_MASTERY_MAPPINGS } from "./vttMapper.js";
import { MathEngine } from "./mathEngine.js";
import * as MathUtils from "./math/utils.js";

/**
 * TacticalBriefingService
 * 
 * Deterministic service that transforms simulation results into a structured 
 * data object for the GM's Tactical Briefing. This prevents the LLM from 
 * hallucinating math or synergies.
 */
export class TacticalBriefingService {
  /**
   * Generates the structured TacticalBriefing object from the current pipeline state.
   */
  public static generate(state: FullPipelineState): TacticalBriefing {
    const math = state.math_engine_targets;
    const mechanist = state.section_5_actors_structured;
    const cartographer = state.section_4_zones_structured;
    const partyMasteries = this.getPartyMasteries(state);

    if (!math || !mechanist || !cartographer) {
      throw new Error("[TacticalBriefingService] Missing required pipeline state for briefing generation.");
    }

    // 1. Calculate Survival Range for the Anchor (Boss)
    const anchor = mechanist.actors.find(a => a.type === "Anchor") || mechanist.actors[0];
    const { totalEhp: ehp } = MathUtils.calculateAggregateEHP(
      anchor.hp,
      anchor.ac,
      anchor.dpr,
      anchor.phases,
      math.sustained_dpr
    );
    const range = MathUtils.calculateSurvivalRange(ehp, math.sustained_dpr, math.nova_dpr);

    // 2. Identify Mastery Levers and Validate Relevance
    const levers = this.mapMasteryLevers(cartographer, partyMasteries);

    // 3. Collect Simulation Warnings
    const warnings = state.simulation_warnings || [];

    return {
      kill_clock_outlook: `Based on the party's Nova potential (${math.nova_dpr} DPR) and Sustained output (${math.sustained_dpr} DPR), the primary threat is expected to survive between ${range.min_rounds} and ${range.max_rounds} rounds.`,
      survival_range: {
        min_rounds: range.min_rounds,
        max_rounds: range.max_rounds,
        justification: `Survival range accounts for Tier ${Math.ceil(ehp / (math.sustained_dpr || 1))} resource expenditure and baseline 5.5e accuracy.`
      },
      mastery_levers: levers,
      lethality_warnings: warnings,
      gm_advice: "" // To be populated by Bot 8 (Publisher) using the data above as context.
    };
  }

  /**
   * Maps environmental axes to mastery synergies and flags those missing from the party.
   */
  private static mapMasteryLevers(cartographer: CartographerOutput, partyMasteries: Set<string>) {
    const levers: any[] = [];

    cartographer.axes.forEach(axis => {
      if (axis.mastery_synergies && axis.mastery_synergies.length > 0) {
        axis.mastery_synergies.forEach(mastery => {
          const hasMastery = partyMasteries.has(mastery);
          
          levers.push({
            toy_name: axis.name,
            trigger: axis.automatic_trigger || axis.manual_lever,
            synergy: `${mastery}: ${VTT_MASTERY_MAPPINGS[mastery]?.description || "Custom effect."}${!hasMastery ? " (NOTE: Party lacks this mastery; suggest Shove/Spells instead)" : ""}`
          });
        });
      }
    });

    return levers;
  }

  /**
   * Extracts unique weapon masteries from the party profile.
   */
  private static getPartyMasteries(state: FullPipelineState): Set<string> {
    const masteries = new Set<string>();
    if (state.mcd?.party?.weapon_masteries) {
      state.mcd.party.weapon_masteries.forEach(m => masteries.add(m));
    }
    return masteries;
  }
}
