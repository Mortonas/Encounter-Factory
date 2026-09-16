import { MathRule } from "../types.js";

/**
 * RULE 7: generateSummaryMessage
 * Compiles the narrative description of the math state.
 */
export const generateSummaryMessage: MathRule = (ctx) => {
  const { 
    mcd, effectivePartySize, finalRosterHp, targetActionBudget, highReactionParty, 
    anyFragileAnchor, hazardDmg, minPcHp, powerMultiplier, attritionFactor,
    environmentalFactor, environmentalDelta, masteryOffset
  } = ctx;
  const isAltObjective = mcd.premise.combat_style === "Alternative Objective";
  const oneShotRisk = (hazardDmg * 2) >= minPcHp;

  const envInfo = environmentalDelta !== 0 ? `Env: x${environmentalFactor.toFixed(2)}. ` : "";
  const masteryInfo = masteryOffset ? "STABILITY REQ: Mastery-proof Anchor recommended. " : "";
  const resilienceInfo = ctx.resilienceRequirement ? `RESILIENCE: ${ctx.resilienceFactor >= 0.7 ? 'High' : 'Medium'}. ` : "";

  const nudgeApplied = ctx.auditTrace?.calculateLethality?.includes("Nudge");
  const message = `${isAltObjective ? "OBJECTIVE-BASED: " : "BRAWL: "} Target rounds: ${mcd.premise.target_rounds || 4}. ` +
                  `EPS: ${effectivePartySize.toFixed(1)}. ` +
                  `Multipliers: Power x${powerMultiplier.toFixed(2)}, Attrition x${attritionFactor.toFixed(2)}, ${envInfo}` +
                  `Total Roster EHP: ${finalRosterHp}. ` +
                  `Action Budget: ${targetActionBudget}. ` +
                  `${highReactionParty ? "HIGH REACTION DENSITY. " : ""}` +
                  `${anyFragileAnchor ? "FRAGILE ARCHETYPE. " : ""}` +
                  `${masteryInfo}` +
                  `${resilienceInfo}` +
                  `${nudgeApplied ? "[NUDGE] Steering applied. " : ""}` +
                  `${oneShotRisk ? "WARNING: One-shot risk." : ""}`;

  return { 
    message,
    isFragile: anyFragileAnchor,
    stability_requirement: masteryOffset,
    resilience_factor: ctx.resilienceFactor,
    resilience_requirement: ctx.resilienceRequirement,
    auditTrace: { ...ctx.auditTrace, generateSummaryMessage: "Message compiled." }
  };
};
