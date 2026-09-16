import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BalanceHandler } from './balanceHandler.js';
import { PipelineStep } from '../../types.js';
import * as MathUtils from '../math/utils.js';

// Mock AI
const mockAi = {
  models: {
    generateContent: vi.fn(),
  }
};

// Mock MathEngine and MathUtils
vi.mock('../mathEngine.js', () => ({
  MathEngine: {
    generateTargets: vi.fn(),
    validateLethality: vi.fn().mockReturnValue(true),
    validateNovaProof: vi.fn().mockReturnValue(true),
    getLethalityErrorMessage: vi.fn().mockReturnValue("Lethality Error"),
    getNovaProofErrorMessage: vi.fn().mockReturnValue("Nova Proof Error")
  }
}));

vi.mock('../math/utils.js', async () => {
  const actual = await vi.importActual('../math/utils.js');
  return {
    ...actual,
    calculateAggregateEHP: vi.fn()
  };
});

import { MathEngine } from '../mathEngine.js';

describe('BalanceHandler Validation Hardening', () => {
  let handler: BalanceHandler;
  const state: any = {
    mcd: {
      party: { tier: 2, avg_hp_per_pc: 50, size: 4, avg_level: 5, avg_dpr: 20 },
      premise: { combat_style: "Standard Brawl", target_rounds: 4 },
      parameters: { target_difficulty: 'Hard' }
    },
    ppp: {
      power_profile: { nova_potential: 'Medium' }
    },
    math_engine_targets: {
      nova_dpr: 100,
      target_anchor_hp_min: 100,
      target_roster_hp: 400
    }
  };

  const setup: any = {};

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new BalanceHandler(mockAi as any);
  });

  const createValidMechanics = (overrides = {}) => ({
    tier: 2,
    xp_budget_raw: 2000,
    encounter_multiplier: 1.5,
    xp_budget_adjusted: 3000,
    action_ratio_target: "1.5:1",
    max_ac: 18,
    max_attack_bonus: 7,
    max_save_dc: 15,
    anchor_hp_range: { min: 100, max: 120 },
    minion_hp_range: { min: 20, max: 30 },
    total_roster_hp: 200,
    damage_per_round_target: 40,
    legendary_actions_required: 3,
    surrender_threshold: 0.2,
    mastery_zone_type: "Hazardous",
    mastery_interactions: ["Topple"],
    resource_drain_target: 0.3,
    mythic_encounter: false,
    estimated_lifespan_rounds: 3,
    nova_risk_flag: false,
    nova_dpr_estimated: 100,
    max_single_action_damage: 25,
    is_boss_archetype: true,
    is_fragile: false,
    pacing_estimate_minutes: 45,
    slog_risk_warning: false,
    action_budget: {
      target_effective_actions: 8,
      legendary_actions: 3,
      reaction_pressure: "high" as const,
      reaction_budget: 4,
      reactive_multi_act: false
    },
    exhaustion_risk: false,
    reliability_counters_required: false,
    phase_triggers: [
      { 
        phase_name: "Bloodied", 
        hp_threshold: 50, 
        trigger: "Bloodied" as const,
        effect: "Condition_Clear" as const,
        budget_shift: 1.0,
        new_mechanic: "Test mechanic",
        sensory_ledger: { visual: "V", auditory: "A", mechanical: "M" },
        narrative_beat: "N"
      }
    ],
    ...overrides
  });

  it('should trigger escalated retry on onValidate failure', async () => {
    // 1. First response: Valid JSON but fails onValidate (Descending HP Thresholds)
    const badResponse = {
      chain_of_thought_scratchpad: "Failing descending check",
      mechanics: createValidMechanics({
        phase_triggers: [
          { 
            phase_name: "Phase 1", 
            hp_threshold: 40, 
            trigger: "Bloodied" as const,
            effect: "Condition_Clear" as const,
            budget_shift: 1.0,
            new_mechanic: "M1",
            sensory_ledger: { visual: "V1", auditory: "A1", mechanical: "M1" },
            narrative_beat: "N1"
          },
          { 
            phase_name: "Phase 2", 
            hp_threshold: 60, // WRONG: 60 > 40
            trigger: "Bloodied" as const,
            effect: "Condition_Clear" as const,
            budget_shift: 1.0,
            new_mechanic: "M2",
            sensory_ledger: { visual: "V2", auditory: "A2", mechanical: "M2" },
            narrative_beat: "N2"
          }
        ]
      }),
      section_7: "Benchmark Report"
    };

    // 2. Second response: Corrected
    const goodResponse = {
      chain_of_thought_scratchpad: "Corrected thresholds",
      mechanics: {
        ...badResponse.mechanics,
        phase_triggers: [
          { ...badResponse.mechanics.phase_triggers[1], hp_threshold: 75 },
          { ...badResponse.mechanics.phase_triggers[0], hp_threshold: 50 }
        ]
      },
      section_7: "Benchmark Report"
    };

    mockAi.models.generateContent
      .mockResolvedValueOnce({ text: JSON.stringify(badResponse) })
      .mockResolvedValueOnce({ text: JSON.stringify(goodResponse) });

    // Mock targets to match the response
    (MathEngine.generateTargets as any).mockReturnValue({
      nova_dpr: 100,
      target_anchor_hp_min: 100,
      target_anchor_hp_max: 200
    });

    (MathUtils.calculateAggregateEHP as any).mockReturnValue({
      totalEhp: 150, // Should pass: 150 >= 100
      auditLog: ['Pass']
    });

    const result = await handler.execute(state, setup);

    // Verify escalation logic
    expect(mockAi.models.generateContent).toHaveBeenCalledTimes(2);
    
    // First call should have temp 0.2 (from handler)
    expect(mockAi.models.generateContent.mock.calls[0][0].config.temperature).toBeCloseTo(0.2, 5);
    // Second call should have temp 0.3 (escalated)
    expect(mockAi.models.generateContent.mock.calls[1][0].config.temperature).toBeCloseTo(0.3, 5);

    expect(result.mechanics.mechanics.phase_triggers[0].hp_threshold).toBe(75);
    expect(result.mechanics.mechanics.phase_triggers[1].hp_threshold).toBe(50);
  });

  it('should bubble fatal error after max attempts', async () => {
    const badResponse = {
      chain_of_thought_scratchpad: "Always failing",
      mechanics: createValidMechanics({
        phase_triggers: [
          { 
            phase_name: "Phase 1", 
            hp_threshold: 40, 
            trigger: "Bloodied" as const,
            effect: "Condition_Clear" as const,
            budget_shift: 1.0,
            new_mechanic: "M1",
            sensory_ledger: { visual: "V1", auditory: "A1", mechanical: "M1" },
            narrative_beat: "N1"
          },
          { 
            phase_name: "Phase 2", 
            hp_threshold: 60, // WRONG: 60 > 40
            trigger: "Bloodied" as const,
            effect: "Condition_Clear" as const,
            budget_shift: 1.0,
            new_mechanic: "M2",
            sensory_ledger: { visual: "V2", auditory: "A2", mechanical: "M2" },
            narrative_beat: "N2"
          }
        ]
      }),
      section_7: "Benchmark Report"
    };

    mockAi.models.generateContent.mockResolvedValue({ text: JSON.stringify(badResponse) });

    await expect(handler.execute(state, setup)).rejects.toThrow(/HP threshold values must be strictly descending/);
    expect(mockAi.models.generateContent).toHaveBeenCalledTimes(3); 
  });
});
