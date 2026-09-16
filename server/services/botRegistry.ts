import { PipelineStep } from "../types.js";
import { BaseBotHandler } from "./baseBotHandler.js";

/**
 * BOT REGISTRY
 * Maps PipelineStep enum values to their respective BaseBotHandler implementations.
 * This allows the Orchestrator to execute bots dynamically without hardcoded logic.
 */
export class BotRegistry {
  private static handlers = new Map<PipelineStep, BaseBotHandler>();

  /**
   * Registers a handler for a specific pipeline step.
   */
  static register(step: PipelineStep, handler: BaseBotHandler): void {
    this.handlers.set(step, handler);
    console.log(`[REGISTRY] Registered handler for ${step}`);
  }

  /**
   * Retrieves the handler for a specific pipeline step.
   */
  static getHandler(step: PipelineStep): BaseBotHandler | undefined {
    return this.handlers.get(step);
  }

  /**
   * Clears all registered handlers (mainly for testing).
   */
  static clear(): void {
    this.handlers.clear();
  }
}
