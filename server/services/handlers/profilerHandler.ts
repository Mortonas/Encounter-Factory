import { BaseBotHandler } from "../baseBotHandler.js";
import { 
  FullPipelineState, 
  PipelineStep, 
  PppSchema, 
  ZodPppSchema 
} from "../../types.js";
import { GMSetup } from "../../types.js";
import { buildPrompt } from "../../constants/prompts.js";

/**
 * BOT 6: PARTY PROFILER
 * Audits the Party's 'Power Ceiling' and 'Nova Potential'.
 * Establishes the baseline Party Level and Power Profile for downstream balancing.
 */
export class ProfilerHandler extends BaseBotHandler {
  readonly stepId = PipelineStep.BOT_6_PROFILER;

  constructor(private ai: any) {
    super();
  }

  async execute(
    state: FullPipelineState, 
    setup: GMSetup, 
    auditorFeedback?: string
  ): Promise<FullPipelineState> {
    console.log(`[PROFILER_HANDLER] Executing Bot 6 logic...`);

    const context = { 
      id: this.stepId, 
      mcd: state.mcd! 
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
      PppSchema,
      ZodPppSchema,
      {
        state,
        temperature: 0.1, // Low temperature for factual profiling
        auditorFeedback
      }
    );

    // 3. Success: Return transformed state
    return {
      ...state,
      ppp: validated
    };
  }
}
