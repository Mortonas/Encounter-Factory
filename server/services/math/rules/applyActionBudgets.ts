import { MathRule } from "../types.js";

/**
 * RULE 2: applyActionBudgets
 * Calculates the target action and reaction budgets (The 2:1 Rule).
 */
export const applyActionBudgets: MathRule = (ctx) => {
  const { effectivePartySize, basePartySize, mcd, attritionFactor, powerMultiplier } = ctx;
  
  // Target Budget = 2:1 ratio against effective party size, scaled by attrition and power
  const targetActionBudget = Math.round(effectivePartySize * 2 * attritionFactor * powerMultiplier);
  
  const highReactionParty = (mcd.party?.pcs || []).some(pc => pc.reaction_density === "high");
  const reactionBudget = highReactionParty ? basePartySize : 1;

  return {
    targetActionBudget,
    reactionBudget,
    highReactionParty,
    auditTrace: { ...ctx.auditTrace, applyActionBudgets: `Action: ${targetActionBudget}, Reaction: ${reactionBudget}` }
  };
};
