import { MasterContextDocument, PowerProfile } from "../../types.js";

/**
 * PH2: Immutable context for the MathEngine rule pipeline.
 * All inputs are strict and non-nullable to prevent NaN propagation.
 */
export interface MathContext {
  // --- INPUTS ---
  readonly mcd: Readonly<MasterContextDocument>;
  readonly ppp: Readonly<PowerProfile>;
  
  // --- DERIVED WEIGHTS ---
  readonly basePartySize: number;
  readonly allyWeight: number;
  readonly magicItemWeight: number;
  readonly classWeight: number;
  readonly attritionWeight: number;
  readonly attritionFactor: number;
  readonly powerMultiplier: number;

  // --- ENVIRONMENTAL ---
  readonly environmentalDelta: number;
  readonly environmentalFactor: number;
  readonly masteryOffset: boolean;

  // --- RESILIENCE ---
  readonly resilienceFactor: number; // 0.0 to 1.0 (Higher = more anti-denial)
  readonly resilienceRequirement: boolean;

  // --- TARGETS ---
  readonly inspirationWeight: number;
  readonly effectivePartySize: number;

  // --- BUDGETS ---
  readonly targetActionBudget: number;
  readonly reactionBudget: number;
  readonly highReactionParty: boolean;

  // --- DPR ---
  readonly avgDpr: number;
  readonly novaMultiplier: number;
  readonly novaDpr: number;
  readonly sustainedDpr: number;

  // --- HP & SURVIVAL ---
  readonly targetSurvivalHP: number;
  readonly ratioHpTarget: number;
  readonly rosterHp: number;
  readonly anchorHpMin: number;
  readonly anchorHpMax: number;
  readonly anyFragileAnchor: boolean;

  // --- FINAL OUTPUTS ---
  readonly finalSustainedDpr: number;
  readonly finalRosterHp: number;
  readonly finalLethalityLimit: number;
  readonly lethalityCurve: number[];
  readonly isFragile: boolean;
  readonly message: string;

  // --- INTERMEDIATE CALCULATIONS ---
  readonly hazardDmg: number;
  readonly minPcHp: number;

  // --- AUDIT ---
  readonly auditTrace: Record<string, string>;
}

export type MathRule = (ctx: Readonly<MathContext>) => Partial<MathContext>;
