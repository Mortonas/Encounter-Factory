import { describe, it, expect } from "vitest";
import { MathEngine } from "../mathEngine.js";
import { MasterContextDocument } from "../../types.js";

describe("MathEngine: Resilience Scaling", () => {
  const baseMcd: any = {
    premise: {
      is_boss_fight: false,
      encounter_structure: "Skirmish",
      target_rounds: 4
    } as any,
    party: {
      avg_level: 3,
      avg_hp_pool: 100,
      pcs: []
    } as any,
    ppp: {
      tier_classification: "B",
      nova_potential: "Medium"
    } as any
  };

  it("should have 0 resilience for a low-level, standard party (Level 3)", () => {
    const ctx = MathEngine.runPipeline(baseMcd as MasterContextDocument, baseMcd.ppp);
    expect(ctx.resilienceRequirement).toBe(false);
    expect(ctx.resilienceFactor).toBe(0);
  });

  it("should trigger resilience for a Tier 2 party (Level 5)", () => {
    const mcd = {
      ...baseMcd,
      party: { ...baseMcd.party, avg_level: 5 }
    } as MasterContextDocument;
    
    const ctx = MathEngine.runPipeline(mcd, baseMcd.ppp);
    expect(ctx.resilienceRequirement).toBe(true);
    expect(ctx.resilienceFactor).toBeGreaterThanOrEqual(0.4);
    expect(ctx.message).toContain("RESILIENCE: Medium");
  });

  it("should scale resilience for a High Optimized party", () => {
    const mcd = {
      ...baseMcd,
      party: { ...baseMcd.party, avg_level: 5 },
      ppp: {
        tier_classification: "A",
        nova_potential: "High"
      }
    } as any;
    
    const ctx = MathEngine.runPipeline(mcd as MasterContextDocument, mcd.ppp);
    // Base 0.4 + HighOptimized 0.2 = 0.6
    expect(ctx.resilienceFactor).toBeCloseTo(0.6);
  });

  it("should scale resilience for a Tier 3 Boss fight", () => {
    const mcd = {
      ...baseMcd,
      party: { ...baseMcd.party, avg_level: 11 },
      premise: { ...baseMcd.premise, is_boss_fight: true, encounter_structure: "Boss" }
    } as any;
    
    const ctx = MathEngine.runPipeline(mcd as MasterContextDocument, mcd.ppp);
    // Base 0.4 + Tier3 0.2 + Boss 0.2 = 0.8
    expect(ctx.resilienceFactor).toBeCloseTo(0.8);
    expect(ctx.message).toContain("RESILIENCE: High");
  });

  it("should cap resilience factor at 1.2", () => {
    const mcd = {
      ...baseMcd,
      party: { ...baseMcd.party, avg_level: 20 },
      premise: { ...baseMcd.premise, is_boss_fight: true },
      ppp: {
        tier_classification: "S",
        nova_potential: "High"
      }
    } as any;
    
    const ctx = MathEngine.runPipeline(mcd as MasterContextDocument, mcd.ppp);
    expect(ctx.resilienceFactor).toBeLessThanOrEqual(1.2);
  });
});
