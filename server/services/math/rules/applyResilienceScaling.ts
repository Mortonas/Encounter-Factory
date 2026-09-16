import { MathRule } from "../types.js";

/**
 * RULE 7: applyResilienceScaling
 * Hardens the encounter against "Action Denial" (Save or Suck).
 * Triggered by Level 5+ or High Optimization.
 */
export const applyResilienceScaling: MathRule = (ctx) => {
  const { mcd, ppp } = ctx;
  const { party, premise } = mcd;

  // 1. Determine Requirement
  const isTier2Plus = party.avg_level >= 5;
  const powerProfile = ppp;
  const isHighOptimized = powerProfile?.tier_classification === "S" || 
                         powerProfile?.tier_classification === "A" || 
                         powerProfile?.nova_potential === "High";
  const isBossFight = premise.is_boss_fight || premise.encounter_structure === "Boss";
  
  const resilienceRequirement = isTier2Plus || isHighOptimized || isBossFight;

  // 2. Calculate Resilience Factor (0.0 to 1.0+)
  let resilienceFactor = 0;

  if (resilienceRequirement) {
    // Base floor for Tier 2
    resilienceFactor = 0.4;

    // Scaling increments
    if (party.avg_level >= 11) resilienceFactor += 0.2; // Tier 3
    if (isHighOptimized) resilienceFactor += 0.2;
    if (isBossFight) resilienceFactor += 0.2;
    
    // Cap/Floor safety
    resilienceFactor = Math.min(resilienceFactor, 1.2);
  }

  return {
    resilienceFactor,
    resilienceRequirement,
    auditTrace: { 
      ...ctx.auditTrace, 
      applyResilienceScaling: `Factor: ${resilienceFactor}, Required: ${resilienceRequirement}` 
    }
  };
};
