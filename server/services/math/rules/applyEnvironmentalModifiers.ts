import { MathRule } from "../types.js";
import * as MathUtils from "../utils.js";

/**
 * RULE 2: applyEnvironmentalModifiers
 * Hardens the simulation against "Tactical Blindness" by integrating 
 * the environmentalFactor from the Cartographer's toy_list.
 */
export const applyEnvironmentalModifiers: MathRule = (ctx) => {
  const { mcd } = ctx;
  const toyList = mcd.premise.toy_list || [];

  const { delta, factor, masteryOffset } = MathUtils.calculateEnvironmentalFactor(toyList);

  return {
    environmentalDelta: delta,
    environmentalFactor: factor,
    masteryOffset,
    auditTrace: { 
      ...ctx.auditTrace, 
      applyEnvironmentalModifiers: `Delta: ${delta.toFixed(2)} (Factor: x${factor.toFixed(2)}), Mastery: ${masteryOffset}` 
    }
  };
};
