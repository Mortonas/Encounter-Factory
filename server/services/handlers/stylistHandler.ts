import { BaseBotHandler } from "../baseBotHandler.js";
import { 
  FullPipelineState, 
  PipelineStep,
  StylistSchema,
  ZodStylistSchema,
  StylistOutput
} from "../../types.js";
import { GMSetup } from "../../types.js";
import { buildPrompt } from "../../constants/prompts.js";

/**
 * BOT 10: CINEMATIC STYLIST
 * Performs the "Prestige Pass" on the final Grimoire output.
 * Preserves the [SEMANTIC_HTML] structure from Bot 8 while elevating prose and CSS alignment.
 */
export class StylistHandler extends BaseBotHandler {
  readonly stepId = PipelineStep.BOT_10_STYLIST;

  constructor(private ai: any) {
    super();
  }

  async execute(
    state: FullPipelineState, 
    setup: GMSetup, 
    auditorFeedback?: string
  ): Promise<FullPipelineState> {
    console.log(`[${this.stepId}] Executing Cinematic Prestige Pass...`);

    // The Stylist primarily processes the Publisher's output.
    const context = {
      semantic_markdown: state.section_7_8_publisher?.semantic_markdown,
      vtt_section: state.section_7_8_publisher?.vtt_section,
      tone: state.mcd?.parameters?.tone_guardrails
    };

    const prompt = buildPrompt(
      this.stepId, 
      context, 
      setup.gmOverrides, 
      setup.gmNotes, 
      setup.gmConcerns, 
      auditorFeedback
    );
    
    const validated = await this.generateWithRetry<StylistOutput>(
      this.ai,
      prompt,
      StylistSchema,
      ZodStylistSchema,
      { 
        state, 
        model: "models/gemini-2.5-pro", // Pro for complex structural audit
        auditorFeedback 
      }
    );

    return {
      ...state,
      section_9_10_stylist: validated
    };
  }

  /**
   * HOOK: Cinematic Stylist Validation
   * Enforces structural integrity and "Prestige" character floors.
   */
  protected onValidate(data: StylistOutput, state: FullPipelineState, rawText?: string): void {
    // 1. Commitment Bias Check
    if (rawText) {
      super.onValidate(data, state, rawText);
    }

    const output = data.styled_output;

    // 2. Style Guide / Structural Audit
    const requiredClasses = [
      ".header-container",
      ".balance-badge",
      ".stat-block",
      ".tactical-grid",
      ".sensory-grid"
    ];

    const missing = requiredClasses.filter(c => !output.includes(c.replace(".", "")));
    if (missing.length > 0) {
      throw new Error(`[SCHEMA_VIOLATION] Styled output is missing mandatory CSS components: ${missing.join(", ")}`);
    }

    // 3. Atmospheric/Sensory Floor
    // Given Bot 10 is the "Prestige" pass, a truncated or lazy response is a failure.
    // We expect the final Grimoire body to be substantial.
    const minChars = 1500; 
    if (output.length < minChars) {
      throw new Error(`[SCHEMA_VIOLATION] Styled output is too brief (${output.length} chars). A high-prestige pass requires more descriptive depth.`);
    }

    // 4. Iconography Marker Check
    const icons = ["⚔️", "👁️", "⚠️", "📜", "💡"];
    const foundIcons = icons.filter(i => output.includes(i));
    if (foundIcons.length < 2) {
      throw new Error("[SCHEMA_VIOLATION] Stylist failed Iconography Enforcement. Use icons for improved GM scanability.");
    }
  }
}
