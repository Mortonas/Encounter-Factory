import { BaseBotHandler } from "../baseBotHandler.js";
import { 
  FullPipelineState, 
  PipelineStep,
  SummaristSchema,
  ZodSummaristSchema,
  SummaristOutput
} from "../../types.js";
import { GMSetup } from "../../types.js";
import { buildPrompt } from "../../constants/prompts.js";

/**
 * BOT 9: TACTICAL SUMMARIST
 * Synthesizes the actors, zones, and narrative beats into a single "Tactical Run-Sheet".
 * Uses generateWithRetry as the output is a smaller JSON-structured markdown block.
 */
export class SummaristHandler extends BaseBotHandler {
  readonly stepId = PipelineStep.BOT_9_SUMMARIST;

  constructor(private ai: any) {
    super();
  }

  async execute(
    state: FullPipelineState, 
    setup: GMSetup, 
    auditorFeedback?: string
  ): Promise<FullPipelineState> {
    console.log(`[${this.stepId}] Synthesizing tactical run-sheet...`);

    const prompt = buildPrompt(
      this.stepId, 
      { 
        section_5_actors_structured: state.section_5_actors_structured,
        section_4_zones_structured: state.section_4_zones_structured,
        section_1_3_8_narrative: state.section_1_3_8_narrative,
        target_action_budget: state.math_engine_targets?.target_action_budget,
        failure_consequence: state.mcd?.premise.failure_consequence
      }, 
      setup.gmOverrides, 
      setup.gmNotes, 
      setup.gmConcerns, 
      auditorFeedback
    );
    
    const validated = await this.generateWithRetry<SummaristOutput>(
      this.ai,
      prompt,
      SummaristSchema,
      ZodSummaristSchema,
      { 
        state, 
        model: "models/gemini-flash-latest",
        auditorFeedback 
      }
    );

    return {
      ...state,
      section_10_tactical_summary: validated
    };
  }

  /**
   * HOOK: Tactical Summary Validation
   * Ensures the run-sheet is comprehensive and addresses the critical "Lethality Spike".
   */
  protected onValidate(data: SummaristOutput, state: FullPipelineState, rawText?: string): void {
    // 1. Commitment Bias Check (Inspection of raw string to bypass key randomization)
    if (rawText) {
      super.onValidate(data, state, rawText);
    }

    const summary = data.tactical_summary_markdown;

    // 2. Structural Presence Checks
    const requiredSections = [
      "Round 1",
      "Phase",
      "Lethality",
      "Action"
    ];

    const missing = requiredSections.filter(s => !summary.toLowerCase().includes(s.toLowerCase()));
    if (missing.length > 0) {
      throw new Error(`[SCHEMA_VIOLATION] Tactical Summary is missing critical sections: ${missing.join(", ")}`);
    }

    // 2. Minimum Depth Check
    if (summary.length < 300) {
      throw new Error(`[SCHEMA_VIOLATION] Tactical Summary is too brief (${summary.length} chars). Provide more tactical depth for the GM.`);
    }

    // 3. Commitment Bias Check (Already handled by super.validateSchema calling verifyScratchpadOrder)
  }
}
