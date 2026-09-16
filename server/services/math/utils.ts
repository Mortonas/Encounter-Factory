import { MathContext } from "./types.js";

/**
 * TERRAIN_LIBRARY
 * Maps map features (toy_list) to bi-directional mathematical deltas.
 * Positive delta = PC Advantage (increases Boss HP/DPR targets).
 * Negative delta = Boss Advantage (decreases Boss HP/DPR targets).
 */
export const TERRAIN_LIBRARY: Record<string, number> = {
  // PC Advantage
  "High Ground": 0.10,
  "Total Cover": 0.15,
  "Choke Point": 0.10,
  "Holy Ground": 0.10,
  "Sniper's Nest": 0.10,
  "Verticality": 0.05,
  
  // Boss Advantage
  "Lava": -0.15,
  "Hazards": -0.15,
  "Pits": -0.10,
  "Acid": -0.10,
  "Darkness": -0.10,
  "Spikes": -0.05,
  "Obscurement": -0.05,
  "Difficult Terrain": -0.05,
  
  // Mastery Zones (Trigger masteryOffset)
  "Cliff": 0.05,
  "Pit": -0.10,
};

/**
 * PH2: Pure mathematical utilities for the Encounter Factory.
 * All functions are deterministic and do not maintain state.
 */

// --- CONSTANTS ---
export const ACCURACY_MULTIPLIER = 0.65; // 5.5e baseline
export const LETHALITY_MIN = 0.20;
export const LETHALITY_MAX = 0.60;
export const CREATURE_SIZE_FOOTPRINT: Record<string, number> = {
  "Tiny": 1, 
  "Small": 1, 
  "Medium": 1,
  "Large": 4, 
  "Huge": 9, 
  "Gargantuan": 16
};

/**
 * Calculates Effective Party Size (EPS) using dynamic ratio-based weighting.
 * Formula: Ally Weight = (Ally Estimated DPR / Standard PC DPR) * Quantity
 */
export function calculatePhysicalEPS(
  baseSize: number, 
  allies: any[] = [], 
  avgLevel: number = 5, 
  optimized: boolean = false,
  benchmarkDpr?: number
): number {
  const pcDpr = benchmarkDpr || estimateAvgDpr(avgLevel, optimized);
  
  const allyWeight = allies.reduce((acc, ally) => {
    const dpr = ally.avg_dpr || 0;
    const qty = ally.quantity || 1;

    if (dpr > 0) {
      // Ratio scaling (e.g. 5 wolves @ 4 dpr vs level 5 PC @ 20 dpr = 1.0 players)
      return acc + (dpr / pcDpr) * qty;
    }

    // Fallback Heuristics if DPR is missing
    let baseWeight = 0.1; // Default
    if (ally.type === "Specific") {
      if (ally.role === "Striker") baseWeight = 0.5;
      else if (ally.role === "Frontline") baseWeight = 0.4;
      else if (ally.role === "Support") baseWeight = 0.25;
    } else {
      if (ally.role === "Striker") baseWeight = 0.2;
      else if (ally.role === "Frontline") baseWeight = 0.15;
      else if (ally.role === "Support") baseWeight = 0.1;
    }
    // CR Sanity Check: Low-CR units should not have inflated weights from roles.
    // A CR 0 "Striker" should not outweigh a CR 1 "Cannon Fodder".
    const cr = ally.avg_cr || 0;
    if (cr < 1) {
      baseWeight = Math.min(baseWeight, Math.max(0.1, cr * 0.4));
    }
    
    return acc + (baseWeight * qty);
  }, 0);

  return baseSize + allyWeight;
}

/**
 * Calculates a multiplier based on the party's mechanical advantages (Magic Items, Class Debt).
 */
export function calculatePowerMultiplier(pcs: any[] = [], inspirationVelocity: string = "medium"): number {
  const baseSize = Math.max(1, pcs.length);

  const magicItemWeight = pcs.reduce((acc, pc) => {
    return acc + (pc.major_magic_items_count || 0) * 0.3;
  }, 0);

  const classWeight = pcs.reduce((acc, pc) => {
    let weight = 0;
    const isFighter = pc.className?.toLowerCase().includes("fighter");
    if (isFighter) {
      if (pc.level >= 17) weight += 0.5;
      else if (pc.level >= 11) weight += 0.3;
      else if (pc.level >= 5) weight += 0.2;
      else if (pc.level >= 2) weight += 0.1;
    }
    return acc + weight;
  }, 0);

  const inspirationWeight = (inspirationVelocity === "high") ? 0.2 : 0;

  return 1.0 + (magicItemWeight + classWeight + inspirationWeight) / baseSize;
}

/**
 * Calculates the resource attrition multiplier independent of EPS.
 */
export function calculateAttritionMultiplier(entryCondition: string = "fresh", baseSize: number = 4): number {
  let attritionWeight = 0;
  if (entryCondition === "fresh") attritionWeight = 0.5;
  else if (entryCondition === "depleted") attritionWeight = -0.3;
  
  return 1.0 + (attritionWeight / (baseSize || 4));
}

/**
 * Estimates average DPR based on level and optimization level.
 */
export function estimateAvgDpr(level: number, optimized: boolean = false): number {
  const baseDpr = (level || 1) + 7;
  if (optimized) {
    return baseDpr + Math.ceil((level || 1) / 2);
  }
  return baseDpr;
}

export function calculateNovaDpr(avgDpr: number, partySize: number, novaMultiplier: number): number {
  return (avgDpr || 0) * (partySize || 0) * novaMultiplier;
}

/**
 * Calculates Effective Hit Points (EHP) based on base HP and defensive coefficients.
 */
export function calculateEHP(baseHp: number, defenseCoefficient: number = 1.0): number {
  return Math.round(baseHp * defenseCoefficient);
}

/**
 * Calculates estimated lifespan in rounds based on total roster HP and party DPR.
 */
export function calculateLifespan(totalHp: number, novaDpr: number, sustainedDpr: number): number {
  const avgDpr = (novaDpr + sustainedDpr) / 2;
  if (avgDpr <= 0) return 0;
  return Number((totalHp / avgDpr).toFixed(2));
}

export function calculateSurvivalHP(
  avgDpr: number, 
  partySize: number, 
  novaMultiplier: number, 
  targetRounds: number = 4
): number {
  const safeAvgDpr = avgDpr || 0;
  const safePartySize = partySize || 0;
  const safeTargetRounds = targetRounds > 0 ? targetRounds : 4;

  const novaDpr = calculateNovaDpr(safeAvgDpr, safePartySize, novaMultiplier);
  const sustainedDpr = safeAvgDpr * safePartySize;
  
  // Survival Math: (Round 1 Nova + (Remaining Rounds * Sustained DPR)) * 0.65 Accuracy
  const totalDprAssumed = novaDpr + (sustainedDpr * (safeTargetRounds - 1));
  const targetHp = totalDprAssumed * ACCURACY_MULTIPLIER;
  
  if (!isFinite(targetHp) || isNaN(targetHp)) return 0;
  return Math.max(0, Math.round(targetHp));
}

/**
 * PH5: Calculates the estimated survival range for a specific actor's EHP.
 */
export function calculateSurvivalRange(
  ehp: number, 
  sustainedDpr: number, 
  novaDpr: number
): { min_rounds: number, max_rounds: number } {
  const minRounds = ehp / (novaDpr || 1);
  const effectiveSustainedDpr = (sustainedDpr || 1) * ACCURACY_MULTIPLIER;
  const maxRounds = ehp / effectiveSustainedDpr;

  return {
    min_rounds: Math.max(1, Math.floor(minRounds)),
    max_rounds: Math.max(1, Math.ceil(maxRounds))
  };
}

/**
 * Enforces the Narrative Boss Blueprint 0.4 Lethality Formula.
 */
export function validateLethality(dpr: number, hp: number): boolean {
  if (!hp || isNaN(hp) || hp <= 0) return false;
  const ratio = dpr / hp;
  return ratio >= LETHALITY_MIN && ratio <= LETHALITY_MAX;
}

export function getLethalityErrorMessage(dpr: number, hp: number): string {
  const ratio = hp > 0 ? (dpr / hp).toFixed(2) : "0";
  return `DPR/HP ratio (${ratio}) violates the 0.4 Lethality Formula (Narrative Boss Blueprint §4). Ensure damage_per_round_target is 25–60% of total_roster_hp.`;
}

/**
 * Enforces Nova-Proof Boss Survivability for boss archetypes.
 */
export function validateNovaProof(anchorMinHp: number, novaDpr: number, isBoss: boolean, isFragile: boolean = false): boolean {
  if (!isBoss || isFragile) return true;
  return anchorMinHp >= novaDpr;
}

export function getNovaProofErrorMessage(): string {
  return "Nova-Proof FAILED: anchor_hp_range.min must be >= nova_dpr_estimated for Boss archetypes. " +
         "The Anchor will be eliminated in Round 1 by a focused nova strike before any narrative beats can fire.";
}

/**
 * Estimates HP for a 'Standard' PC (d8 hit die, +2 Con).
 */
export function estimateStandardPcHp(level: number): number {
  const d = 8; // Median d8
  const c = 2; // Standard +2 Con
  const level_adjustment = (level - 1) * (Math.ceil((d + 1) / 2) + c);
  return d + c + level_adjustment;
}

export function calculateHazardTargets(partyLevel: number, tier: number | string): { target_dc: number, avg_hazard_damage: number, damage_formula: string } {
  const tierNum = typeof tier === 'string' ? parseInt(tier.replace(/\D/g, '')) || 1 : tier;
  const safeTier = Math.max(1, Math.min(4, tierNum));
  const standardHp = estimateStandardPcHp(partyLevel);
  
  const target_dc = 11 + (safeTier * 2);
  const tension_multiplier = 0.25; // Defaulting to "Dangerous" tension
  const avg_hazard_damage = Math.round(standardHp * tension_multiplier);
  
  const diceCount = Math.max(1, Math.round(avg_hazard_damage / 5.5));
  const damage_formula = `${diceCount}d10`;

  return {
    target_dc,
    avg_hazard_damage,
    damage_formula
  };
}

/**
 * Helper to calculate the weight of custom/mechanical traits.
 */
export function calculateManualWeight(
  addedTraits: string[], 
  hasEnvShift: boolean, 
  manualModifier?: number
): { value: number; reasoning: string } {
  let weight = 1.0;
  let reasons: string[] = [];

  if (addedTraits.includes("Damage_Resistant")) {
    weight *= 1.5;
    reasons.push("Resistance (x1.5)");
  }
  if (addedTraits.includes("Regeneration")) {
    weight *= 1.2;
    reasons.push("Regeneration (x1.2)");
  }
  if (hasEnvShift) {
    weight *= 1.1;
    reasons.push("Environment Shift (x1.1)");
  }
  if (manualModifier && manualModifier !== 1.0) {
    weight *= manualModifier;
    reasons.push(`Manual Override (x${manualModifier})`);
  }

  return { 
    value: Number(weight.toFixed(2)), 
    reasoning: reasons.length > 0 ? reasons.join(", ") : "Standard Scaling" 
  };
}

export interface EHPSegment {
  id: string;
  name: string;
  hp: number;
  ac: number;
  dpr: number;
  weight: number;
  traits: string[];
  trigger: string;
  ehp: number;
}

// --- INTERNAL PIPELINE HELPERS ---

const getAcWeight = (ac: number) => 1 + (ac - 15) * 0.05;

/**
 * PH7: Calculates the total Effective Hit Points across all phases of an actor.
 */
export function calculateAggregateEHP(
  baseHp: number,
  baseAc: number,
  baseDpr: number,
  phases: any[] | undefined,
  partySustainedDpr: number,
  transitionOverhead: number = 0
): { 
  totalEhp: number; 
  phaseBreakdown: EHPSegment[]; 
  auditLog: string[] 
} {
  const auditLog: string[] = [];
  const segments: EHPSegment[] = [];
  
  // 1. Normalization & Sorting (Ensures order regardless of bot output)
  const sortedPhases = [...(phases || [])].sort((a, b) => {
    const aVal = a.trigger.type === "HP_THRESHOLD" ? a.trigger.value : 0;
    const bVal = b.trigger.type === "HP_THRESHOLD" ? b.trigger.value : 0;
    return bVal - aVal;
  });

  let currentThreshold = 1.0;

  // 2. Initial State (Phase 0) Slicing
  const firstHpTrigger = sortedPhases.find(p => p.trigger.type === "HP_THRESHOLD");
  if (firstHpTrigger || (sortedPhases.length === 0)) {
    const initialSlice = firstHpTrigger ? (1.0 - firstHpTrigger.trigger.value) : 1.0;
    const initialHp = Math.round(baseHp * initialSlice);
    const weight = getAcWeight(baseAc);
    const initialEhp = Math.round(initialHp * weight);
    
    segments.push({
      id: "phase-0",
      name: "Initial State",
      ehp: initialEhp,
      hp: initialHp,
      ac: baseAc,
      dpr: baseDpr,
      weight: weight,
      trigger: "Encounter Start",
      traits: []
    });

    auditLog.push(`Phase 0 (Initial): ${initialHp} HP (${Math.round(initialSlice * 100)}% slice) * ${weight.toFixed(2)} Weight = ${initialEhp} EHP`);
    if (firstHpTrigger) currentThreshold = firstHpTrigger.trigger.value;
  }

  // 3. Phase-by-Phase Pipeline
  sortedPhases.forEach((phase, index) => {
    const overrides = phase.state_overrides;
    
    // Defensive Weight Stage
    const traitWeight = calculateManualWeight(
      overrides.added_traits || [], 
      !!phase.environment_shift, 
      overrides.manual_weight_modifier
    );
    
    const ac = overrides.ac_override ?? baseAc;
    const effectiveWeight = getAcWeight(ac) * traitWeight.value;
    
    // HP Slicing Stage (with RESET/CONTINUOUS logic)
    let phaseHp = 0;
    if (phase.hp_pool_behavior === "RESET") {
      phaseHp = overrides.hp_override || 0;
    } else {
      const nextHpTrigger = sortedPhases.slice(index + 1).find(p => p.trigger.type === "HP_THRESHOLD");
      const nextThreshold = nextHpTrigger ? nextHpTrigger.trigger.value : 0;
      const sliceSize = Math.max(0, currentThreshold - nextThreshold);
      phaseHp = overrides.hp_override || (baseHp * sliceSize);
      if (phase.trigger.type === "HP_THRESHOLD") currentThreshold = nextThreshold;
    }

    // Requirement Enforcement Stage (Round Timer HP Floors)
    if (phase.trigger.type === "ROUND_TIMER") {
      const requiredBuffer = (phase.trigger.value || 0) * partySustainedDpr;
      if (phaseHp < requiredBuffer) {
        phaseHp = requiredBuffer;
        auditLog.push(`  [!] Phase ${index + 1} HP Floor triggered by Round Timer.`);
      }
    }

    const roundedHp = Math.round(phaseHp);
    const phaseEhp = Math.round(roundedHp * effectiveWeight);

    segments.push({
      id: phase.narrative_beat,
      name: phase.narrative_beat,
      ehp: phaseEhp,
      hp: roundedHp,
      ac: ac,
      dpr: overrides.dpr_override || baseDpr,
      weight: effectiveWeight,
      trigger: phase.trigger.type === "HP_THRESHOLD" 
        ? `${Math.round(phase.trigger.value * 100)}% HP` 
        : `Round ${phase.trigger.value}`,
      traits: overrides.added_traits || []
    });
    
    auditLog.push(
      `Phase ${index + 1} (${phase.hp_pool_behavior}): ${roundedHp} HP * ${effectiveWeight.toFixed(2)} ` +
      `Weight [${traitWeight.reasoning}] = ${phaseEhp} EHP`
    );
  });

  // 4. Aggregation Stage
  let finalTotalEhp = segments.reduce((sum, s) => sum + s.ehp, 0);
  const overheadEhp = Math.round((transitionOverhead || 0) * partySustainedDpr);

  if (overheadEhp > 0) {
    finalTotalEhp += overheadEhp;
    auditLog.push(`Total Overhead: ${transitionOverhead} untargetable rounds = +${overheadEhp} EHP`);
  }

  return { totalEhp: finalTotalEhp, phaseBreakdown: segments, auditLog };
}


/**
 * Returns the Nova Multiplier based on party potential.
 */
export function getNovaMultiplier(potential: string): number {
  switch (potential) {
    case "High": return 3.0;
    case "Medium": return 2.0;
    case "Low": return 1.5;
    default: return 2.0;
  }
}

// --- MISSING METHODS (APPROVED) ---

/**
 * Calculates recommended target damage for an actor based on their HP.
 * Enforces the 0.4 Lethality Ratio.
 */
export function calculateRecommendedActorDPR(hp: number): number {
  return Math.round(hp * 0.4);
}

/**
 * Returns the estimated rounds an actor will survive against a specific DPR.
 * Returns 99 for zero damage to satisfy legacy test expectations.
 */
export function getSurvivalWindow(hp: number, dpr: number): number {
  if (dpr <= 0) return 99;
  return Math.round(hp / dpr);
}

/**
 * Suggests dice formulas based on target damage and desired volatility.
 * Includes static modifiers to bridge the gap between dice averages and target DPR.
 */
export function getDamageVariance(dpr: number): { reliable: string, volatile: string } {
  const formatDice = (avgPerDie: number, dieLabel: string) => {
    const count = Math.max(1, Math.round(dpr / avgPerDie));
    const diceAvg = count * avgPerDie;
    const modifier = Math.round(dpr - diceAvg);
    const modStr = modifier === 0 ? "" : (modifier > 0 ? `+${modifier}` : `${modifier}`);
    return `${count}${dieLabel}${modStr}`;
  };

  return {
    reliable: formatDice(3.5, "d6"),
    volatile: formatDice(10.5, "d20")
  };
}

/**
 * calculateEnvironmentalFactor
 * Aggregates tactical features from the toy_list into a single multiplier.
 * Enforces a +/- 20% cap on the total delta.
 */
export function calculateEnvironmentalFactor(toyList: string[]): { delta: number, factor: number, masteryOffset: boolean } {
  let delta = 0;
  let masteryOffset = false;

  const masteryKeywords = ["Cliff", "Pit", "Verticality"];

  toyList.forEach(toy => {
    // Check library for exact match or substring
    for (const [key, val] of Object.entries(TERRAIN_LIBRARY)) {
      if (toy.toLowerCase().includes(key.toLowerCase())) {
        delta += val;
        break; 
      }
    }

    // Check for mastery offset
    if (masteryKeywords.some(k => toy.toLowerCase().includes(k.toLowerCase()))) {
      masteryOffset = true;
    }
  });

  // Cap delta at +/- 20%
  const cappedDelta = Math.max(-0.20, Math.min(0.20, delta));
  
  return {
    delta: cappedDelta,
    factor: 1 + cappedDelta,
    masteryOffset
  };
}
