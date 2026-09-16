import { MathRule } from "../types.js";
import * as MathUtils from "../utils.js";

/**
 * RULE 4: calculateHpTargets
 * Establishes survival floors and total roster bulk.
 */
export const calculateHpTargets: MathRule = (ctx) => {
  const { avgDpr, effectivePartySize, novaMultiplier, mcd, attritionFactor, powerMultiplier, sustainedDpr, environmentalFactor } = ctx;
  const { premise, party } = mcd;
  const partyLevel = party?.avg_level || 5;

  const isAltObjective = premise.combat_style === "Alternative Objective";
  const targetRounds = premise.target_rounds || 4;
  const effectiveTargetRounds = isAltObjective ? targetRounds + 1 : targetRounds;

  // Apply multipliers to the final HP target
  const targetSurvivalHP = MathUtils.calculateSurvivalHP(avgDpr, effectivePartySize, novaMultiplier, effectiveTargetRounds) * attritionFactor * powerMultiplier * environmentalFactor;
  const ratioHpTarget = Math.round((sustainedDpr * attritionFactor * powerMultiplier * environmentalFactor) / 0.4);
  
  const rosterHp = Math.max(Math.round(targetSurvivalHP), ratioHpTarget);

  const hazardTargets = MathUtils.calculateHazardTargets(partyLevel, party?.tier || "Tier 1");
  const minPcHp = Math.min(...(party?.pcs || []).map(pc => pc.hp || 45), 45);

  return {
    targetSurvivalHP,
    ratioHpTarget,
    rosterHp,
    hazardDmg: hazardTargets.avg_hazard_damage,
    minPcHp,
    auditTrace: { ...ctx.auditTrace, calculateHpTargets: `Survival HP: ${targetSurvivalHP.toFixed(1)}, Roster HP: ${rosterHp}` }
  };
};
