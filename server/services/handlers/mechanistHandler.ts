import { BaseBotHandler } from "../baseBotHandler.js";
import { 
  FullPipelineState, 
  PipelineStep, 
  MechanistSchema, 
  ZodMechanistSchema 
} from "../../types.js";
import { GMSetup } from "../../types.js";
import { buildPrompt } from "../../constants/prompts.js";

/**
 * BOT 3: LEAD MECHANIST
 * Generates the actual Tactical Roster (Actors) based on the Kill Clock targets.
 * This is the highest-volatility step, requiring strict per-actor validation.
 */
export class LeadMechanistHandler extends BaseBotHandler {
  readonly stepId = PipelineStep.BOT_3_MECHANIST;
  private readonly ROSTER_DRIFT_TOLERANCE = 0.1; // 10% allowed drift

  constructor(private ai: any) {
    super();
  }

  /**
   * HOOK: Custom Roster Math Validation
   * Ensures the AI-generated actors match the physical targets set by Bot 4.
   */
  protected onValidate(data: any, state: FullPipelineState, rawText?: string): void {
    // 1. Base Validation (Commitment Bias / Scratchpad Order)
    super.onValidate(data, state, rawText);

    if (!state?.mechanics) return;

    const actors = data.actors || [];
    const totalHp = actors.reduce((sum: number, a: any) => sum + a.hp, 0);
    const totalDpr = actors.reduce((sum: number, a: any) => sum + a.dpr, 0);
    const anchor = actors.find((a: any) => a.type === "Anchor");

    const hpTarget = state.mechanics.mechanics.total_roster_hp;
    const dprTarget = state.mechanics.mechanics.damage_per_round_target;
    const anchorHpMin = state.mechanics.mechanics.anchor_hp_range.min;

    let mathErrors: string[] = [];
    if (Math.abs(totalHp - hpTarget) > (hpTarget * this.ROSTER_DRIFT_TOLERANCE)) {
      mathErrors.push(`ROSTER HP MISMATCH: Total is ${totalHp}, but target was ${hpTarget} (±${this.ROSTER_DRIFT_TOLERANCE * 100}%).`);
    }
    if (Math.abs(totalDpr - dprTarget) > (dprTarget * this.ROSTER_DRIFT_TOLERANCE)) {
      mathErrors.push(`ROSTER DPR MISMATCH: Total is ${totalDpr}, but target was ${dprTarget} (±${this.ROSTER_DRIFT_TOLERANCE * 100}%).`);
    }
    if (anchor && anchor.hp < anchorHpMin) {
      mathErrors.push(`ANCHOR HP TOO LOW: ${anchor.name} has ${anchor.hp} HP, but needs at least ${anchorHpMin} to survive Nova Strike.`);
    }

    if (mathErrors.length > 0) {
      throw new Error(`CRITICAL MATH VIOLATION:\n${mathErrors.join('\n')}\nYou MUST adjust actor stats to meet these targets.`);
    }
  }

  async execute(
    state: FullPipelineState, 
    setup: GMSetup, 
    auditorFeedback?: string
  ): Promise<FullPipelineState> {
    console.log(`[MECHANIST_HANDLER] Executing Bot 3 (Lead Mechanist) logic...`);

    const context = { 
      id: this.stepId, 
      mcd: state.mcd!, 
      ppp: state.ppp!, 
      mechanics: state.mechanics!, 
      math_engine_targets: state.math_engine_targets!,
      section_4_zones_structured: state.section_4_zones_structured 
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
      MechanistSchema,
      ZodMechanistSchema,
      {
        state,
        temperature: 0.3,
        auditorFeedback
      }
    );

    // 3. Success: Commit to state
    return {
      ...state,
      section_5_actors_structured: validated,
      section_5_actors: validated.section_5_actors
    };
  }
}
