import { MathRule } from "../types.js";
import * as MathUtils from "../utils.js";

/**
 * RULE 6: calculateLethality
 * Sets the damage output limit to prevent unintentional TPKs.
 */
export const calculateLethality: MathRule = (ctx) => {
  const { mcd, rosterHp, sustainedDpr, anyFragileAnchor, attritionFactor, powerMultiplier, environmentalFactor } = ctx;
  const { party, premise } = mcd;
  const isBossArchetype = premise.is_boss_fight || premise.encounter_structure === "Boss";

  const partyEHP = party?.avg_hp_pool || (ctx.basePartySize * 45);
  const survivalThreshold = isBossArchetype ? 1.5 : 2.0;
  
  const maxSafeDpr = Math.floor(partyEHP / survivalThreshold);
  // Apply multipliers to the damage budget
  let finalSustainedDpr = Math.min(sustainedDpr * attritionFactor * powerMultiplier * environmentalFactor, maxSafeDpr * attritionFactor * powerMultiplier * environmentalFactor);

  // Final roster HP must also respect 0.4 lethality floor against the safe dpr
  const finalRosterHp = Math.max(rosterHp, Math.round(finalSustainedDpr / 0.4));

  // CENTER-SEEKING NUDGE:
  // If the simulation hits the edges (e.g. lethality < 0.35), nudge the DPR up towards the 0.4 sweet spot.
  let nudgeValue = 0;
  const currentRatio = finalSustainedDpr / finalRosterHp;
  if (currentRatio < 0.35 && !anyFragileAnchor) {
    const targetDpr = finalRosterHp * 0.4;
    nudgeValue = Math.round((targetDpr - finalSustainedDpr) * 0.2); // 20% correction nudge
    finalSustainedDpr += nudgeValue;
  }

  const standardHp = MathUtils.estimateStandardPcHp(party?.avg_level || 5);
  const finalLethalityLimit = Math.round(standardHp * 0.5 * attritionFactor * powerMultiplier);

  const lethalityCurve = (isBossArchetype && !anyFragileAnchor) ? [0.3, 0.6, 1.2] : [0.4];

  return {
    finalSustainedDpr,
    finalRosterHp,
    finalLethalityLimit,
    lethalityCurve,
    auditTrace: { 
      ...ctx.auditTrace, 
      calculateLethality: `Safe DPR: ${finalSustainedDpr}${nudgeValue ? ` (Nudge: +${nudgeValue})` : ""}, Limit: ${finalLethalityLimit}` 
    }
  };
}
