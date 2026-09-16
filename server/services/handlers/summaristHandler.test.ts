import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SummaristHandler } from './summaristHandler.js';
import { PipelineStep } from '../../types.js';

// Mock AI
const mockAi = {
  models: {
    generateContent: vi.fn(),
  }
};

describe('SummaristHandler Baseline', () => {
  let handler: SummaristHandler;
  const state: any = {
    section_5_actors_structured: { actors: [] },
    section_4_zones_structured: { grid_dimensions: { width: 10, height: 10 }, axes: [] },
    section_1_3_8_narrative: { section_1_cover: "# Title" }
  };

  const setup: any = {
    gmOverrides: {},
    gmNotes: "",
    gmConcerns: ""
  };

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new SummaristHandler(mockAi as any);
  });

  it('should generate a valid tactical summary JSON', async () => {
    const jsonResponse = JSON.stringify({
      chain_of_thought_scratchpad: "Analysis of the run-sheet.",
      tactical_summary_markdown: "## Tactical Run-Sheet\n\n### Round 1: The Opening Gambit\nIn the first round, the party must face the initial pressure. The action budget is distributed across the minions.\n\n### Phase 2: The Bloodied Shift\nWhen the anchor reaches 50% HP, a major shift occurs, increasing the lethality spike. The party needs to manage their resources.\n\n### Lethality Spike\nRound 3 is the most dangerous as the boss uses their multi-act abilities. GM should maintain 2:1 action pressure. This summary is now long enough to pass the 300 character limit enforced by the onValidate hook."
    });

    mockAi.models.generateContent.mockResolvedValue({ text: jsonResponse });

    const result = await handler.execute(state, setup);

    expect(result.section_10_tactical_summary).toBeDefined();
    expect(result.section_10_tactical_summary.tactical_summary_markdown).toContain("Round 1");
    
    expect(mockAi.models.generateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: "models/gemini-flash-latest"
    }));
  });

  it('should fail if Zod validation fails (missing fields)', async () => {
    const invalidResponse = JSON.stringify({
      wrong_key: "Oops"
    });
    mockAi.models.generateContent.mockResolvedValue({ text: invalidResponse });

    await expect(handler.execute(state, setup)).rejects.toThrow(/\[SCHEMA_VIOLATION\]/);
  });
});
