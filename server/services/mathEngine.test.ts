import { describe, it, expect } from 'vitest';
import { MathEngine } from './mathEngine.js';
import { MasterContextDocument } from '../types.js';

describe('MathEngine', () => {
  const baseMcd: any = {
    premise: {
      setting: "Dungeon",
      tone: "Dark",
      one_fight_day: true,
      encounter_structure: "Skirmish",
      combat_style: "Standard Brawl",
      target_rounds: 3,
      is_boss_fight: false,
      pipeline_mode: "Precision",
      encounter_count: 1,
      licensing_mode: "None",
      export_priority: "Standard"
    },
    party: {
      size: 4,
      avg_level: 5,
      tier: 2,
      classes: ["Fighter", "Wizard", "Cleric", "Rogue"],
      avg_ac: 15,
      avg_hp_per_pc: 45,
      avg_hp_pool: 400, // Increased to allow higher DPR targets without capping
      avg_dpr: 25,
      high_threat_pcs: [],
      weapon_masteries: [],
      strengths: [],
      vulnerabilities: [],
      resource_state: "Fresh",
      rest_frequency: "Long Rest",
      pcs: [],
      roleplay_hooks: [],
      is_dpr_estimated: false,
      is_ac_estimated: false,
      is_hp_estimated: false,
      requested_enemies: []
    },
    allies: [],
    parameters: {
      target_difficulty: "Hard",
      pc_objective: "Kill All",
      social_out_required: false,
      mythic_encounter: false,
      entry_condition: "fresh",
      target_outcome: "heavy_tax",
      let_dice_fall: true
    }
  };

  describe('Boundary Conditions', () => {
    it('should handle zero allies correctly', () => {
      const targets = MathEngine.generateTargets(baseMcd as MasterContextDocument, {
        nova_potential: "Medium",
        one_fight_day_flags: { active: false, phase_count_required: 1, mandatory_initiative_expertise: false, concentration_break_required: false, xp_budget_modifier: 1.0 }
      } as any);
      
      expect(targets.message).toContain("EPS: 4.0");
      expect(targets.sustained_dpr).toBe(113); // 25 * 4 * 1.125 (Fresh Attrition)
    });

    it('should handle winded entry condition', () => {
      const mcd = JSON.parse(JSON.stringify(baseMcd));
      mcd.parameters.entry_condition = "winded";
      const targets = MathEngine.generateTargets(mcd as MasterContextDocument, { nova_potential: "High" } as any);
      // High -> Medium (2.0 multiplier)
      expect(targets.nova_dpr).toBe(200); // 25 * 4 * 2.0
    });

    it('should handle depleted entry condition', () => {
      const mcd = JSON.parse(JSON.stringify(baseMcd));
      mcd.parameters.entry_condition = "depleted";
      const targets = MathEngine.generateTargets(mcd as MasterContextDocument, { nova_potential: "High" } as any);
      // ALWAYS Low (1.5 multiplier)
      expect(targets.nova_dpr).toBe(150); // 25 * 4 * 1.5
    });

    it('should handle winded medium entry condition', () => {
      const mcd = JSON.parse(JSON.stringify(baseMcd));
      mcd.parameters.entry_condition = "winded";
      const targets = MathEngine.generateTargets(mcd as MasterContextDocument, { nova_potential: "Medium" } as any);
      // Medium -> Low (1.5 multiplier)
      expect(targets.nova_dpr).toBe(150); // 25 * 4 * 1.5
    });

    it('should handle missing avg_dpr with estimation fallback', () => {
      const mcd = JSON.parse(JSON.stringify(baseMcd));
      mcd.party.avg_dpr = 0; // Trigger fallback
      
      const targets = MathEngine.generateTargets(mcd as MasterContextDocument, undefined);
      // Level 5 + 7 = 12. 12 * 4 = 48.
      expect(targets.sustained_dpr).toBeGreaterThan(40);
    });
  });

  describe('Nova-Proofing & Fragile Bypass', () => {
    it('should enforce Nova-Proofing for bosses by default', () => {
      const mcd = JSON.parse(JSON.stringify(baseMcd));
      mcd.premise.encounter_structure = "Boss";
      
      const targets = MathEngine.generateTargets(mcd as MasterContextDocument, {
        nova_potential: "High",
        one_fight_day_flags: { active: true }
      } as any);
      
      // Nova DPR: 25 * 4 * 3 = 300
      expect(targets.nova_dpr).toBe(300);
      expect(targets.target_anchor_hp_min).toBeGreaterThanOrEqual(300);
    });

    it('should bypass Nova-Proofing if Anchor is marked fragile', () => {
      const mcd = JSON.parse(JSON.stringify(baseMcd));
      mcd.premise.encounter_structure = "Boss";
      mcd.party.requested_enemies = [{
        name: "Lich Summoner",
        type: "Boss",
        quantity: 1,
        is_fragile: true,
        is_stat_locked: false
      }];
      
      const targets = MathEngine.generateTargets(mcd as MasterContextDocument, {
        nova_potential: "High",
        one_fight_day_flags: { active: true }
      } as any);
      
      // Nova DPR is 300, but anchor_hp_min should be allowed to be lower if math dictates
      // 3 rounds * sustained dpr (100) * 0.65 accuracy * 0.5 ratio = 97.5 (approx)
      // Deterministic scale might increase it, but it shouldn't be hard-locked to 300.
      expect(targets.target_anchor_hp_min).toBeLessThan(300);
      expect(targets.message).toContain("FRAGILE ARCHETYPE");
    });

    it('should handle various nova potentials in math', () => {
      const low = MathEngine.generateTargets(baseMcd as MasterContextDocument, { nova_potential: "Low" } as any);
      const med = MathEngine.generateTargets(baseMcd as MasterContextDocument, { nova_potential: "Medium" } as any);
      const high = MathEngine.generateTargets(baseMcd as MasterContextDocument, { nova_potential: "High" } as any);
      
      expect(low.nova_dpr).toBe(150);
      expect(med.nova_dpr).toBe(200);
      expect(high.nova_dpr).toBe(300);
    });
  });

  describe('Extreme Scenarios', () => {
    it('should scale for extreme nova multipliers', () => {
      const targetsHigh = MathEngine.generateTargets(baseMcd as MasterContextDocument, { nova_potential: "High" } as any);
      const targetsLow = MathEngine.generateTargets(baseMcd as MasterContextDocument, { nova_potential: "Low" } as any);
      
      expect(targetsHigh.nova_dpr).toBeGreaterThan(targetsLow.nova_dpr);
      expect(targetsHigh.target_anchor_hp_min).toBeGreaterThan(targetsLow.target_anchor_hp_min);
    });

    it('should respect Ally Mandate with heavy ally presence', () => {
      const mcd = JSON.parse(JSON.stringify(baseMcd));
      mcd.allies = [
        { name: "Paladin Hero", type: "Specific", role: "Frontline", quantity: 1, avg_dpr: 0, avg_cr: 1, is_independent: true, dismiss_organically: false, stats_provided: false, general_context: null },
        { name: "Guards", type: "General", quantity: 10, role: "Frontline", avg_dpr: 0, avg_cr: 1, is_independent: false, dismiss_organically: false, stats_provided: false, general_context: null }
      ];
      
      const targets = MathEngine.generateTargets(mcd as MasterContextDocument, undefined);
      // 4 PCs + 0.4 (Hero Fallback) + 1.5 (10 Guards Fallback @ 0.15) = 5.9 EPS
      expect(targets.message).toContain("EPS: 5.9");
      expect(targets.sustained_dpr).toBe(166); // 25 * 5.9 * 1.125 (Fresh Attrition)
    });
  });

  describe('Deterministic Mode', () => {
    it('should scale targets for brink_of_defeat outcome', () => {
      const mcd = JSON.parse(JSON.stringify(baseMcd));
      mcd.parameters.let_dice_fall = false;
      mcd.parameters.target_outcome = "brink_of_defeat";
      
      const targets = MathEngine.generateTargets(mcd as MasterContextDocument, undefined);
      // Scale is 1.4
      expect(targets.message).toContain("BRAWL");
    });
  });

  describe('Utility Methods', () => {
    it('should calculate hazard targets for different tiers', () => {
      const tier1 = MathEngine.calculateHazardTargets(1, 1);
      const tier4 = MathEngine.calculateHazardTargets(20, 4);
      expect(tier4.target_dc).toBeGreaterThan(tier1.target_dc);
      expect(tier4.avg_hazard_damage).toBeGreaterThan(tier1.avg_hazard_damage);
    });

    it('should calculate recommended actor DPR', () => {
      expect(MathEngine.calculateRecommendedActorDPR(100)).toBe(40);
    });

    it('should get survival window', () => {
      expect(MathEngine.getSurvivalWindow(100, 25)).toBe(4);
      expect(MathEngine.getSurvivalWindow(100, 0)).toBe(99);
    });

    it('should get damage variance', () => {
      const variance = MathEngine.getDamageVariance(20);
      expect(variance.reliable).toContain("d6");
      expect(variance.volatile).toContain("d20");
    });
  });

  describe('Validation Logic', () => {
    it('should fail Nova-Proof validation if HP is too low', () => {
      const isValid = MathEngine.validateNovaProof(100, 300, true, false);
      expect(isValid).toBe(false);
    });

    it('should pass Nova-Proof validation if HP is low but marked fragile', () => {
      const isValid = MathEngine.validateNovaProof(100, 300, true, true);
      expect(isValid).toBe(true);
    });
  });
});
