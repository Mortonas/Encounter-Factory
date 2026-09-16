import { afterEach, describe, expect, it } from "vitest";
import { AIProvider } from "./aiProvider.js";
import { PipelineStep } from "../types.js";

const schemaStrictSteps = [
  PipelineStep.BOT_0_BRIEFING,
  PipelineStep.BOT_2_CARTOGRAPHER,
  PipelineStep.BOT_3_MECHANIST,
  PipelineStep.BOT_4_BALANCE,
  PipelineStep.BOT_5_AUDITOR,
  PipelineStep.BOT_6_PROFILER
];

describe("AIProvider routing", () => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalDeepSeekKey = process.env.DEEPSEEK_API_KEY;
  const originalOpenRouterKey = process.env.OPENROUTER_API_KEY;

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalGeminiKey;
    process.env.DEEPSEEK_API_KEY = originalDeepSeekKey;
    process.env.OPENROUTER_API_KEY = originalOpenRouterKey;
  });

  it("keeps schema-strict pipeline steps on Gemini Pro even when DeepSeek is configured", () => {
    process.env.GEMINI_API_KEY = "gemini-key";
    process.env.DEEPSEEK_API_KEY = "deepseek-key";
    process.env.OPENROUTER_API_KEY = "openrouter-key";

    for (const step of schemaStrictSteps) {
      const adapter = AIProvider.getAI(step) as any;

      expect(adapter.constructor.name).toBe("GeminiAdapter");
      expect(adapter.modelName).toBe("gemini-2.5-pro");
    }
  });

  it("still allows DeepSeek for non-schema-strict steps when configured", () => {
    process.env.GEMINI_API_KEY = "gemini-key";
    process.env.DEEPSEEK_API_KEY = "deepseek-key";
    process.env.OPENROUTER_API_KEY = "";

    const adapter = AIProvider.getAI(PipelineStep.BOT_1_NARRATIVE) as any;

    expect(adapter.constructor.name).toBe("DeepSeekAdapter");
  });
});
