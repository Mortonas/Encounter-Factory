import { FullPipelineState, PipelineStep, GMSetup } from "../types.js";
import { parseAIResponse, verifyScratchpadOrder } from "../utils/aiUtils.js";
import { z } from "zod";

/**
 * ARCHITECTURAL RULE: No Side Effects
 * BotHandlers are prohibited from directly writing to the file system or 
 * managing global state. They must only transform the FullPipelineState.
 */
export abstract class BaseBotHandler {
  abstract readonly stepId: PipelineStep;

  /**
   * Executes the bot's logic, transforming the current pipeline state.
   */
  abstract execute(
    state: FullPipelineState, 
    setup: GMSetup,
    auditorFeedback?: string
  ): Promise<FullPipelineState>;

  /**
   * HOOK: Schema Validation
   * Standardized enforcement of Zod schemas. 
   * Child classes should override this to add custom business logic validation 
   * WHILE calling super.validateSchema() to maintain base schema integrity.
   */
  protected validateSchema<T>(schema: z.ZodType<T>, data: any): T {
    try {
      // 1. Mandatory Base Zod Enforcement
      const validated = schema.parse(data);
      
      return validated;
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const issues = err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new Error(`[SCHEMA_VALIDATION_FAILED] ${issues}`);
      }
      throw err;
    }
  }

  /**
   * HOOK: Secondary validation for child classes.
   * Use this for cross-field logic or structural string checks.
   * Defaults to verifying the Commitment Bias (scratchpad order).
   */
  protected onValidate(data: any, state: FullPipelineState, rawText?: string): void {
    if (rawText) {
      verifyScratchpadOrder(rawText);
    }
  }

  /**
   * HELPER: Standardized AI Generation with Retry Logic
   * Handles attempt counting, lastError injection, and validation.
   * Increments temperature on retry to prevent deterministic failure loops.
   */
  protected async generateWithRetry<T>(
    ai: any,
    prompt: string,
    aiResponseSchema: any,
    zodSchema: z.ZodType<T>,
    options: {
      state: FullPipelineState;
      model?: string;
      maxAttempts?: number;
      temperature?: number; // Initial temperature
      stopSequences?: string[];
      auditorFeedback?: string;
      customValidation?: (parsed: T, state: FullPipelineState) => void;
    }
  ): Promise<T> {
    const { 
      state, 
      model = "models/gemini-2.5-pro", 
      maxAttempts = 3, 
      temperature = 0, // Default to 0 for determinism
      customValidation 
    } = options;

    let attempts = 0;
    let lastError = "";
    let currentTemp = temperature;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const feedback = lastError 
          ? `\n\n<system_feedback>\nCRITICAL: The previous attempt failed validation with the following error:\n${lastError}\nYou MUST correct this in the next response.\n</system_feedback>`
          : "";

        const result = await ai.models.generateContent({
          model: model,
          contents: [{ 
            role: "user", 
            parts: [{ text: prompt + feedback + (options.auditorFeedback ? `\n\nAUDITOR FEEDBACK:\n${options.auditorFeedback}` : "") }] 
          }],
          config: {
            responseMimeType: "application/json",
            responseSchema: aiResponseSchema,
            zodSchema: zodSchema,
            temperature: currentTemp,
            stopSequences: options.stopSequences
          },
        });

        const rawText = result.text || "";
        if (!rawText) throw new Error("Empty response from AI");

        const cleanedText = this.cleanJson(rawText);
        
        // PH1: Commitment Bias Check (Inspection of raw string BEFORE parsing)
        verifyScratchpadOrder(cleanedText);

        const parsed = JSON.parse(cleanedText);
        
        // Enforce base schema + child overrides
        const validated = this.validateSchema(zodSchema, parsed);

        // Optional Inline Business Logic Validation
        if (customValidation) {
          customValidation(validated, state);
        }

        // HOOK: Child-specific validation
        this.onValidate(validated, state, cleanedText);

        return validated;
      } catch (err: any) {
        lastError = err.message;
        console.warn(`[${this.stepId}] Attempt ${attempts} failed audit (Temp: ${currentTemp}):`, lastError);
        
        if (attempts >= maxAttempts) throw err;
        
        // DYNAMIC ESCALATION: Increment temperature to break failure loops
        currentTemp = Math.min(1.0, currentTemp + 0.1);
        
        // Standardized Exponential Backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts - 1)));
      }
    }

    throw new Error(`[${this.stepId}] Maximum attempts reached without valid output.`);
  }

  /**
   * HELPER: Raw AI Generation with Retry Logic
   */
  protected async generateRawWithRetry<T = string>(
    ai: any,
    prompt: string,
    options: {
      state: FullPipelineState;
      model?: string;
      maxAttempts?: number;
      temperature?: number;
      extractionRegex?: RegExp; 
      customValidation?: (raw: string, state: FullPipelineState) => T;
      auditorFeedback?: string;
      stopSequences?: string[];
    }
  ): Promise<T | string> {
    const { 
      state, 
      model = "models/gemini-2.5-pro", 
      maxAttempts = 3,
      temperature = 0,
      extractionRegex,
      customValidation
    } = options;

    let attempts = 0;
    let lastError = "";
    let currentTemp = temperature;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const feedback = lastError 
          ? `\n\n<system_feedback>\nCRITICAL: The previous attempt failed validation or parsing. Error:\n${lastError}\nEnsure your output is properly formatted.\n</system_feedback>`
          : "";

        const result = await ai.models.generateContent({
          model: model,
          contents: [{ 
            role: "user", 
            parts: [{ text: prompt + feedback + (options.auditorFeedback ? `\n\nAUDITOR FEEDBACK:\n${options.auditorFeedback}` : "") }] 
          }],
          config: {
            temperature: currentTemp,
            stopSequences: options.stopSequences
          }
        });

        const rawText = result.text || "";
        if (!rawText) throw new Error("Empty response from AI");

        let processedContent: string = rawText.trim();
        if (extractionRegex) {
          const match = rawText.match(extractionRegex);
          if (match) {
            processedContent = match[1].trim();
          } else {
            throw new Error("Required pattern not found in raw response.");
          }
        }

        if (customValidation) {
          const result = customValidation(processedContent, state);
          // HOOK: Child-specific validation on the final object if needed
          this.onValidate(result, state, rawText);
          return result;
        }

        // HOOK: Child-specific validation on the raw string
        this.onValidate(processedContent, state, rawText);
        return processedContent as unknown as T;
      } catch (err: any) {
        lastError = err.message;
        console.warn(`[${this.stepId}] Raw Attempt ${attempts} failed (Temp: ${currentTemp}):`, lastError);
        
        if (attempts >= maxAttempts) throw err;
        
        currentTemp = Math.min(1.0, currentTemp + 0.1);
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts - 1)));
      }
    }

    throw new Error(`[${this.stepId}] Maximum attempts reached without valid output.`);
  }

  /**
   * UTILITY: Strips Markdown backticks and extracts JSON block.
   * Also cleans common LLM "quirks" like comments or trailing commas.
   */
  protected cleanJson(rawText: string): string {
    let json = rawText;
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const match = rawText.match(codeBlockRegex);
    
    if (match) {
      json = match[1].trim();
    } else {
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        json = rawText.substring(firstBrace, lastBrace + 1).trim();
      } else {
        json = rawText.trim();
      }
    }

    // Strip common LLM quirks for JSON.parse
    return json
      .replace(/\/\/.*$/gm, '') // Strip single line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Strip multi-line comments
      .replace(/,\s*([\]}])/g, '$1') // Strip trailing commas
      .trim();
  }
}
