import { MathRule } from "../types.js";
import * as MathUtils from "../utils.js";

/**
 * RULE 3: calculateDprTargets
 * Sets Nova and Sustained DPR expectations.
 */
export const calculateDprTargets: MathRule = (ctx) => {
  const { mcd, ppp, effectivePartySize } = ctx;
  const { party, parameters: params } = mcd;
  const partyLevel = party?.avg_level || 5;
  
  // 1. Avg DPR Baseline
  // Use MathUtils instead of MathEngine static method
  const isOptimized = ppp.nova_potential === "High";
  const avgDpr = party?.avg_dpr || MathUtils.estimateAvgDpr(partyLevel, isOptimized);

  // 2. SCALE NOVA BASED ON ENTRY CONDITION
  let novaPotential = ppp.nova_potential || "Medium";
  if (params?.entry_condition === "winded") {
    if (novaPotential === "High") novaPotential = "Medium";
    else if (novaPotential === "Medium") novaPotential = "Low";
  } else if (params?.entry_condition === "depleted") {
    novaPotential = "Low";
  }

  const novaMultiplier = MathUtils.getNovaMultiplier(novaPotential);
  const novaDpr = Math.round(MathUtils.calculateNovaDpr(avgDpr, effectivePartySize, novaMultiplier));
  const sustainedDpr = avgDpr * effectivePartySize;

  return {
    avgDpr,
    novaMultiplier,
    novaDpr,
    sustainedDpr,
    auditTrace: { ...ctx.auditTrace, calculateDprTargets: `Nova: ${novaDpr} (x${novaMultiplier}, ${novaPotential}), Sustained: ${sustainedDpr.toFixed(1)}` }
  };
};
