import { BaseBotHandler } from "../baseBotHandler.js";
import { 
  FullPipelineState, 
  PipelineStep, 
  AuditorSchema, 
  ZodAuditorSchema 
} from "../../types.js";
import { GMSetup } from "../../types.js";
import { buildPrompt } from "../../constants/prompts.js";
import { TOYBOX_REGISTRY } from "../../constants/toybox.js";
import { MathEngine } from "../mathEngine.js";
import * as MathUtils from "../math/utils.js";

/**
 * BOT 5: EDITOR / AUDITOR
 * The 'Supervisor' of the pipeline. Reviews mechanical and narrative consistency.
 * If validation_passed is false, it returns a validation_report that triggers
 * a pipeline jump back to the mechanical steps.
 */
export class AuditorHandler extends BaseBotHandler {
  readonly stepId = PipelineStep.BOT_5_AUDITOR;

  constructor(private ai: any) {
    super();
  }

  async execute(
    state: FullPipelineState, 
    setup: GMSetup, 
    auditorFeedback?: string
  ): Promise<FullPipelineState> {
    console.log(`[AUDITOR_HANDLER] Executing Bot 5 (Auditor) logic...`);

    // Prune state to focus the Auditor on Mechanical Targets vs Actor Reality
    const context = { 
      id: this.stepId, 
      state: this.pruneStateForAuditor(state),
      toy_efficiency_audit: this.performToyEfficiencyAudit(state),
      counter_play_audit: this.performCounterPlayAudit(state),
      phase_duration_audit: this.performPhaseDurationAudit(state),
      simulation_warnings: state.simulation_warnings || []
    };

    const prompt = buildPrompt(
      this.stepId, 
      context, 
      setup.gmOverrides, 
      setup.gmNotes, 
      setup.gmConcerns, 
      auditorFeedback
    );
    
    // 2. Use standardized generation with retry
    const validated = await this.generateWithRetry(
      this.ai,
      prompt,
      AuditorSchema,
      ZodAuditorSchema,
      {
        state,
        temperature: 0.1, // Very low temperature for auditing
        auditorFeedback
      }
    );

    // 3. If audit passes, perform "Dice Translation" to replace placeholders with actual values
    if (validated.validation_passed) {
      this.translateToyMultipliersToDice(state, validated);
    }

    // 4. Return report
    return {
      ...state,
      auditor_report: validated
    };
  }

  /**
   * PRUNE STATE
   * Removes large display-only fields to ensure the Auditor remains focused 
   * on cross-referencing targets vs roster math.
   */
  private pruneStateForAuditor(state: FullPipelineState): any {
    const s = { ...state };
    return {
      mcd: s.mcd,
      ppp: s.ppp,
      mechanics: s.mechanics,
      math_engine_targets: s.math_engine_targets,
      section_5_actors_structured: s.section_5_actors_structured,
      section_4_zones_structured: s.section_4_zones_structured,
      // Explicitly remove large UI-centric markdown to save tokens
      section_5_actors: undefined,
      section_4_zones: undefined,
      section_6_timeline: undefined,
      section_1_3_8_narrative: undefined,
    };
  }

  /**
   * MATHEMATICAL 3x EFFICIENCY AUDIT
   * Cross-references Cartographer's toys against the Toybox Registry base_math.
   */
  private performToyEfficiencyAudit(state: FullPipelineState): any[] {
    const toys = state.section_4_zones_structured?.axes || [];
    const avgDpr = state.mcd?.party.avg_dpr || 20;
    
    return toys.map(toy => {
      const blueprint = TOYBOX_REGISTRY.find(b => toy.name.includes(b.id) || toy.appearance.includes(b.id));
      if (!blueprint) return { name: toy.name, status: "Unknown Blueprint", efficiency: 0 };

      // Dispatch to Flux-specific audit if it's a Flux toy
      if (blueprint.archetype === "Flux") {
        return this.performFluxEfficiencyAudit(toy, blueprint, avgDpr);
      }

      const estimatedValue = blueprint.base_math.dmg_multiplier * avgDpr;
      const efficiencyRatio = estimatedValue / avgDpr;
      const pass = efficiencyRatio >= 1.5; 

      return {
        id: blueprint.id,
        name: toy.name,
        type: blueprint.archetype,
        target_multiplier: blueprint.base_math.dmg_multiplier,
        calculated_efficiency: efficiencyRatio.toFixed(2),
        pass_3x_rule: pass,
        audit_note: pass 
          ? "Meets tactical efficiency floor." 
          : `WARNING: Low value (${efficiencyRatio.toFixed(2)}x). Toy does not provide enough tactical leverage.`
      };
    });
  }

  /**
   * FLUX-SPECIFIC EFFICIENCY AUDIT
   * Uses valuation_weight to calculate "Virtual Damage" for Action Denial.
   */
  private performFluxEfficiencyAudit(toy: any, blueprint: any, avgDpr: number): any {
    const weight = blueprint.valuation_weight || 0.5;
    
    // Virtual Value = Weight * Avg DPR (e.g. Stun is worth 1.5x a standard turn's damage)
    const virtualValue = weight * avgDpr;
    const efficiencyRatio = virtualValue / avgDpr; // Normalized against a single PC action
    
    // For Flux, we are checking if the "Manual Lever" effort is worth the "Chaos" it stops.
    // We target a 1.0 floor for Flux (worth at least one standard PC action).
    const pass = efficiencyRatio >= 0.8; 

    return {
      id: blueprint.id,
      name: toy.name,
      type: "Flux",
      valuation_weight: weight,
      virtual_dpr_equivalent: virtualValue.toFixed(2),
      calculated_efficiency: efficiencyRatio.toFixed(2),
      pass_3x_rule: pass,
      audit_note: pass
        ? `Meets Flux efficiency floor (Virtual DPR: ${virtualValue.toFixed(2)}).`
        : `WARNING: Flux too weak (${efficiencyRatio.toFixed(2)}x). Action denial weight is too low to justify the tactical axis.`
    };
  }

  /**
   * DICE TRANSLATION
   * Replaces "X.X PC DPR" strings with actual calculated dice expressions.
   */
  private translateToyMultipliersToDice(state: FullPipelineState, report: any) {
    const toys = state.section_4_zones_structured?.axes || [];
    const avgDpr = state.mcd?.party.avg_dpr || 20;

    toys.forEach(toy => {
      const blueprint = TOYBOX_REGISTRY.find(b => toy.name.includes(b.id) || toy.appearance.includes(b.id));
      if (!blueprint) return;

      const targetValue = blueprint.base_math.dmg_multiplier * avgDpr;
      const diceString = this.convertToDiceString(targetValue);

      // Replace in appearance, passive_trigger, and state_change
      const fieldsToUpdate = ["appearance", "passive_trigger", "state_change", "telegraph"] as const;
      fieldsToUpdate.forEach(field => {
        if (toy[field]) {
          toy[field] = toy[field]!.replace(/[\d.]+\s*x\s*PC\s*DPR/gi, diceString);
          // Also catch generic placeholder patterns
          toy[field] = toy[field]!.replace(/damage equal to \d.\d+x the PC DPR/gi, `damage equal to ${diceString}`);
        }
      });
    });
  }

  /**
   * COUNTER-PLAY & PHASE AUDIT
   * Verifies that boss survivability is offset by tactical weaknesses.
   */
  private performCounterPlayAudit(state: FullPipelineState): any[] {
    const actors = state.section_5_actors_structured?.actors || [];
    const party = state.mcd?.party;
    const results: any[] = [];

    // Party Capabilities Registry (Lower-cased for matching)
    const partyAbilities = [
      ...(party?.classes || []),
      ...(party?.weapon_masteries || []),
      ...(party?.strengths || []),
      ...(party?.high_threat_pcs || [])
    ].map(s => s.toLowerCase());

    actors.forEach(actor => {
      const phases = actor.phases || [];
      if (phases.length === 0) return;

      phases.forEach((phase, index) => {
        const hasCounterPlay = !!phase.counter_play?.trigger;
        const ehpOffset = phase.counter_play?.ehp_offset || 0;
        const weightModifier = phase.state_overrides.manual_weight_modifier || 1.0;

        // Rule: Every phase must have a counter-play
        const status = hasCounterPlay ? "Pass" : "FAIL";
        let note = hasCounterPlay 
          ? `Phase ${index + 1} has valid counter-play: ${phase.counter_play.trigger}.`
          : `CRITICAL: Phase ${index + 1} lacks a mandatory tactical weakness (Counter-Play).`;

        // PH8: Cross-reference trigger against party capabilities
        const trigger = phase.counter_play?.trigger?.toLowerCase() || "";
        const isPossible = partyAbilities.some(ability => trigger.includes(ability)) || 
                           trigger.includes("environment") || 
                           trigger.includes("interact") ||
                           trigger.includes("damage"); // Assume damage is always possible
                           
        if (hasCounterPlay && !isPossible) {
          note += ` | WARNING: Counter-play trigger '${phase.counter_play.trigger}' may be impossible for this party configuration.`;
        }

        // Rule: HP RESET behavior must have an override
        if (phase.hp_pool_behavior === "RESET" && !phase.state_overrides.hp_override) {
          note += " | WARNING: RESET behavior detected without hp_override.";
        }

        // Rule: Counter-play should 'tax' the survivability weight
        const isTaxed = ehpOffset > 0 && weightModifier < 1.5;
        if (ehpOffset > 0 && !isTaxed) {
          note += " | WARNING: Counter-play exists but manual_weight_modifier is too high; reward is negated.";
        }

        results.push({
          actor: actor.name,
          phase: index + 1,
          status,
          counter_play_trigger: phase.counter_play?.trigger,
          ehp_offset: ehpOffset,
          audit_note: note
        });
      });
    });

    return results;
  }

  /**
   * PHASE DURATION AUDIT
   * Verifies that each phase provides enough mechanical lifespan for cinematic tension.
   */
  private performPhaseDurationAudit(state: FullPipelineState): any[] {
    const sustainedDpr = state.math_engine_targets?.sustained_dpr || 20;
    const actors = state.section_5_actors_structured?.actors || [];
    const results: any[] = [];

    actors.forEach(actor => {
      if (!actor.phases || actor.phases.length === 0) return;

      // CALL CENTRALIZED MATH ENGINE
      const { phaseBreakdown } = MathUtils.calculateAggregateEHP(
        actor.hp,
        actor.ac,
        actor.dpr,
        actor.phases,
        sustainedDpr
      );

      actor.phases.forEach((phase, index) => {
        // Find corresponding EHP from breakdown
        const breakdown = phaseBreakdown.find(b => b.id === phase.narrative_beat);
        const phaseEhp = breakdown?.ehp || 0;
        const duration = phaseEhp / sustainedDpr;

        // Validation Logic
        const isCompressionRisk = duration < 1.0;
        let severity: "critical" | "warning" | "info" = isCompressionRisk ? "warning" : "info";
        let status = isCompressionRisk ? "WARN" : "Pass";
        let note = isCompressionRisk 
          ? `Narrative Compression Risk: Phase lasts ${duration.toFixed(2)} rounds. (Floor: 1.0)` 
          : `Duration acceptable (${duration.toFixed(2)} rounds).`;

        // ROUND_TIMER Specific: Mechanic Bypass Check
        if (phase.trigger.type === "ROUND_TIMER") {
          const timerValue = phase.trigger.value;
          if (duration < timerValue) {
            severity = "critical";
            status = "FAIL";
            note += ` | Mechanic Bypass Risk: Boss will likely be 'burnt down' before the Round ${timerValue} timer fires.`;
          }
        }

        results.push({
          actor: actor.name,
          phase: index + 1,
          duration: duration.toFixed(2),
          status,
          severity,
          audit_note: note
        });
      });
    });

    return results;
  }

  /**
   * CONVERT VALUE TO 5E DICE STRING
   * Heuristic: Favor round dice pools over exact math.
   */
  private convertToDiceString(target: number): string {
    if (target <= 0) return "0";
    
    // Choose die type based on target size
    const dieType = target > 30 ? 10 : 8;
    const avgPerDie = (dieType + 1) / 2;
    
    // Round to the nearest whole number of dice
    const numDice = Math.max(1, Math.round(target / avgPerDie));
    
    return `${numDice}d${dieType}`;
  }
}
