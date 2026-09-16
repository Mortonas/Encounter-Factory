import { describe, it, expect } from "vitest";
import { MathEngine } from "../mathEngine.js";
import { MasterContextDocument } from "../../types.js";

describe("MathEngine: Environmental Modifiers", () => {
  const baseMcd: Partial<MasterContextDocument> = {
    premise: {
      avg_level: 5,
      combat_style: "Brawl",
      target_rounds: 4,
      toy_list: []
    } as any,
    party: {
      size: 4,
      avg_level: 5,
      avg_hp_pool: 180,
      pcs: []
    } as any,
    parameters: {
      entry_condition: "fresh"
    } as any
  };

  it("should calculate a neutral factor (1.0) when toy_list is empty", () => {
    const ctx = MathEngine.runPipeline(baseMcd as MasterContextDocument);
    expect(ctx.environmentalDelta).toBe(0);
    expect(ctx.environmentalFactor).toBe(1.0);
  });

  it("should correctly sum PC advantages (High Ground + Total Cover)", () => {
    const mcd = {
      ...baseMcd,
      premise: { ...baseMcd.premise, toy_list: ["High Ground", "Total Cover"] }
    } as MasterContextDocument;
    
    const ctx = MathEngine.runPipeline(mcd);
    // 0.10 + 0.15 = 0.25 -> Capped at 0.20
    expect(ctx.environmentalDelta).toBe(0.20);
    expect(ctx.environmentalFactor).toBe(1.20);
  });

  it("should correctly sum Boss advantages (Lava + Darkness)", () => {
    const mcd = {
      ...baseMcd,
      premise: { ...baseMcd.premise, toy_list: ["Lava", "Darkness"] }
    } as MasterContextDocument;
    
    const ctx = MathEngine.runPipeline(mcd);
    // -0.15 + -0.10 = -0.25 -> Capped at -0.20
    expect(ctx.environmentalDelta).toBe(-0.20);
    expect(ctx.environmentalFactor).toBe(0.80);
  });

  it("should handle overlapping factors (High Ground + Lava)", () => {
    const mcd = {
      ...baseMcd,
      premise: { ...baseMcd.premise, toy_list: ["High Ground", "Lava"] }
    } as MasterContextDocument;
    
    const ctx = MathEngine.runPipeline(mcd);
    // 0.10 - 0.15 = -0.05
    expect(ctx.environmentalDelta).toBeCloseTo(-0.05);
    expect(ctx.environmentalFactor).toBeCloseTo(0.95);
  });

  it("should trigger masteryOffset and stability_requirement for Cliff", () => {
    const mcd = {
      ...baseMcd,
      premise: { ...baseMcd.premise, toy_list: ["Cliffside"] }
    } as MasterContextDocument;
    
    const ctx = MathEngine.runPipeline(mcd);
    expect(ctx.masteryOffset).toBe(true);
    expect(ctx.message).toContain("STABILITY REQ");
  });

  it("should scale HP and DPR targets by the environmentalFactor", () => {
    // Fresh run (Factor 1.0)
    const baseCtx = MathEngine.runPipeline(baseMcd as MasterContextDocument);
    const baseHp = baseCtx.rosterHp;
    const baseDpr = baseCtx.finalSustainedDpr;

    // High Ground run (Factor 1.10)
    const advMcd = {
      ...baseMcd,
      premise: { ...baseMcd.premise, toy_list: ["High Ground"] }
    } as MasterContextDocument;
    const advCtx = MathEngine.runPipeline(advMcd);
    
    expect(advCtx.environmentalFactor).toBe(1.10);
    expect(advCtx.rosterHp).toBeGreaterThan(baseHp);
    expect(advCtx.finalSustainedDpr).toBeGreaterThan(baseDpr);
  });
});
