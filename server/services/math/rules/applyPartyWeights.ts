import { MathRule } from "../types.js";
import * as MathUtils from "../utils.js";

/**
 * RULE 1: applyPartyWeights
 * Calculates the Effective Party Size (EPS) based on physical entities, 
 * and computes independent multipliers for Power (items/class) and Attrition.
 */
export const applyPartyWeights: MathRule = (ctx) => {
  const { mcd } = ctx;
  const { party, allies, parameters: params, premise } = mcd;

  const basePartySize = party?.size || 4;
  const effectivePartySize = MathUtils.calculatePhysicalEPS(basePartySize, allies, party?.avg_level, false, party?.avg_dpr);
  const powerMultiplier = MathUtils.calculatePowerMultiplier(party?.pcs || [], premise?.inspiration_velocity);
  const attritionFactor = MathUtils.calculateAttritionMultiplier(params?.entry_condition, basePartySize);

  return {
    basePartySize,
    effectivePartySize,
    powerMultiplier,
    attritionFactor,
    auditTrace: { 
      ...ctx.auditTrace, 
      applyPartyWeights: `EPS: ${effectivePartySize.toFixed(1)} (Physical only), Power Multiplier: ${powerMultiplier.toFixed(2)}, Attrition Factor: ${attritionFactor.toFixed(3)}` 
    }
  };
};
