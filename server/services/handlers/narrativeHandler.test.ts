import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NarrativeHandler } from './narrativeHandler.js';
import { PipelineStep } from '../../types.js';

// Mock AI
const mockAi = {
  models: {
    generateContent: vi.fn(),
  }
};

// Mock MathEngine (to satisfy types.ts top-level calls)
vi.mock('../mathEngine.js', () => ({
  MathEngine: {
    validateLethality: vi.fn().mockReturnValue(true),
    getLethalityErrorMessage: vi.fn().mockReturnValue(""),
    validateNovaProof: vi.fn().mockReturnValue(true),
    getNovaProofErrorMessage: vi.fn().mockReturnValue("")
  }
}));

describe('NarrativeHandler Baseline', () => {
  let handler: NarrativeHandler;
  const state: any = {
    mcd: {
      party: { tier: 2, avg_level: 5 },
      primary_material: "Stone"
    },
    mechanics: {
      total_roster_hp: 400,
      damage_per_round_target: 40
    },
    section_4_zones_structured: {
      grid_dimensions: { width: 10, height: 10 }
    },
    section_4_zones: "A rocky cavern with stalactites.",
    section_5_actors: "A stone giant and 4 goblins.",
    section_5_actors_structured: {
      actors: [
        { name: "Stone Giant", type: "Anchor" },
        { name: "Goblin", type: "Skirmisher" }
      ]
    }
  };

  const setup: any = {
    gmOverrides: {},
    gmNotes: "",
    gmConcerns: ""
  };

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new NarrativeHandler(mockAi as any);
  });

  it('should generate a valid narrative payload', async () => {
    const validResponse = {
      chain_of_thought_scratchpad: "Synthesizing the stone cavern atmosphere.",
      interactive_points: [
        { point: "A **Shaky Pillar** of stone.", gm_instruction: "Can be toppled." }
      ],
      gm_cinematic_beats: [
        { round: 1, beat: "The giant roars.", mechanical_trigger: "Initiative" }
      ],
      sensory_details: {
        sight: "Dripping water and dim moss.",
        sound: "Echoing footsteps.",
        smell: "Damp earth.",
        lighting: "Dim light."
      },
      section_1_cover: "# The Stone Heart\nA tactical encounter.",
      section_8_hooks: "The characters find a map."
    };

    mockAi.models.generateContent.mockResolvedValue({ text: JSON.stringify(validResponse) });

    const result = await handler.execute(state, setup);

    expect(result.section_1_3_8_narrative).toBeDefined();
    expect(result.section_1_3_8_narrative.sensory_details.sight).toContain("Dripping water");
    expect(mockAi.models.generateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: "models/gemini-flash-latest"
    }));
  });
});
