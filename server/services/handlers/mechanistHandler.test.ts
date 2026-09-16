import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeadMechanistHandler } from './mechanistHandler.js';
import { PipelineStep, ZodMechanistSchema } from '../../types.js';

describe('LeadMechanistHandler', () => {
  let handler: LeadMechanistHandler;
  let mockAi: any;

  const mockMcd = {
    party: { size: 4, avg_level: 5 },
    premise: { failure_consequence: 'narrative_setback' }
  };
  const mockMechanics = {
    mechanics: {
      total_roster_hp: 400,
      damage_per_round_target: 40,
      anchor_hp_range: { min: 200, max: 300 }
    }
  };
  const mockMathTargets = {
    sustained_dpr: 100,
    target_anchor_hp_min: 200
  };

  beforeEach(() => {
    mockAi = {
      models: {
        generateContent: vi.fn()
      }
    };
    handler = new LeadMechanistHandler(mockAi);
  });

  it('should generate a valid tactical roster matching targets', async () => {
    const mockResponse = {
      chain_of_thought_scratchpad: "Concise logic",
      actors: [
        {
          name: "Boss",
          type: "Anchor",
          hp: 250,
          ac: 16,
          dpr: 20,
          size: "Large",
          speed: 30,
          initiative_bonus: 2,
          behavior_script: "Standard",
          design_justification: "Boss",
          traits: [],
          actions: []
        },
        {
          name: "Minion",
          type: "Brute",
          hp: 150,
          ac: 14,
          dpr: 20,
          size: "Medium",
          speed: 30,
          initiative_bonus: 0,
          behavior_script: "Charge",
          design_justification: "Meat shield",
          traits: [],
          actions: []
        }
      ],
      section_5_actors: "Markdown roster",
      mission_stat_block: "Markdown stats",
      initiative_tracker: "Markdown tracker"
    };

    mockAi.models.generateContent.mockResolvedValue({
      text: JSON.stringify(mockResponse)
    });

    const state = {
      mcd: mockMcd as any,
      ppp: {} as any,
      mechanics: mockMechanics as any,
      math_engine_targets: mockMathTargets as any,
      section_4_zones_structured: {} as any
    };

    const setup = {
      gmOverrides: "",
      gmNotes: "",
      gmConcerns: ""
    };

    const result = await handler.execute(state, setup as any);

    expect(result.section_5_actors_structured).toBeDefined();
    expect(result.section_5_actors_structured?.actors).toHaveLength(2);
    expect(result.section_5_actors).toBe("Markdown roster");
  });

  it('should fail validation if total HP is significantly off target', async () => {
    const mockResponse = {
      chain_of_thought_scratchpad: "Concise logic",
      actors: [
        {
          name: "Weak Boss",
          type: "Anchor",
          hp: 50, // Way too low (Target 400)
          ac: 16,
          dpr: 20,
          size: "Large",
          speed: 30,
          initiative_bonus: 2,
          behavior_script: "Standard",
          design_justification: "Boss",
          traits: [],
          actions: []
        }
      ],
      section_5_actors: "Markdown roster",
      mission_stat_block: "Markdown stats",
      initiative_tracker: "Markdown tracker"
    };

    mockAi.models.generateContent.mockResolvedValue({
      text: JSON.stringify(mockResponse)
    });

    const state = {
      mcd: mockMcd as any,
      ppp: {} as any,
      mechanics: mockMechanics as any,
      math_engine_targets: mockMathTargets as any,
      section_4_zones_structured: {} as any
    };

    const setup = { gmOverrides: "", gmNotes: "", gmConcerns: "" };

    // This should throw or fail because 50 is far from 400
    // Currently, the handler has a bug (validator vs customValidation)
    // but we expect the NEW logic to catch this.
    await expect(handler.execute(state, setup as any)).rejects.toThrow(/ROSTER HP MISMATCH/i);
  });
});
