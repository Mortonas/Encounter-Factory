import { MathRule } from "../types.js";

/**
 * RULE 5: applyNovaProofing
 * Ensures Bosses/Legendaries can survive the estimated Round 1 burst.
 */
export const applyNovaProofing: MathRule = (ctx) => {
  const { mcd, ppp, targetSurvivalHP, novaDpr, rosterHp: currentRosterHp, attritionFactor, powerMultiplier } = ctx;
  const { premise, parameters: params } = mcd;

  const isBossArchetype = premise.is_boss_fight || premise.encounter_structure === "Boss";
  const isAltObjective = premise.combat_style === "Alternative Objective";
  const anyFragileAnchor = mcd.party?.requested_enemies?.some(e => e.is_fragile && (e.type === "Boss" || e.type === "Legendary")) || false;

  let anchorHpMin = Math.round(targetSurvivalHP * 0.5);
  if (ppp.one_fight_day_flags?.active) anchorHpMin = Math.round(targetSurvivalHP * 0.7);

  // Apply Nova-proofing floor
  if (isBossArchetype || isAltObjective) {
    if (anyFragileAnchor) {
      anchorHpMin = Math.round(targetSurvivalHP * 0.20);
    } else {
      // Nova proofing also respects power/attrition scaling indirectly via targetSurvivalHP
      anchorHpMin = Math.max(anchorHpMin, novaDpr * attritionFactor * powerMultiplier);
    }
  }

  let anchorHpMax = Math.round(anchorHpMin * 1.5);
  anchorHpMax = Math.max(anchorHpMax, anchorHpMin + 20);

  // Deterministic outcomes scale HP
  let finalAnchorHpMin = anchorHpMin;
  let finalAnchorHpMax = anchorHpMax;
  let finalRosterHp = currentRosterHp;

  if (params?.let_dice_fall === false) {
    const outcome = params?.target_outcome || 'heavy_tax';
    const scale = outcome === 'brink_of_defeat' ? 1.4 : outcome === 'heavy_tax' ? 1.2 : 0.9;
    finalAnchorHpMin = Math.round(anchorHpMin * scale);
    finalAnchorHpMax = Math.round(anchorHpMax * scale);
    finalRosterHp = Math.round(currentRosterHp * scale);
  }

  // TPK Risk Buffer (Phase 1 legacy: +15%)
  if (premise.failure_consequence === "tpk_risk") {
    finalAnchorHpMin = Math.round(finalAnchorHpMin * 1.15);
    finalAnchorHpMax = Math.round(finalAnchorHpMax * 1.15);
    finalRosterHp = Math.round(finalRosterHp * 1.15);
  }

  return {
    anchorHpMin: finalAnchorHpMin,
    anchorHpMax: finalAnchorHpMax,
    rosterHp: finalRosterHp,
    anyFragileAnchor,
    auditTrace: { ...ctx.auditTrace, applyNovaProofing: `Anchor Min: ${finalAnchorHpMin}, Roster: ${finalRosterHp}` }
  };
};
