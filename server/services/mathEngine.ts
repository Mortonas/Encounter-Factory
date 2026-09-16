import { 
  PartyContext, 
  PowerProfile, 
  EncounterParameters, 
  MasterContextDocument, 
  HazardTargets, 
  MathEngineTargets 
} from "../types.js";
import * as MathUtils from "./math/utils.js";

/**
 * PH2: Immutable context for the MathEngine rule pipeline.
 * All inputs are strict and non-nullable to prevent NaN propagation.
 */
import { MathContext, MathRule } from "./math/types.js";
import { applyPartyWeights } from "./math/rules/applyPartyWeights.js";
import { applyEnvironmentalModifiers } from "./math/rules/applyEnvironmentalModifiers.js";
import { applyResilienceScaling } from "./math/rules/applyResilienceScaling.js";
import { applyActionBudgets } from "./math/rules/applyActionBudgets.js";
import { calculateDprTargets } from "./math/rules/calculateDprTargets.js";
import { calculateHpTargets } from "./math/rules/calculateHpTargets.js";
import { applyNovaProofing } from "./math/rules/applyNovaProofing.js";
import { calculateLethality } from "./math/rules/calculateLethality.js";
import { generateSummaryMessage } from "./math/rules/generateSummaryMessage.js";

export interface MathEngineConfig {
  enableAudit: boolean;
}

export class MathEngine {
  private static config: MathEngineConfig = {
    enableAudit: true
  };

  public static configure(config: Partial<MathEngineConfig>) {
    this.config = { ...this.config, ...config };
    console.log(`[MathEngine] Configured:`, this.config);
  }

  private static readonly ACCURACY_MULTIPLIER = MathUtils.ACCURACY_MULTIPLIER;
  private static readonly NOVA_RISK_THRESHOLD = 2.0;

  static readonly LETHALITY_MIN = MathUtils.LETHALITY_MIN;
  static readonly LETHALITY_MAX = MathUtils.LETHALITY_MAX;

  static validateLethality(dpr: number, hp: number): boolean {
    return MathUtils.validateLethality(dpr, hp);
  }

  static getLethalityErrorMessage(dpr: number, hp: number): string {
    return MathUtils.getLethalityErrorMessage(dpr, hp);
  }

  static validateNovaProof(anchorMinHp: number, novaDpr: number, isBoss: boolean, isFragile: boolean = false): boolean {
    return MathUtils.validateNovaProof(anchorMinHp, novaDpr, isBoss, isFragile);
  }

  static getNovaProofErrorMessage(): string {
    return MathUtils.getNovaProofErrorMessage();
  }

  public static generateTargets(mcd: MasterContextDocument, ppp?: PowerProfile, enableAudit?: boolean): MathEngineTargets {
    const finalAuditFlag = enableAudit ?? this.config.enableAudit;
    const ctx = MathEngine.runPipeline(mcd, ppp, finalAuditFlag);

    return {
      nova_dpr: ctx.novaDpr,
      sustained_dpr: Math.round(ctx.finalSustainedDpr),
      target_anchor_hp_min: ctx.anchorHpMin,
      target_anchor_hp_max: ctx.anchorHpMax,
      target_roster_hp: ctx.finalRosterHp,
      benchmark_lifespan: mcd.premise.target_rounds || 4,
      nova_risk_threshold: MathEngine.NOVA_RISK_THRESHOLD,
      lethality_limit: ctx.finalLethalityLimit,
      target_action_budget: ctx.targetActionBudget,
      reaction_budget: ctx.reactionBudget,
      reactive_multi_act_recommended: ctx.highReactionParty || ctx.reactionBudget > 1,
      exhaustion_risk: ctx.mcd.premise.failure_consequence === "narrative_setback",
      reliability_counters_required: false,
      lethality_curve: ctx.lethalityCurve,
      is_fragile: ctx.isFragile,
      stability_requirement: ctx.masteryOffset,
      resilience_factor: ctx.resilienceFactor,
      resilience_requirement: ctx.resilienceRequirement,
      message: ctx.message
    };
  }

  // --- PH2: INITIALIZATION & PIPELINE ---

  /**
   * Creates a valid baseline context with zeroed derived values.
   */
  private static createInitialContext(mcd: MasterContextDocument, ppp?: PowerProfile): MathContext {
    return {
      mcd,
      ppp: ppp || { nova_potential: "Medium", one_fight_day: false } as any,
      basePartySize: mcd.party?.size || 4,
      allyWeight: 0,
      magicItemWeight: 0,
      classWeight: 0,
      attritionWeight: 0,
      attritionFactor: 1.0,
      powerMultiplier: 1.0,
      
      // Environmental
      environmentalDelta: 0,
      environmentalFactor: 1.0,
      masteryOffset: false,
      resilienceFactor: 0.0,
      resilienceRequirement: false,
      inspirationWeight: 0,
      effectivePartySize: 0,
      targetActionBudget: 0,
      reactionBudget: 0,
      highReactionParty: false,
      avgDpr: 0,
      novaMultiplier: 0,
      novaDpr: 0,
      sustainedDpr: 0,
      targetSurvivalHP: 0,
      ratioHpTarget: 0,
      rosterHp: 0,
      anchorHpMin: 0,
      anchorHpMax: 0,
      anyFragileAnchor: false,
      finalSustainedDpr: 0,
      finalRosterHp: 0,
      finalLethalityLimit: 0,
      lethalityCurve: [],
      isFragile: false,
      message: "",
      hazardDmg: 0,
      minPcHp: 0,
      auditTrace: {}
    };
  }

  /**
   * PH2: PIPELINE EXECUTION
   * Executes the sequence of pure rules to transform the context.
   */
  public static runPipeline(mcd: MasterContextDocument, ppp?: PowerProfile, enableAudit: boolean = true): MathContext {
    const rules: MathRule[] = [
      applyPartyWeights,
      applyEnvironmentalModifiers,
      applyResilienceScaling,
      applyActionBudgets,
      calculateDprTargets,
      calculateHpTargets,
      applyNovaProofing,
      calculateLethality,
      generateSummaryMessage
    ];

    return rules.reduce(
      (ctx, rule) => {
        const nextState = rule(ctx);
        
        // Safe merge for auditTrace to prevent overwriting previous rule logs
        const mergedAudit = { 
          ...(ctx.auditTrace || {}), 
          ...(nextState.auditTrace || {}) 
        };

        const result = { ...ctx, ...nextState };
        
        if (enableAudit) {
          result.auditTrace = mergedAudit;
        } else {
          delete (result as any).auditTrace;
        }
        
        return result;
      },
      MathEngine.createInitialContext(mcd, ppp)
    );
  }

  // --- NEW APPROVED UTILITIES ---

  public static calculateRecommendedActorDPR(hp: number): number {
    return MathUtils.calculateRecommendedActorDPR(hp);
  }

  public static getSurvivalWindow(hp: number, dpr: number): number {
    return MathUtils.getSurvivalWindow(hp, dpr);
  }

  public static getDamageVariance(dpr: number): { reliable: string, volatile: string } {
    return MathUtils.getDamageVariance(dpr);
  }

  public static calculateHazardTargets(partyLevel: number, tier: number | string): HazardTargets {
    return MathUtils.calculateHazardTargets(partyLevel, tier);
  }
}

