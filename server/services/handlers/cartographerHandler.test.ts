import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartographerHandler } from './cartographerHandler.js';
import { PipelineStep } from '../../types.js';

// Mock AI
const mockAi = {
  models: {
    generateContent: vi.fn(),
  }
};

// Mock MathEngine
vi.mock('../mathEngine.js', () => ({
  MathEngine: {
    calculateHazardTargets: vi.fn().mockReturnValue({
      target_dc: 15,
      avg_hazard_damage: 12,
      damage_formula: "2d10"
    }),
    validateLethality: vi.fn().mockReturnValue(true),
    getLethalityErrorMessage: vi.fn().mockReturnValue("Invalid lethality"),
    validateNovaProof: vi.fn().mockReturnValue(true),
    getNovaProofErrorMessage: vi.fn().mockReturnValue("Invalid nova proof")
  }
}));

describe('CartographerHandler Baseline', () => {
  let handler: CartographerHandler;
  const state: any = {
    mcd: {
      party: { tier: 2, avg_level: 5 },
      premise: {
        primary_material: "Stone"
      }
    },
    mechanics: {
      total_roster_hp: 400,
      damage_per_round_target: 40
    },
    section_5_actors_structured: {
      actors: [
        { name: "Giant", size: "Huge", quantity: 1 }, // Footprint 9 + 6 = 15
        { name: "Minion", size: "Medium", quantity: 4 } // (1 + 6) * 4 = 28
      ]
    } // Total footprint ~ 43
  };

  const setup: any = {
    gmOverrides: {},
    gmNotes: "",
    gmConcerns: ""
  };

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new CartographerHandler(mockAi as any);
  });

  it('should generate a valid tactical grid and toys', async () => {
    const validResponse = {
      chain_of_thought_scratchpad: "Designing a standard tactical layout.",
      grid_dimensions: { width: 10, height: 10 }, // 100 squares > 43
      axes: [
        {
          name: "Rusted Valve",
          type: "Hazard",
          appearance: "A leaking valve",
          current_state: "Dormant",
          telegraph: "Hissing steam",
          tactical_clue: "Steam",
          interaction_trigger: "Utilize",
          state_change: "Scalding water",
          once_per_encounter: true,
          mastery_synergies: ["Push"],
          size_constraint: "Large",
          activation_distance: 5,
          automatic_trigger: { type: "Threshold (%)", details: "50%" },
          manual_lever: { action_type: "Utilize", dc: 15, effect: "Close valve" },
          failing_forward_rider: "Burned",
          force_multiplier_value: "3x",
          social_out_trigger: false,
          choice_mandate: "Close or stay",
          virtual_value_weight: 1.0
        }
      ],
      section_4_zones: "The kill zone is the center.",
      section_6_timeline: "Round 1: Steam starts."
    };

    mockAi.models.generateContent.mockResolvedValue({ text: JSON.stringify(validResponse) });

    const result = await handler.execute(state, setup);

    expect(result.section_4_zones_structured).toBeDefined();
    expect(result.section_4_zones_structured.grid_dimensions.width).toBe(10);
    expect(result.hazard_targets).toBeDefined();
  });

  it('should fail validation if grid is too small for the roster', async () => {
    const smallResponse = {
      chain_of_thought_scratchpad: "Oops, too small.",
      grid_dimensions: { width: 4, height: 4 }, // 16 squares < 43
      axes: [
        {
          name: "Rusted Valve",
          type: "Hazard",
          appearance: "A leaking valve",
          current_state: "Dormant",
          telegraph: "Hissing steam",
          tactical_clue: "Steam",
          interaction_trigger: "Utilize",
          state_change: "Scalding water",
          once_per_encounter: true,
          mastery_synergies: ["Push"],
          size_constraint: "Large",
          activation_distance: 5,
          automatic_trigger: { type: "Threshold (%)", details: "50%" },
          manual_lever: { action_type: "Utilize", dc: 15, effect: "Close valve" },
          failing_forward_rider: "Burned",
          force_multiplier_value: "3x",
          social_out_trigger: false,
          choice_mandate: "Close or stay",
          virtual_value_weight: 1.0
        }
      ],
      section_4_zones: "Small room.",
      section_6_timeline: "Round 1."
    };

    mockAi.models.generateContent.mockResolvedValue({ text: JSON.stringify(smallResponse) });

    await expect(handler.execute(state, setup)).rejects.toThrow(/Grid \(4x4\) is too small/);
  });
});
