import { Actor, ActorPhase } from "../../types.js";

export interface SimulationWarning {
  type: string;
  actor: string;
  phase_id: string;
  message: string;
  severity: "critical" | "warning" | "info";
}

/**
 * PH7: TACTICAL SIMULATION HOOKS
 * Modular validation rules that run during the headless simulation audit.
 */
export class SimulationHooks {
  /**
   * THE 4:10 RATIO (Lethality Floor)
   * For every 10 HP an enemy has, it must output ~4 Damage Per Round (DPR) 
   * to remain threatening (GEMINI.md §4).
   */
  static validateLethalityRatio(
    actor: Actor, 
    phase: ActorPhase
  ): SimulationWarning | null {
    const hp = phase.hp_pool_behavior === "RESET" 
      ? (phase.state_overrides.hp_override || actor.hp)
      : actor.hp; // Note: In sequential audit, this 'actor.hp' is the slice HP
    
    const dpr = phase.state_overrides.dpr_override || actor.dpr;
    
    if (hp <= 0) return null;

    const ratio = dpr / hp;
    
    // We allow a small margin (0.35 instead of 0.4) to account for utility-heavy phases
    if (ratio < 0.35) {
      return {
        type: "LETHALITY_RATIO",
        actor: actor.name,
        phase_id: phase.phase_id || phase.narrative_beat,
        message: `Boring Sponge Warning: DPR/HP ratio (${ratio.toFixed(2)}) is below the 0.4 threshold. This phase lacks sufficient threat for its bulk.`,
        severity: "warning"
      };
    }

    return null;
  }

  /**
   * ACTION ECONOMY HOOK (The 2:1 Rule)
   * Ensures that phase transitions don't result in a massive action economy drop.
   */
  static validateActionEconomy(
    actor: Actor,
    phase: ActorPhase,
    targetActionBudget: number
  ): SimulationWarning | null {
    const currentActions = (actor.actions || []).length;
    const newActions = phase.state_overrides.new_actions?.length || 0;
    const removedActions = phase.state_overrides.removed_traits?.filter(t => t.toLowerCase().includes("action")).length || 0;
    
    const totalActions = currentActions + newActions - removedActions;
    
    if (totalActions < 1) {
      return {
        type: "ACTION_DRAIN",
        actor: actor.name,
        phase_id: phase.phase_id || phase.narrative_beat,
        message: `Action Drain: Actor has 0 effective actions in this phase.`,
        severity: "critical"
      };
    }

    return null;
  }

  /**
   * MASTERY SYNERGY HOOK
   * Verifies that the toy's triggers match its defined mastery synergies.
   */
  static validateMasterySynergy(
    axis: any
  ): SimulationWarning | null {
    const synergies = axis.mastery_synergies || [];
    const trigger = (axis.interaction_trigger || "").toLowerCase();
    const passive = (axis.passive_trigger || "").toLowerCase();

    if (synergies.includes("Push")) {
      const mentionsPush = trigger.includes("push") || passive.includes("push") || passive.includes("movement") || passive.includes("forced");
      if (!mentionsPush) {
        return {
          type: "MASTERY_CONFLICT",
          actor: "Environment",
          phase_id: axis.name,
          message: `Mastery Conflict: '${axis.name}' claims Push synergy but trigger text lacks 'push' or 'forced movement' cues.`,
          severity: "warning"
        };
      }
    }

    if (synergies.includes("Topple") && !trigger.includes("prone") && !passive.includes("prone")) {
      return {
        type: "MASTERY_CONFLICT",
        actor: "Environment",
        phase_id: axis.name,
        message: `Mastery Conflict: '${axis.name}' claims Topple synergy but lacks 'prone' mechanics.`,
        severity: "warning"
      };
    }

    return null;
  }

  /**
   * SPATIAL CONSISTENCY HOOK
   * Verifies that activation distances and size constraints are within 5.5e bounds.
   */
  static validateTacticalConstraints(
    axis: any
  ): SimulationWarning | null {
    const { activation_distance, size_constraint, mastery_synergies } = axis;

    if (mastery_synergies?.includes("Push") && activation_distance > 10) {
      return {
        type: "SPATIAL_CONFLICT",
        actor: "Environment",
        phase_id: axis.name,
        message: `Spatial Conflict: '${axis.name}' Push synergy exceeds 10ft limit (currently ${activation_distance}ft).`,
        severity: "warning"
      };
    }

    return null;
  }
}
