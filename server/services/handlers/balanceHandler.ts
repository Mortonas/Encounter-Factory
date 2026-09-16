import { BaseBotHandler } from "../baseBotHandler.js";
import { 
  FullPipelineState, 
  PipelineStep, 
  MechanicsSchema, 
  ZodMechanicsSchema 
} from "../../types.js";
import { GMSetup } from "../../types.js";
import { MathEngine } from "../mathEngine.js";
import * as MathUtils from "../math/utils.js";
import { buildPrompt } from "../../constants/prompts.js";

/**
 * BOT 4: BALANCE ANALYST
 * Responsible for generating the mechanical 'Kill Clock' targets.
 * Enforces the 0.4 Lethality Formula and Nova-Proof benchmarks.
 */
export class BalanceHandler extends BaseBotHandler {
  readonly stepId = PipelineStep.BOT_4_BALANCE;

  constructor(private ai: any) {
    super();
  }

  /**
   * HOOK: Custom Business Logic Validation (Kill Clock Audit)
   * This is executed AFTER the Zod schema is enforced by the base handler.
   */
  protected onValidate(data: any, state: FullPipelineState, rawText?: string): void {
    // 1. Base Validation (Commitment Bias / Scratchpad Order)
    super.onValidate(data, state, rawText);

    if (!state?.math_engine_targets) return;

    const mechanics = data.mechanics;
    const targets = state.math_engine_targets;

    // 1. PH7: HP Threshold Integrity Check
    if (mechanics.phase_triggers?.length) {
      // In Bot 4 context, hp_threshold is an integer (e.g. 50 for 50%)
      const hpTriggers = mechanics.phase_triggers
        .map((p: any) => p.hp_threshold);
      
      const unique = new Set(hpTriggers);
      if (unique.size !== hpTriggers.length) {
        throw new Error("HP threshold values must be unique across all phases.");
      }
      
      for (let i = 0; i < hpTriggers.length - 1; i++) {
        if (hpTriggers[i] <= hpTriggers[i + 1]) {
          throw new Error("HP threshold values must be strictly descending (e.g., 75 -> 50).");
        }
      }
    }

    // 2. Aggregate EHP Validation (The Kill Clock Audit)
    // Map Bot 4 phase_triggers to the shape expected by calculateAggregateEHP (Bot 3 shape)
    const mappedPhases = (mechanics.phase_triggers || []).map((p: any) => ({
      trigger: {
        type: p.trigger,
        value: p.hp_threshold
      },
      hp_pool_behavior: "REMAINING",
      state_overrides: {
        added_traits: [],
        ac_override: null,
        dpr_override: null,
        hp_override: null,
        manual_weight_modifier: 1.0
      },
      narrative_beat: p.narrative_beat
    }));

    const { totalEhp, auditLog } = MathUtils.calculateAggregateEHP(
      mechanics.anchor_hp_range.max, 
      mechanics.max_ac, // Use max_ac as base for audit
      mechanics.damage_per_round_target,
      mappedPhases,
      targets.nova_dpr / 3, // Approximation for sustained dpr
      0 // No transition overhead in Bot 4 context yet
    );

    // 3. Drift Check
    const dprDrift = Math.abs(mechanics.nova_dpr_estimated - targets.nova_dpr);
    const hpDrift = totalEhp < targets.target_anchor_hp_min;

    if (dprDrift > (targets.nova_dpr * 0.05) || hpDrift) {
      throw new Error(
        `MATH DRIFT DETECTED: Proposed state violates Kill Clock targets.\n` +
        `Aggregated EHP: ${Math.round(totalEhp)} (Min Required: ${targets.target_anchor_hp_min})\n` +
        `Audit Trail:\n${auditLog.join("\n")}`
      );
    }

    // Attach audit log to the data for persistence
    mechanics.balance_audit_log = auditLog;
  }

  async execute(
    state: FullPipelineState, 
    setup: GMSetup, 
    auditorFeedback?: string
  ): Promise<FullPipelineState> {
    console.log(`[BALANCE_HANDLER] Executing Bot 4 logic...`);

    // 1. Prepare mechanical targets via MathEngine
    const targets = MathEngine.generateTargets(state.mcd!, state.ppp?.power_profile);
    
    // Create a NEW state object to avoid mutating the shared reference
    const nextState: FullPipelineState = {
      ...state,
      math_engine_targets: targets
    };
    
    const context = { 
      id: this.stepId, 
      mcd: state.mcd!, 
      ppp: state.ppp!, 
      math_engine_targets: targets 
    };

    const prompt = buildPrompt(
      this.stepId, 
      context, 
      setup.gmOverrides, 
      setup.gmNotes, 
      setup.gmConcerns, 
      auditorFeedback
    );
    
    // 2. Use standardized generation with retry (uses onValidate hook internally)
    const validated = await this.generateWithRetry(
      this.ai,
      prompt,
      MechanicsSchema,
      ZodMechanicsSchema,
      {
        state: nextState,
        temperature: 0.2,
        auditorFeedback
      }
    );

    // 3. Return transformed state
    return {
      ...state,
      math_engine_targets: targets,
      mechanics: validated,
    };
  }
}
