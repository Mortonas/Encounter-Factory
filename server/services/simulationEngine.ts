import { Actor, ActorPhase } from "../types.js";
import { SimulationHooks } from "./simulation/simulationHooks.js";

export interface TransitionResult {
  updatedActor: Actor;
  narrativePayload: {
    beat: string;
    environmentShift: string | null;
    fluxImpact: string | null;
  };
  should_interrupt_ui: boolean;
  stallDuration: number;
  warnings: string[];
}

/**
 * SimulationEngine
 * 
 * Handles the runtime state machine for D&D 5.5e encounters.
 * Enforces stateless math contracts through absolute state overrides.
 */
export class SimulationEngine {
  /**
   * PH7: Executes a phase shift with strict type safety and trait reconciliation.
   */
  static executePhaseTransition(
    actor: Actor,
    phase: ActorPhase,
    currentRound: number
  ): TransitionResult {
    const { state_overrides, transition_overhead = 0 } = phase;
    const warnings: string[] = [];

    console.log(`[SIMULATION_ENGINE] Executing phase transition for ${actor.name} to Phase: ${phase.phase_id}`);

    // 1. Trait Reconciliation: process removals BEFORE additions
    const baseTraits = actor.traits ?? [];
    const afterRemovals = baseTraits.filter(t => !(state_overrides.removed_traits as string[]).includes(t));
    const finalTraits = [...new Set([...afterRemovals, ...state_overrides.added_traits])];

    // 2. Action Reconciliation (Additive/Reconciliation Pattern)
    const finalActions = [...(actor.actions || []), ...state_overrides.new_actions];

    // 3. Absolute Overrides & HP Logic
    const updatedActor: Actor = {
      ...actor,
      ac: state_overrides.ac_override ?? actor.ac,
      dpr: state_overrides.dpr_override ?? actor.dpr,
      hp: phase.hp_pool_behavior === "RESET" 
        ? (state_overrides.hp_override ?? actor.hp) 
        : actor.hp,
      
      traits: finalTraits,
      actions: finalActions,

      // PH7: Runtime simulation tracking
      temp_hp: phase.hp_pool_behavior === "RESET" ? 0 : actor.temp_hp,
      is_untargetable: transition_overhead > 0,
      is_invulnerable: transition_overhead > 0,
      stall_until_round: currentRound + transition_overhead,
      last_phase_transition_round: currentRound,
      current_phase_id: phase.phase_id
    };

    // PH7: Tactical Simulation Hooks
    const lethalityWarning = SimulationHooks.validateLethalityRatio(updatedActor, phase);
    if (lethalityWarning) warnings.push(lethalityWarning.message);

    const actionWarning = SimulationHooks.validateActionEconomy(updatedActor, phase, 0); // Budget check is secondary here
    if (actionWarning) warnings.push(actionWarning.message);

    // PH8: Sequence Break Penalty (Shattered State)
    // If the transition was forced early, apply an EHP 'tax' to reward the players
    if (phase.state_overrides.manual_weight_modifier === -1) { // -1 is our internal flag for forced sequence break
      warnings.push(`Tactical Sequence Break! Applying 'Shattered' EHP penalty (-20% HP) to ${actor.name}.`);
      updatedActor.hp = Math.floor(updatedActor.hp * 0.8);
    }

    // Audit Warning for missing overrides
    if (phase.hp_pool_behavior === "RESET" && !state_overrides.hp_override) {
      warnings.push(`Actor ${actor.name} triggered RESET without hp_override. Kill Clock math may be compromised.`);
    }

    return {
      updatedActor,
      narrativePayload: {
        beat: phase.narrative_beat,
        environmentShift: phase.environment_shift?.description ?? null,
        fluxImpact: phase.environment_shift?.flux_axis_impact ?? null
      },
      should_interrupt_ui: transition_overhead > 0 || !!phase.narrative_beat,
      stallDuration: transition_overhead,
      warnings
    };
  }

  /**
   * PH8: UNIVERSAL TRIGGER RESOLUTION
   * Scans an actor's phase registry to see if a player action triggers 
   * a transition (standard or sequence-break).
   */
  static processUniversalTrigger(
    actor: Actor,
    allPhases: ActorPhase[],
    triggerSource: string,
    currentRound: number
  ): TransitionResult | null {
    const normalizedSource = triggerSource.toLowerCase();

    // 1. Find the target phase by matching the trigger string
    const targetPhase = allPhases.find(p => 
      p.counter_play?.trigger.toLowerCase().includes(normalizedSource) ||
      p.trigger.type.toLowerCase().includes(normalizedSource)
    );

    if (!targetPhase) return null;

    // 2. Identify if this is a sequence break
    const isNextPhase = !actor.current_phase_id || targetPhase.phase_id === actor.current_phase_id; // Simple logic for demo
    
    // 3. If it's a future phase, flag it for the Shattered penalty
    if (!isNextPhase) {
      targetPhase.state_overrides.manual_weight_modifier = -1; 
    }

    return this.executePhaseTransition(actor, targetPhase, currentRound);
  }
}
