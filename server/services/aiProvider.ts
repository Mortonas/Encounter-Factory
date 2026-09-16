import { GoogleGenAI } from "@google/genai";
import { PipelineStep } from "../types.js";
import { z } from "zod";

export class AIProvider {
  static getAI(stepId?: PipelineStep) {
    const orKey = process.env.OPENROUTER_API_KEY?.trim();
    const dsKey = process.env.DEEPSEEK_API_KEY?.trim();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();

    const schemaStrictGeminiProSteps = [
      PipelineStep.BOT_0_BRIEFING,
      PipelineStep.BOT_2_CARTOGRAPHER,
      PipelineStep.BOT_3_MECHANIST,
      PipelineStep.BOT_4_BALANCE,
      PipelineStep.BOT_5_AUDITOR,
      PipelineStep.BOT_6_PROFILER
    ];

    const geminiProPreferredSteps = schemaStrictGeminiProSteps;

    const isPlaceholder = !dsKey || dsKey === "YOUR_DEEPSEEK_KEY_HERE";

    if (stepId && schemaStrictGeminiProSteps.includes(stepId)) {
      return new GeminiAdapter("gemini-2.5-pro", stepId);
    }

    if (dsKey && !isPlaceholder) {
      return new DeepSeekAdapter(dsKey, stepId);
    }

    if (geminiKey) {
      const isPro = stepId && geminiProPreferredSteps.includes(stepId);
      return new GeminiAdapter(isPro ? "gemini-2.5-pro" : "gemini-2.5-flash", stepId);
    }

    if (stepId && geminiProPreferredSteps.includes(stepId) && orKey) {
      return new OpenRouterAdapter(orKey, "anthropic/claude-sonnet-4.6", stepId);
    }

    const draftingSteps = [
      PipelineStep.BOT_2_CARTOGRAPHER,
      PipelineStep.BOT_3_MECHANIST
    ];

    if (stepId && draftingSteps.includes(stepId) && !isPlaceholder) {
      return new DeepSeekAdapter(dsKey!, stepId);
    }

    if (orKey) {
      return new OpenRouterAdapter(orKey, undefined, stepId);
    }

    return new GeminiAdapter("gemini-2.5-flash", stepId);
  }
}

abstract class BaseAIAdapter {
  constructor(protected stepId?: PipelineStep) {}

  /**
   * Simplified Zod to JSON Schema converter for system prompt injection.
   * Focuses on object structure, arrays, and descriptions.
   */
  protected zodToJsonSchema(schema: any): string {
    if (!schema) return "";
    
    const parse = (s: any): any => {
      if (!s) return { type: "unknown" };
      
      const def = s._def;
      const typeName = def?.typeName || s.constructor.name;

      // Handle ZodEffects (.refine, .transform)
      if (typeName === "ZodEffects" || typeName === "ZodTransformer") {
        return parse(def.schema);
      }

      switch (typeName) {
        case "ZodObject":
          const shape = typeof s.shape === "object" ? s.shape : (typeof def.shape === "function" ? def.shape() : def.shape);
          if (!shape) return { type: "object", properties: {} };
          
          const props: any = {};
          Object.keys(shape).forEach(key => {
            props[key] = parse(shape[key]);
          });
          return {
            type: "object",
            properties: props,
            required: Object.keys(shape).filter(key => {
              const innerDef = shape[key]._def;
              const innerType = innerDef?.typeName || shape[key].constructor.name;
              return innerType !== "ZodOptional" && innerType !== "ZodDefault";
            }),
            description: def?.description || s.description
          };
        case "ZodArray":
          return {
            type: "array",
            items: parse(def.type || s.element),
            description: def?.description || s.description
          };
        case "ZodString": return { type: "string", description: def?.description || s.description };
        case "ZodNumber": return { type: "number", description: def?.description || s.description };
        case "ZodBoolean": return { type: "boolean", description: def?.description || s.description };
        case "ZodEnum": return { type: "string", enum: def.values, description: def?.description || s.description };
        case "ZodOptional": return parse(def.innerType || s._def.innerType);
        case "ZodDefault": return parse(def.innerType || s._def.innerType);
        default: 
          return { type: "any", description: def?.description || s.description };
      }
    };

    try {
      return JSON.stringify(parse(schema), null, 2);
    } catch (e) {
      return "Error serializing Zod schema.";
    }
  }

  protected mapMessages(params: any): any[] {
    const messages: any[] = [];
    let systemInstr = params.systemInstruction?.parts?.[0]?.text || params.system_instruction || "";

    // 1. Dynamic Zod Schema Injection
    // We look for 'zodSchema' in the config, which is the most "active" runtime definition
    const zodSchema = params.config?.zodSchema || params.generationConfig?.zodSchema;
    const jsonSchema = params.config?.responseSchema || params.generationConfig?.responseSchema;

    if (zodSchema) {
      const schemaString = this.zodToJsonSchema(zodSchema);
      const hasScratchpad = schemaString.includes("chain_of_thought_scratchpad");
      systemInstr += `\n\nCRITICAL JSON RULES:
- You MUST respond in valid JSON matching this exact structure:
${schemaString}
- NEVER return null for numbers or strings unless explicitly allowed by the schema.
- If data is missing for a mechanical field (hp, dpr, target_rounds, etc.), you MUST estimate a professional 5.5e baseline value.
- NEVER wrap numbers in objects (e.g., use 45, not {"min": 40, "max": 50}).
${hasScratchpad ? '- Reasoning/scratchpad MUST be the FIRST property: "chain_of_thought_scratchpad".\n- BE EXTREMELY CONCISE in the scratchpad. Limit to 3-5 bullet points max.' : ''}
- Response must be raw JSON only. No markdown backticks.`;
    } else if (jsonSchema) {
      const hasScratchpad = JSON.stringify(jsonSchema).includes("chain_of_thought_scratchpad");
      systemInstr += `\n\nCRITICAL: You MUST respond in valid JSON matching this exact structure:\n${JSON.stringify(jsonSchema, null, 2)}
${hasScratchpad ? '\nReasoning/scratchpad MUST be the FIRST property: "chain_of_thought_scratchpad".\nBE EXTREMELY CONCISE.' : ''}`;
    }

    if (systemInstr) {
      messages.push({ role: "system", content: systemInstr });
    }

    if (params.contents) {
      params.contents.forEach((c: any) => {
        messages.push({
          role: c.role === "model" ? "assistant" : c.role,
          content: c.parts[0].text
        });
      });
    }

    return messages;
  }

  protected mapConfig(params: any): any {
    const rawConfig = params.config || params.generationConfig || {};
    
    // Unified High-Prestige Token Limits
    let maxTokens = 8192; 
    
    return {
      temperature: rawConfig.temperature ?? 0.7,
      max_tokens: rawConfig.maxOutputTokens ?? rawConfig.max_tokens ?? maxTokens,
      stop: rawConfig.stopSequences || rawConfig.stop || undefined,
      response_format: rawConfig.responseMimeType === "application/json" 
        ? { type: "json_object" } 
        : undefined
    };
  }

  protected createSdkCompatibleResponse(text: string) {
    const response = {
      text: () => text,
      candidates: [{ content: { parts: [{ text }] } }],
      response: { text: () => text }
    };
    Object.defineProperty(response, 'text', {
      get: () => text,
      enumerable: true,
      configurable: true
    });
    return response;
  }
}

class GeminiAdapter extends BaseAIAdapter {
  private genAI: GoogleGenAI;

  constructor(private modelName: string, stepId?: PipelineStep) {
    super(stepId);
    this.genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  }

  get models() {
    return {
      generateContent: async (params: any) => {
        const config = this.mapConfig(params);
        const messages = this.mapMessages(params);
        
        // Extract system instruction and content for the new SDK structure
        const systemInstruction = messages.find(m => m.role === "system")?.content;
        const contents = messages
          .filter(m => m.role !== "system")
          .map(m => ({
            role: m.role === "assistant" ? "model" : m.role,
            parts: [{ text: m.content }]
          }));

        const result = await this.genAI.models.generateContent({
          model: this.modelName,
          contents,
          config: {
            systemInstruction,
            temperature: config.temperature,
            maxOutputTokens: config.max_tokens,
            stopSequences: config.stop,
            responseMimeType: params.config?.responseMimeType || "text/plain"
          }
        });

        const text = result.candidates[0].content.parts[0].text;
        return this.createSdkCompatibleResponse(text);
      }
    };
  }
}

class OpenRouterAdapter extends BaseAIAdapter {
  constructor(private apiKey: string, private forcedModel?: string, stepId?: PipelineStep) {
    super(stepId);
  }

  get models() {
    return {
      generateContent: async (params: any) => {
        let model = this.forcedModel || params.model;
        if (model.includes("gemini-2.5-pro") || model.includes("gemini-pro")) model = "google/gemini-2.5-pro";
        else if (model.includes("gemini-3-flash")) model = "google/gemini-3-flash-preview";
        else if (model.includes("gemini-2.5-flash") || model.includes("gemini-1.5-flash") || model.includes("gemini-flash")) model = "nousresearch/hermes-3-llama-3.1-405b:free";
        else if (model.includes("pro-sonnet")) model = "anthropic/claude-3.5-sonnet";
        else if (model.startsWith("models/")) model = `google/${model.replace("models/", "")}`;

        const config = this.mapConfig(params);
        const messages = this.mapMessages(params);
        const payload = { model, messages, temperature: config.temperature, max_tokens: config.max_tokens, stop: config.stop, response_format: model.includes(":free") ? undefined : config.response_format };

        if (process.env.DEBUG_AI_PAYLOAD === "true") {
          console.log(`[AI_DEBUG] ${this.stepId || 'OR'} Payload:`, JSON.stringify(payload, null, 2));
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${this.apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://encounter-builder.io", "X-Title": "Encounter Builder" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`OpenRouter Error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const text = data.choices[0].message.content;
        const usage = data.usage;
        if (usage) {
          console.log(`[TOKEN_USAGE] ${this.stepId || 'OR'}: Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, Total: ${usage.total_tokens}`);
        }
        return this.createSdkCompatibleResponse(text);
      }
    };
  }
}

class DeepSeekAdapter extends BaseAIAdapter {
  constructor(private apiKey: string, stepId?: PipelineStep) {
    super(stepId);
  }

  get models() {
    return {
      generateContent: async (params: any) => {
        const config = this.mapConfig(params);
        const messages = this.mapMessages(params);
        const payload = { model: "deepseek-chat", messages, temperature: config.temperature, max_tokens: config.max_tokens, stop: config.stop, response_format: config.response_format, stream: false };

        if (process.env.DEBUG_AI_PAYLOAD === "true") {
          console.log(`[AI_DEBUG] ${this.stepId || 'DS'} Payload:`, JSON.stringify(payload, null, 2));
        }

        const response = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`DeepSeek Error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const text = data.choices[0].message.content;
        const usage = data.usage;
        if (usage) {
          console.log(`[TOKEN_USAGE] ${this.stepId || 'DS'}: Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, Total: ${usage.total_tokens}`);
        }
        return this.createSdkCompatibleResponse(text);
      }
    };
  }
}
