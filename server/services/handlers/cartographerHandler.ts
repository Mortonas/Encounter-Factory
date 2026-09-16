import { BaseBotHandler } from "../baseBotHandler.js";
import { 
  FullPipelineState, 
  PipelineStep, 
  CartographerSchema, 
  ZodCartographerSchema,
  CartographerOutput
} from "../../types.js";
import { GMSetup } from "../../types.js";
import { buildPrompt } from "../../constants/prompts.js";
import { MathEngine } from "../mathEngine.js";
import { TOYBOX_REGISTRY } from "../../constants/toybox.js";

/**
 * BOT 2: TACTICAL CARTOGRAPHER
 * Translates the mechanical roster into a spatial Tactical Grid.
 */
export class CartographerHandler extends BaseBotHandler {
  readonly stepId = PipelineStep.BOT_2_CARTOGRAPHER;

  constructor(private ai: any) {
    super();
  }

  async execute(
    state: FullPipelineState, 
    setup: GMSetup, 
    auditorFeedback?: string
  ): Promise<FullPipelineState> {
    console.log(`[CARTOGRAPHER_HANDLER] Executing Bot 2 (Cartographer) logic...`);

    const hazardTargets = MathEngine.calculateHazardTargets(
      state.mcd!.party.avg_level, 
      state.mcd!.party.tier
    );

    const prompt = buildPrompt(
      this.stepId, 
      { 
        id: this.stepId, 
        mcd: state.mcd!, 
        mechanics: state.mechanics!, 
        hazard_targets: hazardTargets,
        section_5_actors_structured: state.section_5_actors_structured,
        toybox_registry: TOYBOX_REGISTRY,
        primary_material: state.mcd!.premise.primary_material
      }, 
      setup.gmOverrides, 
      setup.gmNotes, 
      setup.gmConcerns, 
      auditorFeedback
    );
    
    // Use the inherited helper for standardized generation, retries, and validation
    const validated = await this.generateWithRetry<CartographerOutput>(
      this.ai,
      prompt,
      CartographerSchema,
      ZodCartographerSchema,
      {
        state,
        auditorFeedback
      }
    );
    
    // Preparation for final state return
    return {
      ...state,
      hazard_targets: hazardTargets,
      section_4_zones_structured: validated,
      section_4_zones: validated.section_4_zones,
      section_6_timeline: validated.section_6_timeline
    };
  }

  /**
   * BASIC STRUCTURAL VALIDATION
   */
  protected onValidate(parsed: CartographerOutput, state: FullPipelineState, rawText?: string): void {
    // 1. Base Validation (Commitment Bias / Scratchpad Order)
    super.onValidate(parsed, state, rawText);

    if (!parsed.grid_dimensions || parsed.grid_dimensions.width <= 0) {
      throw new Error("[CARTOGRAPHER FAILURE] Invalid grid_dimensions. Spatial context is required for GM guidance.");
    }

    if (!parsed.axes || parsed.axes.length === 0) {
      throw new Error("[CARTOGRAPHER FAILURE] No tactical axes (Toys) generated. Environmental interaction is a core pillar.");
    }

    this.validateSpatialDensity(parsed, state);
  }

  private validateSpatialDensity(parsed: CartographerOutput, state: FullPipelineState) {
    const actors = state.section_5_actors_structured?.actors || [];
    
    const sizeMap: Record<string, number> = {
      "Tiny": 1, "Small": 1, "Medium": 1,
      "Large": 4, "Huge": 9, "Gargantuan": 16
    };

    const totalFootprint = actors.reduce((sum, a) => {
      const footprint = sizeMap[a.size || "Medium"] || 1;
      const quantity = (a as any).quantity || 1;
      return sum + (quantity * (footprint + 6)); 
    }, 0);
    
    const gridWidth = parsed.grid_dimensions.width;
    const gridHeight = parsed.grid_dimensions.height;
    const totalSquares = gridWidth * gridHeight;

    if (totalSquares < totalFootprint && actors.length > 0) {
      const suggestedSide = Math.ceil(Math.sqrt(totalFootprint));
      throw new Error(`[SPATIAL FAILURE] Grid (${gridWidth}x${gridHeight}) is too small for this roster. Required footprint is ~${totalFootprint} squares. Increase dimensions to at least ${suggestedSide}x${suggestedSide}.`);
    }
  }
}
