import { describe, it, expect } from 'vitest';
import { MathEngine } from './mathEngine.js';
import { MasterContextDocument } from '../types.js';

describe('MathEngine - Stress Tests (Mechanical Calibration)', () => {
  const baseMcd: any = {
    premise: {
      setting: "Dungeon",
      tone: "Dark",
      one_fight_day: true,
      encounter_structure: "Skirmish",
      combat_style: "Standard Brawl",
      target_rounds: 4,
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
      avg_hp_pool: 180,
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

  describe('Ally Scaling (Summon Swarm & Sanity Checks)', () => {
    it('should correctly value 8 CR 1/4 Wolves using DPR ratio', () => {
      const mcd = JSON.parse(JSON.stringify(baseMcd));
      // PC DPR is 25. 8 Wolves @ 2 DPR each = 16 DPR total.
      // Ratio: 16 / 25 = 0.64 players.
      mcd.allies = [{
        name: "Wolf Pack",
        type: "General",
        role: "Striker",
        quantity: 8,
        avg_dpr: 2,
        avg_cr: 0.25,
        is_independent: false,
        dismiss_organically: true,
        stats_provided: false
      }];
      
      const targets = MathEngine.generateTargets(mcd as MasterContextDocument, undefined);
      // 4 PCs + 0.64 = 4.64 EPS
      expect(targets.message).toContain("EPS: 4.6");
    });

    it('should clamp weight of CR 0 Strikers using sanity check', () => {
      const mcd = JSON.parse(JSON.stringify(baseMcd));
      mcd.allies = [{
        name: "Commoner Mob",
        type: "General",
        role: "Striker", // Should be 0.2 fallback
        quantity: 10,
        avg_dpr: 0,
        avg_cr: 0, // Should trigger clamp to 0.1
        is_independent: false,
        dismiss_organically: true,
        stats_provided: false
      }];
      
      const targets = MathEngine.generateTargets(mcd as MasterContextDocument, undefined);
      // 10 * 0.1 = 1.0. Total = 5.0 EPS.
      // If clamp failed, it would be 10 * 0.2 = 2.0. Total = 6.0 EPS.
      expect(targets.message).toContain("EPS: 5.0");
    });

    it('should value high-CR allies significantly (CR 5 Knight)', () => {
      const mcd = JSON.parse(JSON.stringify(baseMcd));
      mcd.allies = [{
        name: "Knight Commander",
        type: "Specific",
        role: "Frontline", // 0.4 fallback
        quantity: 1,
        avg_dpr: 0,
        avg_cr: 5, // No clamp (5 > 1)
        is_independent: true,
        dismiss_organically: false,
        stats_provided: false
      }];
      
      const targets = MathEngine.generateTargets(mcd as MasterContextDocument, undefined);
      // 4 + 0.4 = 4.4 EPS
      expect(targets.message).toContain("EPS: 4.4");
    });
  });

  describe('Lifespan Injection', () => {
    it('should increase Anchor HP as target rounds increase', () => {
      const mcd3 = JSON.parse(JSON.stringify(baseMcd));
      mcd3.premise.target_rounds = 3;
      mcd3.premise.encounter_structure = "Boss";
      
      const mcd6 = JSON.parse(JSON.stringify(baseMcd));
      mcd6.premise.target_rounds = 6;
      mcd6.premise.encounter_structure = "Boss";
      
      const targets3 = MathEngine.generateTargets(mcd3 as MasterContextDocument, undefined);
      const targets6 = MathEngine.generateTargets(mcd6 as MasterContextDocument, undefined);
      
      expect(targets6.target_anchor_hp_min).toBeGreaterThan(targets3.target_anchor_hp_min);
    });
  });

  describe('Lethality Nudge', () => {
    it('should apply a corrective nudge if lethality is too low', () => {
      const mcd = JSON.parse(JSON.stringify(baseMcd));
      // Force a situation where damage is low compared to HP
      mcd.parameters.target_difficulty = "Easy";
      
      const targets = MathEngine.generateTargets(mcd as MasterContextDocument, undefined);
      // Audit trace should mention the nudge if it triggered
      expect(targets.message).toContain("[NUDGE]");
    });
  });
});
