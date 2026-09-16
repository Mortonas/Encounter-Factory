import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublisherHandler } from './publisherHandler.js';
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

// Mock TacticalBriefingService
vi.mock('../tacticalBriefingService.js', () => ({
  TacticalBriefingService: {
    generate: vi.fn().mockReturnValue({
      kill_clock_outlook: "Outlook is good.",
      survival_range: { min_rounds: 3, max_rounds: 5, justification: "Math." },
      mastery_levers: [
        { toy_name: "Pillar", trigger: "Push", synergy: "Topple" }
      ],
      lethality_warnings: [],
      gm_advice: ""
    })
  }
}));

describe('PublisherHandler Baseline', () => {
  let handler: PublisherHandler;
  const state: any = {
    mcd: {
      party: { tier: 2, avg_level: 5, pcs: [] },
      primary_material: "Stone"
    },
    mechanics: {
      mechanics: {
        total_roster_hp: 400,
        damage_per_round_target: 40,
        anchor_ehp: 200,
        minion_ehp_pool: 200,
        lethality_ratio: 0.4,
        resilience_factor: 0.4,
        resilience_requirement: true
      }
    } as any,
    math_engine_targets: {
      sustained_dpr: 40
    },
    section_1_3_8_narrative: {
      section_1_cover: "# Title",
      section_8_hooks: "Hooks"
    },
    section_4_zones_structured: {
      grid_dimensions: { width: 10, height: 10 },
      axes: []
    },
    section_5_actors_structured: {
      actors: [
        { type: "Anchor", hp: 200, ac: 16, dpr: 20, phases: [] }
      ]
    },
    section_6_timeline: "Round 1: Start."
  };

  const setup: any = {
    gmOverrides: {},
    gmNotes: "",
    gmConcerns: ""
  };

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new PublisherHandler(mockAi as any);
  });

  it('should generate a valid raw payload with markers', async () => {
    const rawResponse = `
[SCRATCHPAD]
Analysis complete.
[/SCRATCHPAD]

[SEMANTIC_HTML]
<section>
  <h1>The Encounter</h1>
  <p>Atmospheric text.</p>
</section>
[/SEMANTIC_HTML]

[TACTICAL_BRIEFING_MARKDOWN]
# TACTICAL BRIEFING: GM EYES ONLY
**Kill Clock:** 3–5 Rounds.
Outlook is good.

## Strategic Advice
Keep the distance.
[/TACTICAL_BRIEFING_MARKDOWN]

[VTT_MARKDOWN]
### VTT Export
- Trigger 1
[/VTT_MARKDOWN]
`;

    mockAi.models.generateContent.mockResolvedValue({ text: rawResponse });

    const result = await handler.execute(state, setup);

    expect(result.publisher_output).toBeDefined();
    expect(result.publisher_output).toContain("<!-- TACTICAL BRIEFING START -->");
    expect(result.publisher_output).toContain("Outlook is good.");
    expect(result.publisher_output).toContain("<section>");
    expect(result.publisher_output).toContain("<!-- MECHANICAL APPENDIX START -->");
    expect(result.publisher_output).toContain("**Anchor EHP:**");    
    expect(mockAi.models.generateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: "models/gemini-flash-latest"
    }));
  });

  it('should fail if required markers are missing', async () => {
    const invalidResponse = "Just some text without markers.";
    mockAi.models.generateContent.mockResolvedValue({ text: invalidResponse });

    await expect(handler.execute(state, setup)).rejects.toThrow(/Missing \[SEMANTIC_HTML\] content/);
  });
});
