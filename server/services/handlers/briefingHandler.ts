import { BaseBotHandler } from "../baseBotHandler.js";
import { 
  FullPipelineState, 
  PipelineStep, 
  ZodMcdSchema, 
  BotContext 
} from "../../types.js";
import { buildPrompt, SYSTEM_PROMPTS } from "../../constants/prompts.js";
import { GMSetup } from "../../types.js";

export class BriefingHandler extends BaseBotHandler {
  readonly stepId = PipelineStep.BOT_0_BRIEFING;

  constructor(private ai: any) {
    super();
  }

  async execute(
    state: FullPipelineState, 
    setup: GMSetup, 
    lastError?: string
  ): Promise<FullPipelineState> {
    const context: BotContext = {
      id: this.stepId,
      setup
    };

    const prompt = buildPrompt(this.stepId, context, lastError);
    const mcd = await this.generateWithRetry(
      this.ai,
      prompt,
      null, // No response schema for Bot 0 since it uses a complex Zod schema and potentially Flash
      ZodMcdSchema,
      { state }
    );

    return { mcd };
  }
}
