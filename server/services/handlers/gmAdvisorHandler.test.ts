import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GMAdviceHandler } from './gmAdvisorHandler.js';
import { GMAdviceRequest, ZodGMAdviceReportSchema, ZodGMAdviceLLMSchema } from '../../types.js';

// Mock AI adapter response
const mockAi = {
  models: {
    generateContent: vi.fn(),
  }
};

// Mock the AIProvider.getAI call to return our mockAi
vi.mock('../aiProvider.js', () => ({
  AIProvider: {
    getAI: () => mockAi
  }
}));

describe('GMAdviceHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validRequest: GMAdviceRequest = {
    partySize: 4,
    startLevel: 5,
    pcs: [
      { name: "Thorin", className: "Fighter", subclass: "Battle Master", currentMagicItems: ["Longsword +1"] },
      { name: "Elend", className: "Ranger", subclass: "Ash Scout", currentMagicItems: [] },
      { name: "Lyra", className: "Cleric", subclass: "Lantern Keeper", currentMagicItems: ["Wardstone"] }
    ],
    targetDifficulty: "Hard",
    tone: "Heroic"
  };

  const mockResponse = {
    chain_of_thought_scratchpad: "Synthetic test-only calculation summary.",
    party_vulnerability_profile: {
      collective_weaknesses: ["Mental saving throws outside Cleric aura", "Ranged flight challenges"],
      nova_ceiling_outlook: "Ash Scout details indicate strong first-round positioning."
    },
    tactical_combat_breakdown: {
      role_assignments: [
        {
          role_label: "Primary Damage Dealer",
          pc_names: ["Thorin"],
          pressure_tactics: ["Use physical saving throw spells", "Impose disadvantage via heavy cover"]
        }
      ],
      action_economy_verdict: "Strong action coverage from the submitted support details."
    },
    pacing_sandbox: {
      level: 5,
      dpr_bounds: { min: 45, max: 65 },
      anchor_hp_floor: 151,
      tactical_guidelines: ["Use multiple skirmishers to absorb Ranger round 1 burst", "Ensure boss acts early"],
      environmental_recommendations: ["Choke points that isolate the Cleric's dim-light aura"],
      budget_allocations: [
        {
          archetype_name: "The Mastermind (Solo/Anchor)",
          description: "Solo boss",
          allocation_bar_visual: "[████████░░]",
          segment_breakdown: [
            { role: "Anchor Boss", percentage: 80, translation_stat_block: "1x CR 5 Anchor (120 HP)" }
          ]
        }
      ],
      enemy_tactical_counters: [
        {
          type: "Action Denial Counter",
          mechanic_description: "When targeted by a spell requiring a DEX save, the creature can use its reaction to halve damage and move 5 feet without provoking opportunity attacks.",
          targeted_players: ["Thorin"]
        }
      ]
    },
    player_specific_ledger: [
      {
        pc_name: "Thorin",
        class_subclass: "Fighter (Battle Master)",
        key_feature_interaction: "Allow Maneuvers to land on minion ranks to feel powerful, but use boss reactions to redirect critical strikes.",
        biggest_weakness: "Wisdom saving throws against charm/fear.",
        current_item_impact: "Longsword +1 slightly increases baseline hit rate.",
        magic_item_prescriptions: [
          { item_name: "Protective token", benefit: "Provides a small defensive benefit.", rule_reference: "Original generic material" }
        ],
        items_to_avoid: [
          { item_name: "Flametongue", warning: "Spikes Nova DPR." }
        ]
      },
      {
        pc_name: "Elend",
        class_subclass: "Ranger (Ash Scout)",
        key_feature_interaction: "Include light-producing hazards to negate Umbral Sight dark invisibility.",
        biggest_weakness: "Concentration checks and long-range engagement.",
        current_item_impact: "No items equipped, standard progression.",
        magic_item_prescriptions: [
          { item_name: "Protective token", benefit: "Provides a small defensive benefit.", rule_reference: "Original generic material" }
        ],
        items_to_avoid: [
          { item_name: "Oathbow", warning: "Explodes round 1 Nova ceiling." }
        ]
      },
      {
        pc_name: "Lyra",
        class_subclass: "Cleric (Lantern Keeper)",
        key_feature_interaction: "Place hazards that test the submitted defensive formation.",
        biggest_weakness: "Direct speed reduction and kiting.",
        current_item_impact: "Ring of Protection provides +1 AC/Saves, shoring up concentration.",
        magic_item_prescriptions: [
          { item_name: "Protective token", benefit: "Provides a small defensive benefit.", rule_reference: "Original generic material" }
        ],
        items_to_avoid: [
          { item_name: "Wardstone", warning: "Synthetic fixture with an unusually large defensive bonus." }
        ]
      }
    ],
    threat_windows: {
      encounters_before_short_rest: 2,
      encounters_before_long_rest: 5,
      rest_economy_rationale: "Standard party configuration supports baseline resting cycle."
    },
    mechanical_threshold: {
      level: 5,
      party_sustained_dpr: 48,
      dominant_cr_tier: "CR 5–10",
      monster_avg_save_bonus: 4,
      required_dc_for_50pct: 15,
      threshold_crossover: false
    },
    nova_recoil_engine: {
      level: 5,
      post_nova_sustained_dpr: 48,
      nova_threshold: 60,
      secondary_wave_trigger: "Secondary wave triggers if party deals >60 damage in Round 1 (40% of boss HP floor).",
      resource_depletion_note: "Estimated Round 1 resource cost: 1 primary burst slot + potential Bonus Action ability."
    },
    rest_economy_throttle: {
      level: 5,
      slot_drain_per_encounter_pct: 20,
      encounters_to_short_rest: 3,
      encounters_to_long_rest: 5
    },
    attrition_wave_scales: {
      waves_to_force_long_rest: 5,
      wave_hp_budget: 38,
      ability_drain_threshold_note: "After 2 attrition waves, high-tier nova abilities are depleted by ~40%."
    }
  };

  // The LLM now returns the NARROW shape (Echo Pattern): pacing_sandbox.{level,
  // dpr_bounds, anchor_hp_floor} and the five telemetry sections are hydrated
  // deterministically downstream, so the model must NOT emit them.
  const {
    level: _omitLevel,
    dpr_bounds: _omitDprBounds,
    anchor_hp_floor: _omitAnchorHp,
    ...pacingSandboxLLM
  } = mockResponse.pacing_sandbox;
  const {
    threat_windows: _omitThreatWindows,
    mechanical_threshold: _omitMechanicalThreshold,
    nova_recoil_engine: _omitNovaRecoilEngine,
    rest_economy_throttle: _omitRestEconomyThrottle,
    attrition_wave_scales: _omitAttritionWaveScales,
    ...mockResponseWithoutTelemetry
  } = mockResponse;
  const mockLLMResponse = {
    ...mockResponseWithoutTelemetry,
    pacing_sandbox: pacingSandboxLLM
  };

  // Deterministic MathEngine output for the public generic class registry.
  // Mirrors the values asserted in the "core MathEngine calculations" prompt test.
  const EXPECTED = { level: 5, minDpr: 64, maxDpr: 96, anchorHpFloor: 138 };
  const EXPECTED_TELEMETRY = {
    threatWindows: {
      encounters_before_short_rest: 2,
      encounters_before_long_rest: 5,
      rest_economy_rationale: "Standard party configuration supports the baseline resting cycle of 2 encounters per short rest and 5 per long rest."
    },
    mechanicalThreshold: {
      level: 5,
      party_sustained_dpr: 64,
      monster_avg_save_bonus: 4,
      required_dc_for_50pct: 15,
      threshold_crossover: false
    },
    novaRecoilEngine: {
      level: 5,
      post_nova_sustained_dpr: 64,
      nova_threshold: 83,
      secondary_wave_trigger: "Secondary wave triggers if party deals >83 damage in Round 1 (60% of 138 HP floor at Level 5).",
      resource_depletion_note: "Estimated Round 1 cost at Level 5: 1 burst slot (e.g., Fireball or highest-available nova ability) + potential Bonus Action."
    },
    restEconomyThrottle: {
      level: 5,
      slot_drain_per_encounter_pct: 20,
      encounters_to_short_rest: 2,
      encounters_to_long_rest: 5
    },
    attritionWaveScales: {
      waves_to_force_long_rest: 5,
      wave_hp_budget: 35,
      ability_drain_threshold_note: "After 2 attrition waves, high-tier nova abilities (e.g., Action Surge, top-tier spell slots) are depleted by ~40%, permanently suppressing Round 1 burst potential."
    }
  };

  it('should validate mockResponse fixture directly against ZodGMAdviceReportSchema', () => {
    const parseResult = ZodGMAdviceReportSchema.safeParse(mockResponse);
    expect(parseResult.success).toBe(true);
  });

  it('should fail Zod validation on an invalid mockResponse missing tactical_combat_breakdown', () => {
    const invalidResponse = { ...mockResponse } as any;
    delete invalidResponse.tactical_combat_breakdown;
    const parseResult = ZodGMAdviceReportSchema.safeParse(invalidResponse);
    expect(parseResult.success).toBe(false);
  });

  it('should validate the narrow LLM fixture against ZodGMAdviceLLMSchema', () => {
    const parseResult = ZodGMAdviceLLMSchema.safeParse(mockLLMResponse);
    expect(parseResult.success).toBe(true);
  });

  it('should reject LLM responses that still emit hydrated deterministic fields', () => {
    // The strict narrow schema rejects telemetry echoes; the handler hydrates
    // them after parsing instead.
    const parseResult = ZodGMAdviceLLMSchema.safeParse(mockResponse);
    expect(parseResult.success).toBe(false);
  });

  it('should generate advice report and hydrate deterministic core math', async () => {
    mockAi.models.generateContent.mockResolvedValue({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify(mockLLMResponse)
          }]
        }
      }]
    });

    const result = await GMAdviceHandler.generate(validRequest);
    expect(result).toBeDefined();
    expect(result.party_vulnerability_profile.nova_ceiling_outlook).toContain("Ash Scout");
    // Core math is injected from MathEngine, NOT taken from the LLM output.
    expect(result.pacing_sandbox.level).toBe(EXPECTED.level);
    expect(result.pacing_sandbox.dpr_bounds.min).toBe(EXPECTED.minDpr);
    expect(result.pacing_sandbox.dpr_bounds.max).toBe(EXPECTED.maxDpr);
    expect(result.pacing_sandbox.anchor_hp_floor).toBe(EXPECTED.anchorHpFloor);
    expect(result.threat_windows).toEqual(EXPECTED_TELEMETRY.threatWindows);
    expect(result.mechanical_threshold).toMatchObject(EXPECTED_TELEMETRY.mechanicalThreshold);
    expect(result.mechanical_threshold.dominant_cr_tier).toContain("CR 5");
    expect(result.nova_recoil_engine).toEqual(EXPECTED_TELEMETRY.novaRecoilEngine);
    expect(result.rest_economy_throttle).toEqual(EXPECTED_TELEMETRY.restEconomyThrottle);
    expect(result.attrition_wave_scales).toEqual(EXPECTED_TELEMETRY.attritionWaveScales);
  });

  it('should retry generation if JSON is invalid or fails validation', async () => {
    // First attempt fails narrow-schema validation (missing tactical_combat_breakdown);
    // second attempt is a valid narrow response.
    const invalidResponse = { ...mockLLMResponse } as any;
    delete invalidResponse.tactical_combat_breakdown;
    mockAi.models.generateContent
      .mockResolvedValueOnce({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify(invalidResponse)
            }]
          }
        }]
      })
      .mockResolvedValueOnce({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify(mockLLMResponse)
            }]
          }
        }]
      });

    const result = await GMAdviceHandler.generate(validRequest);
    expect(mockAi.models.generateContent).toHaveBeenCalledTimes(2);
    expect(result.pacing_sandbox.level).toBe(EXPECTED.level);
  });

  it('should preserve user-supplied labels without inventing non-SRD subclass mechanics', async () => {
    const auditRequest: GMAdviceRequest = {
      partySize: 3,
      startLevel: 5,
      pcs: [
        { name: "Lyra", className: "Cleric", subclass: "Lantern Keeper", currentMagicItems: ["Wardstone"] },
        { name: "Elend", className: "Ranger", subclass: "Ash Scout", currentMagicItems: ["Ember Blade"] }
      ],
      targetDifficulty: "Hard",
      tone: "Heroic"
    };

    mockAi.models.generateContent.mockResolvedValue({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify(mockLLMResponse)
          }]
        }
      }]
    });

    await GMAdviceHandler.generate(auditRequest);

    const callArgs = mockAi.models.generateContent.mock.calls[0][0];
    const generatedPrompt = callArgs.contents[0].parts[0].text;

    expect(generatedPrompt).toContain('Subclass: "Lantern Keeper"');
    expect(generatedPrompt).toContain('Subclass: "Ash Scout"');
    expect(generatedPrompt).toContain("Wardstone");
    expect(generatedPrompt).toContain("Ember Blade");
    expect(generatedPrompt).not.toContain("PROGRAMMATIC MAGIC ITEM AUDIT WARNINGS");
  });

  it('should use core MathEngine calculations for the pre-calculated truths in the prompt', async () => {
    mockAi.models.generateContent.mockResolvedValue({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify(mockLLMResponse)
          }]
        }
      }]
    });

    await GMAdviceHandler.generate(validRequest);

    const callArgs = mockAi.models.generateContent.mock.calls[0][0];
    const generatedPrompt = callArgs.contents[0].parts[0].text;

    expect(generatedPrompt).toContain("Party Sustained DPR (min) = 64");
    expect(generatedPrompt).toContain("Party Nova DPR (max) = 96");
    expect(generatedPrompt).toContain("Anchor HP Floor (Z) = 138");
  });

  it('should resolve class profiles case-insensitively', async () => {
    const caseRequest: GMAdviceRequest = {
      partySize: 3,
      startLevel: 5,
      pcs: [
        { name: "Thorin", className: "fighter", subclass: "Battle Master", currentMagicItems: [] }
      ],
      targetDifficulty: "Hard",
      tone: "Heroic"
    };

    mockAi.models.generateContent.mockResolvedValue({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify(mockLLMResponse)
          }]
        }
      }]
    });

    await GMAdviceHandler.generate(caseRequest);

    const callArgs = mockAi.models.generateContent.mock.calls[0][0];
    const generatedPrompt = callArgs.contents[0].parts[0].text;

    // Verify subclass key features are retrieved, proving case-insensitive lookup resolved successfully
    expect(generatedPrompt).toContain("Class: Fighter");
    expect(generatedPrompt).toContain("Subclass: Battle Master");
  });
});
