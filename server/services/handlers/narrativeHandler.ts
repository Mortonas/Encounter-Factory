import { BaseBotHandler } from "../baseBotHandler.js";
import { 
  FullPipelineState, 
  PipelineStep, 
  NarrativeSchema, 
  ZodNarrativeSchema,
  NarrativeOutput
} from "../../types.js";
import { GMSetup } from "../../types.js";
import { buildPrompt } from "../../constants/prompts.js";

/**
 * BOT 1: NARRATIVE ARCHITECT
 * Produces Section 1 (Flavor), Section 3 (Read-Aloud), and Section 8 (Atmosphere).
 * Synchronizes cinematic text with the tactical grid and monster presence.
 */
export class NarrativeHandler extends BaseBotHandler {
  readonly stepId = PipelineStep.BOT_1_NARRATIVE;

  constructor(private ai: any) {
    super();
  }

  async execute(
    state: FullPipelineState, 
    setup: GMSetup, 
    auditorFeedback?: string
  ): Promise<FullPipelineState> {
    console.log(`[NARRATIVE_HANDLER] Executing Bot 1 (Narrative) logic...`);

    const prompt = buildPrompt(
      this.stepId, 
      { 
        id: this.stepId, 
        mcd: state.mcd!, 
        mechanics: state.mechanics!,
        grid_dimensions: state.section_4_zones_structured?.grid_dimensions,
        section_4_zones: state.section_4_zones || "",
        section_5_actors: state.section_5_actors || "",
        section_5_actors_structured: state.section_5_actors_structured
      }, 
      setup.gmOverrides, 
      setup.gmNotes, 
      setup.gmConcerns, 
      auditorFeedback
    );
    
    // Narrative uses the Flash model for cost efficiency as it is style-focused
    const validated = await this.generateWithRetry<NarrativeOutput>(
      this.ai,
      prompt,
      NarrativeSchema,
      ZodNarrativeSchema,
      {
        state,
        model: "models/gemini-flash-latest",
        auditorFeedback
      }
    );

    return {
      ...state,
      section_1_3_8_narrative: validated
    };
  }

  /**
   * STRUCTURAL INTEGRITY CHECKS
   */
  protected onValidate(parsed: NarrativeOutput, state: FullPipelineState, rawText?: string): void {
    // 1. Base Validation (Commitment Bias / Scratchpad Order)
    super.onValidate(parsed, state, rawText);

    if (!parsed.interactive_points || parsed.interactive_points.length === 0) {
      throw new Error("[NARRATIVE FAILURE] Missing interactive_points. Narrative must provide at least one environmental hook.");
    }

    if (!parsed.gm_cinematic_beats || parsed.gm_cinematic_beats.length === 0) {
      throw new Error("[NARRATIVE FAILURE] Missing gm_cinematic_beats. Boss encounters require dramatic timing triggers.");
    }
  }
}
