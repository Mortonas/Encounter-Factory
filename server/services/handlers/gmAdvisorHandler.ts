import { AIProvider } from "../aiProvider.js";
import { CLASS_REGISTRY, ClassProfile, SubclassProfile } from "../../constants/classRegistry.js";
import {
  GMAdviceRequest,
  GMAdviceReport,
  ZodGMAdviceReportSchema,
  ZodGMAdviceLLMSchema,
  MasterContextDocument,
  PowerProfile
} from "../../types.js";
import { z } from "zod";
import { MathEngine } from "../mathEngine.js";
import * as MathUtils from "../math/utils.js";

// ---------------------------------------------------------------------------
// File-level constants
// ---------------------------------------------------------------------------

/** Canonical tier ranking used by calculateMath. Defined once to avoid
 *  repeated inline object allocations on every forEach iteration. */
const TIER_RANK: Record<string, number> = { "S+": 5, "S": 4, "A": 3, "B": 2, "C": 1 };

// ---------------------------------------------------------------------------
// Zod → Gemini-compatible JSON Schema converter
// ---------------------------------------------------------------------------

/**
 * Recursively converts a Zod schema to a plain JSON Schema object suitable
 * for the Gemini API `responseSchema` field.
 *
 * Handles: ZodObject, ZodArray, ZodString, ZodNumber, ZodInt (via .int()),
 *          ZodBoolean, ZodEnum, ZodOptional, ZodDefault, ZodEffects.
 * Preserves .length() constraints as minItems/maxItems on arrays.
 */
function zodToResponseSchema(schema: z.ZodTypeAny): any {
  const def = (schema as any)._def;
  const typeName: string = def?.typeName ?? "";

  switch (typeName) {
    case "ZodEffects":
    case "ZodTransformer":
      return zodToResponseSchema(def.schema);

    case "ZodOptional":
    case "ZodDefault":
      return zodToResponseSchema(def.innerType);

    case "ZodObject": {
      const shape: Record<string, z.ZodTypeAny> =
        typeof def.shape === "function" ? def.shape() : def.shape;
      const properties: Record<string, any> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToResponseSchema(value);
        const innerTypeName = (value as any)._def?.typeName ?? "";
        if (innerTypeName !== "ZodOptional" && innerTypeName !== "ZodDefault") {
          required.push(key);
        }
      }
      return { type: "object", properties, required };
    }

    case "ZodArray": {
      const item = zodToResponseSchema(def.type ?? def.element);
      const result: any = { type: "array", items: item };
      // Preserve .length() as minItems + maxItems
      const minLen = def.minLength?.value;
      const maxLen = def.maxLength?.value;
      if (minLen != null) result.minItems = minLen;
      if (maxLen != null) result.maxItems = maxLen;
      return result;
    }

    case "ZodString":  return { type: "string" };
    case "ZodBoolean": return { type: "boolean" };
    case "ZodEnum":    return { type: "string", enum: def.values };

    case "ZodNumber": {
      // .int() attaches a ZodNumberCheck with kind "int"
      const isInt = def.checks?.some((c: any) => c.kind === "int");
      return { type: isInt ? "integer" : "number" };
    }

    default:
      return { type: "string" };
  }
}

/**
 * GM ADVICE HANDLER
 * 
 * Standalone service that generates a high-fidelity tactical advice report
 * for the GM covering a 3-level progression block. It uses the "God Method"
 * sharding pattern to inject subclass-specific ground truth and uses strict
 * mathematical formulas to calculate anchor HP floors and Nova thresholds.
 */
export class GMAdviceHandler {
  
  /**
   * Main entry point to generate the report.
   */
  public static async generate(request: GMAdviceRequest): Promise<GMAdviceReport> {
    console.log(`[GM_ADVICE_HANDLER] Starting advice report generation for party of level ${request.startLevel}`);
    
    // 1. Resolve sharded ground-truth profiles from the Class Registry
    const registryContext = this.buildRegistryContext(request.pcs);

    // 2. Compute ALL deterministic values ONCE — the single source of truth injected
    //    into the prompt and hydrated into the final report (Echo Pattern).
    const maths = this.calculateMath(request);
    const threatWindows = this.calculateThreatWindows(request.partySize);
    const adv = this.calculateAdvancedSections(request, maths, threatWindows);
    const deterministic = { maths, threatWindows, adv };

    // 3. Build the exact prompt injecting math rules, 3 levels, and items
    const prompt = this.buildPrompt(request, registryContext, maths) + `\n\n[Nonce: ${Date.now()}-${Math.random().toString(36).substring(2, 9)}]`;

    // 4. Obtain AI instance (using Pro model for systems design)
    const ai = AIProvider.getAI();

    // 5. Generate with self-correcting retry loop, then hydrate deterministic fields
    return await this.generateWithRetry(ai, prompt, deterministic);
  }

  /**
   * Resolves ground-truth profiles from CLASS_REGISTRY for the party's builds.
   */
  private static buildRegistryContext(pcs: GMAdviceRequest["pcs"]): string {
    let contextStr = "GROUND-TRUTH CLASS AND SUBCLASS REGISTRY PROFILES:\n";
    
    pcs.forEach((pc) => {
      const cls = this.findClassProfile(pc.className);
      if (!cls) {
        contextStr += `- PC ${pc.name} uses an Unregistered/Homebrew class: "${pc.className}". (Fallback: analyze using standard D&D 2024 baselines; note as warning).\n`;
        return;
      }
      
      contextStr += `\nClass: ${cls.name}\n- Base Tier: ${cls.baseTier}\n`;
      if (cls.baseFeatures?.length) {
        contextStr += `- Base Features: ${cls.baseFeatures.join("; ")}\n`;
      }
      if (cls.baseWeaknesses?.length) {
        contextStr += `- Base Weaknesses: ${cls.baseWeaknesses.join("; ")}\n`;
      }
      
      if (pc.subclass) {
        const sub = this.findSubclass(cls, pc.subclass);
        if (sub) {
          contextStr += `- Subclass: ${sub.name}\n- forceMultiplierTier: ${sub.forceMultiplierTier}\n`;
          if (sub.keyFeatures?.length) {
            contextStr += `- Key Features: ${sub.keyFeatures.join("; ")}\n`;
          }
          if (sub.tacticalWeaknesses?.length) {
            contextStr += `- Tactical Weaknesses:\n`;
            sub.tacticalWeaknesses.forEach(tw => {
              contextStr += `  * ${tw.weakness} -> GM Counterplay: ${tw.gmCounterplay}\n`;
            });
          }
          if (sub.novaTriggers?.length) {
            contextStr += `- Nova Triggers: ${sub.novaTriggers.join("; ")}\n`;
          }
          if (sub.synergyFlags?.length) {
            contextStr += `- Synergy Flags: ${sub.synergyFlags.join("; ")}\n`;
          }
          if (sub.versionConflict) {
            contextStr += `- Version Conflict (2014 vs 2024): ${sub.versionConflict}\n`;
          }
          if (sub.novaEstimates?.length) {
            contextStr += `- Nova Estimates (Dpr/HP benchmarks):\n`;
            sub.novaEstimates.forEach(ne => {
              contextStr += `  * Level ${ne.level}: Round 1 Max Damage: ${ne.roundOneMaxDamage}, Sustained: ${ne.sustainedDPR}, Anchor HP Floor: ${ne.anchorHPFloor}\n`;
            });
          }
          if (sub.magicItemPrescriptions?.length) {
            contextStr += `- Magic Item Prescriptions:\n`;
            sub.magicItemPrescriptions.forEach(mip => {
              contextStr += `  * ${mip.item_name} -> Benefit: ${mip.benefit} (Ref: ${mip.rule_reference})\n`;
            });
          }
          if (sub.itemsToAvoid?.length) {
            contextStr += `- Items to Avoid:\n`;
            sub.itemsToAvoid.forEach(ita => {
              contextStr += `  * ${ita.item_name} -> Warning: ${ita.warning}\n`;
            });
          }
        } else {
          contextStr += `- Subclass: "${pc.subclass}"\n`;
        }
      }
    });
    
    return contextStr;
  }

  /**
   * Resolves a class profile case-insensitively from CLASS_REGISTRY.
   */
  private static findClassProfile(className: string): ClassProfile | undefined {
    if (!className) return undefined;
    const key = Object.keys(CLASS_REGISTRY).find(
      k => k.toLowerCase() === className.toLowerCase().trim()
    );
    return key ? CLASS_REGISTRY[key] : undefined;
  }

  /**
   * Resolves a subclass profile with fuzzy/normalization matching support
   * for both short and qualified user-supplied labels.
   */
  private static findSubclass(cls: ClassProfile, input: string): SubclassProfile | undefined {
    if (!input) return undefined;
    
    const cleanInput = input.trim().toLowerCase();
    
    // 1. Exact or case-insensitive match
    for (const key of Object.keys(cls.subclasses)) {
      if (key.toLowerCase() === cleanInput) {
        return cls.subclasses[key];
      }
    }
    
    // 2. Fuzzy substring match / normalized comparison
    for (const key of Object.keys(cls.subclasses)) {
      const cleanKey = key.toLowerCase();
      
      const normalizedKey = cleanKey
        .replace(/^(path of the|path of|college of|circle of the|circle of|oath of the|oath of|warrior of the|warrior of|way of the|way of)\s+/g, "")
        .replace(/\s+(domain|savant|patron)$/g, "");
      
      const normalizedInput = cleanInput
        .replace(/^(path of the|path of|college of|circle of the|circle of|oath of the|oath of|warrior of the|warrior of|way of the|way of)\s+/g, "")
        .replace(/\s+(domain|savant|patron)$/g, "");

      if (
        normalizedKey === normalizedInput ||
        normalizedKey.includes(normalizedInput) ||
        normalizedInput.includes(normalizedKey)
      ) {
        return cls.subclasses[key];
      }
    }
    
    return undefined;
  }

  private static calculateMath(request: GMAdviceRequest) {
    const L = request.startLevel;

    let hasSTier = false;
    let highestNovaTier: "S+" | "S" | "A" | "B" | "C" = "C";

    for (const pc of request.pcs) {
      const cls = this.findClassProfile(pc.className);
      if (!cls) continue;

      const classTier = cls.baseTier as string;
      if (classTier === "S" || classTier === "S+") hasSTier = true;
      if (TIER_RANK[classTier] > TIER_RANK[highestNovaTier]) {
        highestNovaTier = cls.baseTier as typeof highestNovaTier;
      }

      if (pc.subclass) {
        const sub = this.findSubclass(cls, pc.subclass);
        if (sub) {
          const forceTier = sub.forceMultiplierTier as string;
          if (forceTier === "S" || forceTier === "S+") hasSTier = true;
          if (TIER_RANK[forceTier] > TIER_RANK[highestNovaTier]) {
            highestNovaTier = sub.forceMultiplierTier;
          }
        }
      }
    }

    const isHighNova = highestNovaTier === "S" || highestNovaTier === "S+";
    const isMediumNova = highestNovaTier === "A" || highestNovaTier === "B";
    const novaPotential = isHighNova ? "High" : (isMediumNova ? "Medium" : "Low");
    const standardHp = MathUtils.estimateStandardPcHp(L);
    const avgHpPool = request.partySize * standardHp;

    const mockMcd = {
      party: {
        size: request.partySize,
        avg_level: L,
        tier: Math.max(1, Math.min(4, Math.floor((L - 1) / 4) + 1)),
        avg_hp_pool: avgHpPool,
        avg_ac: 15,
        avg_dpr: 0,
        pcs: request.pcs.map(pc => {
          const cls = this.findClassProfile(pc.className);
          const sub = pc.subclass && cls ? this.findSubclass(cls, pc.subclass) : undefined;
          
          const majorItems = (pc.currentMagicItems || []).filter(item => {
            const lower = item.toLowerCase();
            // check standard offensive items
            if (lower.includes("flametongue") ||
                lower.includes("wand of fireballs") ||
                lower.includes("staff of fire") ||
                lower.includes("oathbow") ||
                lower.includes("belt of") ||
                lower.includes("giant strength")) {
              return true;
            }
            // check subclass-specific items to avoid
            if (sub?.itemsToAvoid) {
              const matchesAvoid = sub.itemsToAvoid.some(ita => {
                const itaName = ita.item_name.toLowerCase().trim();
                return lower.includes(itaName) || itaName.includes(lower);
              });
              if (matchesAvoid) return true;
            }
            return false;
          }).length;

          return {
            name: pc.name,
            className: pc.className,
            level: L,
            major_magic_items_count: majorItems,
            hp: standardHp,
            ac: 15,
            dpr: MathUtils.estimateAvgDpr(L, false),
            role: "Unknown",
            reaction_density: "low",
            magic_item_impact: "standard"
          };
        }),
        allies: [],
        classes: request.pcs.map(pc => pc.className),
        strengths: [],
        vulnerabilities: [],
        high_threat_pcs: [],
        weapon_masteries: [],
        resource_state: "Fresh",
        rest_frequency: "Short Rest",
        requested_enemies: [],
        roleplay_hooks: [],
        is_dpr_estimated: true,
        is_ac_estimated: true,
        is_hp_estimated: true,
        high_reaction_density: false
      },
      premise: {
        setting: "Generic",
        tone: request.tone || "Heroic",
        slot: "",
        gm_requirements: "",
        time_constraint: "",
        one_fight_day: false,
        encounter_structure: "Boss",
        is_boss_fight: true,
        target_experience: "Heroic",
        party_archetype: "Balanced Group",
        pipeline_mode: "Precision",
        encounter_count: 1,
        monster_faction_request: "",
        lore_notes: "",
        gm_rant: "",
        allow_extra_minions: true,
        combat_style: "Standard Brawl",
        win_condition: "",
        failure_consequence: "narrative_setback",
        target_rounds: 4,
        licensing_mode: "None",
        export_priority: "Standard",
        inspiration_velocity: "low",
        primary_material: "Stone",
        toy_list: []
      },
      parameters: {
        target_difficulty: request.targetDifficulty || "Medium",
        pc_objective: "Defeat the enemies",
        social_out_required: false,
        social_out_context: "",
        mythic_encounter: false,
        entry_condition: "fresh",
        entry_context: "",
        target_outcome: "heavy_tax",
        exit_context: "",
        let_dice_fall: false,
        tone_guardrails: []
      },
      flags: {
        known_conflicts: [],
        suggested_resolutions: [],
        missing_information: []
      }
    } as any as MasterContextDocument;

    const mockPpp = {
      tier_classification: highestNovaTier === "S+" ? "S" : highestNovaTier,
      nova_potential: novaPotential,
      one_fight_day_flags: {
        active: false,
        phase_count_required: 1,
        mandatory_initiative_expertise: false,
        concentration_break_required: false,
        xp_budget_modifier: 1.0
      }
    } as any as PowerProfile;

    const targets = MathEngine.generateTargets(mockMcd, mockPpp, false);

    return {
      level: L,
      minDpr: targets.sustained_dpr,
      maxDpr: targets.nova_dpr,
      anchorHpFloor: targets.target_anchor_hp_min
    };
  }

  private static getPacingInstructions(partySize: number): string {
    if (partySize <= 2) {
      return `PARTY SIZE BRACKET: Micro Party (1-2 PCs)
PACING FOCUS:
- Focus pacing on tactical movement, high-mobility skirmishing, and dynamic cover.
- Ensure solo anchors feature action-denial mitigation traits like '[ GAMMA ] Kinetic Redirection' or redirection shunts to prevent action-denial lockouts from ruining the small party's turn economy.
- Budget allocations are scaled down for safety, and minions should be kept fragile.`;
    } else if (partySize >= 6) {
      return `PARTY SIZE BRACKET: Horde Party (6+ PCs)
PACING FOCUS:
- Mandate 'Phased Waves' where the total encounter difficulty budget is divided into multi-stage drop-ins (e.g. Wave 1 front-line guard, Wave 2 main boss/flankers).
- This prevents players from overwhelming the battlefield layout and locking down the boss immediately via action economy superiority.`;
    } else {
      return `PARTY SIZE BRACKET: Standard Party (3-5 PCs)
PACING FOCUS:
- Deploy baseline Dynamic Budget Allocations (80/20 Mastermind, 50/30/20 Tyrant & Court, 33/33/33 Bound Coven) exactly as currently structured to maintain classic action-economy balance.`;
    }
  }

  private static calculateThreatWindows(partySize: number) {
    if (partySize <= 2) {
      return {
        encounters_before_short_rest: 1,
        encounters_before_long_rest: 3,
        rest_economy_rationale: "Small party size lacks class redundancies; permit frequent short rests after single minor encounters to prevent total resource exhaustion."
      };
    } else if (partySize >= 6) {
      return {
        encounters_before_short_rest: 3,
        encounters_before_long_rest: 7,
        rest_economy_rationale: "Large, high-redundancy group has substantial combined resource pools; restrict rests to 3 minor encounters before short rests to maintain tension."
      };
    } else {
      return {
        encounters_before_short_rest: 2,
        encounters_before_long_rest: 5,
        rest_economy_rationale: "Standard party configuration supports the baseline resting cycle of 2 encounters per short rest and 5 per long rest."
      };
    }
  }

  private static calculateAdvancedSections(
    request: GMAdviceRequest,
    maths: ReturnType<typeof GMAdviceHandler.calculateMath>,
    threatWindows: ReturnType<typeof GMAdviceHandler.calculateThreatWindows>
  ) {
    const CR_SAVE_TIERS = [
      { label: "CR 1–4",   minLevel: 1,  maxLevel: 4,  avgSaveBonus: 2 },
      { label: "CR 5–10",  minLevel: 5,  maxLevel: 10, avgSaveBonus: 4 },
      { label: "CR 11–16", minLevel: 11, maxLevel: 16, avgSaveBonus: 5 },
      { label: "CR 17+",   minLevel: 17, maxLevel: 20, avgSaveBonus: 7 },
    ];

    const getTierForLevel = (level: number) =>
      CR_SAVE_TIERS.find(t => level <= t.maxLevel) ?? CR_SAVE_TIERS[CR_SAVE_TIERS.length - 1];

    // --- 1. MECHANICAL THRESHOLD ---
    const tier = getTierForLevel(maths.level);
    const required_dc_for_50pct = Math.ceil(tier.avgSaveBonus + 10.5);
    const dprPerPc = maths.minDpr / request.partySize;
    const threshold_crossover = dprPerPc > (tier.avgSaveBonus * 4);
    const mechanical_threshold = {
      level: maths.level,
      party_sustained_dpr: maths.minDpr,
      dominant_cr_tier: tier.label,
      monster_avg_save_bonus: tier.avgSaveBonus,
      required_dc_for_50pct,
      threshold_crossover
    };

    // --- 2. NOVA-RECOIL ENGINE ---
    const triggerModifier = request.partySize <= 2 ? 0.4 : 0.6;
    const triggerPct = Math.round(triggerModifier * 100);
    const novaThreshold = Math.round(maths.anchorHpFloor * triggerModifier);
    const secondaryWaveViable = maths.maxDpr > novaThreshold;
    const nova_recoil_engine = {
      level: maths.level,
      post_nova_sustained_dpr: maths.minDpr,
      nova_threshold: novaThreshold,
      secondary_wave_trigger: secondaryWaveViable
        ? `Secondary wave triggers if party deals >${novaThreshold} damage in Round 1 (${triggerPct}% of ${maths.anchorHpFloor} HP floor at Level ${maths.level}).`
        : `Secondary wave suppressed at Level ${maths.level}; nova output (${maths.maxDpr}) does not exceed ${triggerPct}% threshold (${novaThreshold} HP).`,
      resource_depletion_note: `Estimated Round 1 cost at Level ${maths.level}: 1 burst slot (e.g., Fireball or highest-available nova ability) + potential Bonus Action.`
    };

    // --- 3. REST-ECONOMY THROTTLE ---
    const slotDrainPct =
      request.partySize <= 2 ? 30 :
      request.partySize >= 6 ? 15 : 20;

    const rest_economy_throttle = {
      level: maths.level,
      slot_drain_per_encounter_pct: slotDrainPct,
      encounters_to_short_rest: threatWindows.encounters_before_short_rest,
      encounters_to_long_rest: threatWindows.encounters_before_long_rest
    };

    // --- 4. ATTRITION WAVE SCALES ---
    const wavesRequired = Math.ceil(100 / slotDrainPct);
    const waveHpBudget = Math.round(maths.anchorHpFloor * 0.25);
    const abilityDrainNote =
      `After ${Math.ceil(wavesRequired * 0.4)} attrition waves, high-tier nova abilities (e.g., Action Surge, top-tier spell slots) are depleted by ~40%, permanently suppressing Round 1 burst potential.`;

    const attrition_wave_scales = {
      waves_to_force_long_rest: wavesRequired,
      wave_hp_budget: waveHpBudget,
      ability_drain_threshold_note: abilityDrainNote
    };

    // --- 5. PARTY TACTICAL FOOTPRINT EVALUATOR ---
    let blastingCount = 0;
    let meleeCount = 0;
    let totalCasters = 0;

    request.pcs.forEach(pc => {
      const cls = pc.className.toLowerCase();
      
      const isBlaster = ["wizard", "sorcerer", "druid"].some(c => cls.includes(c));
      const isMelee = ["fighter", "barbarian", "rogue"].some(c => cls.includes(c));
      const isCaster = ["wizard", "sorcerer", "druid", "cleric", "bard", "warlock"].some(c => cls.includes(c));

      if (isBlaster) blastingCount++;
      if (isMelee) meleeCount++;
      if (isCaster) totalCasters++;
    });

    let party_tactical_footprint = "Hybrid";
    if (blastingCount > meleeCount || totalCasters >= 3) {
      party_tactical_footprint = "Blasting/AoE";
    } else if (meleeCount > blastingCount) {
      party_tactical_footprint = "Melee/Multi-Attack";
    }

    return { mechanical_threshold, nova_recoil_engine, rest_economy_throttle, attrition_wave_scales, party_tactical_footprint };
  }

  private static buildPrompt(
    request: GMAdviceRequest,
    registryContext: string,
    maths: ReturnType<typeof GMAdviceHandler.calculateMath>
  ): string {
    const startL = request.startLevel;

    // Core math is computed once in generate() and passed in (single source of truth).
    // The deterministic telemetry sections (threat_windows, mechanical_threshold,
    // nova_recoil_engine, rest_economy_throttle, attrition_wave_scales) are hydrated
    // downstream and are therefore no longer described in the prompt or template.
    const pacingInstructions = this.getPacingInstructions(request.partySize);

    // Programmatic Magic Item Auditor
    const magicItemWarnings: string[] = [];
    request.pcs.forEach(pc => {
      const cls = this.findClassProfile(pc.className);
      if (!cls || !pc.subclass) return;
      const sub = this.findSubclass(cls, pc.subclass);
      if (!sub || !sub.itemsToAvoid) return;

      (pc.currentMagicItems || []).forEach(equipped => {
        const match = sub.itemsToAvoid.find(ita => {
          const itaName = ita.item_name.toLowerCase().trim();
          const eqName = equipped.toLowerCase().trim();
          return eqName.includes(itaName) || itaName.includes(eqName);
        });

        if (match) {
          magicItemWarnings.push(
            `PC "${pc.name}" (${pc.className} - ${sub.name}) has equipped restricted item "${equipped}". Warning: ${match.warning}`
          );
        }
      });
    });

    let auditPromptSection = "";
    if (magicItemWarnings.length > 0) {
      auditPromptSection = `\n=== PROGRAMMATIC MAGIC ITEM AUDIT WARNINGS (CRITICAL LETHALITY RISKS) ===\n` +
        `The programmatic auditor detected the following item violations in the active party roster. You MUST address these in the generated report:\n` +
        magicItemWarnings.map(w => `- ${w}`).join("\n") +
        `\n- Instructions: Highlight these specific high-risk items in the 'party_vulnerability_profile.collective_weaknesses' (as a bullet) and in each affected PC's 'current_item_impact' or 'items_to_avoid' warnings. You must explicitly state why these items break party level balance.\n`;
    }

    return `You are a Senior TTRPG Systems Designer specializing in D&D 5.5e (2024 Revision).
Generate a comprehensive GM Advice Report for a party of ${request.partySize} players at Level ${startL} focusing on a single-level mechanical sandbox.

${registryContext}

=== GM REQUEST DETAILS ===
- Level: ${startL}
- Party Size: ${request.partySize}
- Target Difficulty: ${request.targetDifficulty}
- Tone: ${request.tone}
- Player Characters:
${request.pcs.map(pc => `  * Name: ${pc.name} | Class: ${pc.className} | Subclass: ${pc.subclass || "None"} | Current Magic Items: ${(pc.currentMagicItems || []).join(", ") || "None"}`).join("\n")}

=== DYNAMIC ACTION-DENSITY PACING INSTRUCTIONS ===
You MUST adhere to these custom pacing guidelines tailored to the party's size bracket:
${pacingInstructions}
${auditPromptSection}
=== TACTICAL COMBAT BREAKDOWN & PRESSURE TACTICS ===
- You must map PC characters to distinct tactical role assignments (e.g. 'Primary Damage Dealer', 'Control Anchor', 'Support Buffer').
- Provide exactly 1 tactical combat breakdown, including 'role_assignments' and an 'action_economy_verdict'.
- For each role assignment, include a list of 'pressure_tactics' (minimum 2) showing how the GM can tactically stress that role (e.g. split focus, target saving throw gaps, utilize difficult terrain/positional denial).

=== ENEMY TACTICAL COUNTERS ===
Instead of generic reaction traits, you MUST generate an uncapped array of 'enemy_tactical_counters' targeted specifically at individual players.
- For each counter, include 'type' (e.g. 'Action Denial Counter', 'AoE Suppression', 'Concentration Disruption', 'Mobility Lockdown').
- Include a mechanical description 'mechanic_description' detailing a concrete D&D 2024 rule text trait, hazard, or reaction (e.g. 'Reaction to gain resistance', 'Forced movement to break adjacency', 'Saving throw re-roll against charm/frightened').
- NO CINEMATIC FLAVOR TEXT or narrative fluff. Mechanics only.
- In 'targeted_players', list the exact names of the PCs this counter is designed to challenge (must match the names from the GM Request Details).

=== PRE-CALCULATED MATHEMATICAL TRUTHS (INPUTS FOR YOUR STAT-BLOCK MATH — DO NOT EMIT AS FIELDS) ===
Use these calculated values ONLY as inputs when computing your 'budget_allocations' CR/HP stat-block translations (the Anchor HP Floor is "Z"):
- Party Sustained DPR (min) = ${maths.minDpr}, Party Nova DPR (max) = ${maths.maxDpr}, Anchor HP Floor (Z) = ${maths.anchorHpFloor}, Level = ${maths.level}
- DO NOT output 'level', 'dpr_bounds', or 'anchor_hp_floor' as JSON fields. They are injected deterministically downstream and must be omitted from your response.

=== CORE MATHEMATICAL ENGINE RULES ===
These values are computed by the Encounter Factory MathEngine using:
1. Party Sustained DPR = avg_dpr * effective_party_size
2. Party Nova DPR = Party Sustained DPR * Nova Multiplier (High = 3.0, Medium = 2.0, Low = 1.5)
3. Anchor HP Floor = Party Nova DPR + (Party Sustained DPR * 2) (enforcing 3-round survival of the party's Nova burst).

=== INSTRUCTIONS FOR OUTPUT SECTIONS ===
- "party_vulnerability_profile": Analyze the collective strengths and vulnerabilities of this group. Factor in existing magic items.
- "tactical_combat_breakdown": Assign players to broad roles and describe pressure tactics (minimum 2 tactics per role assignment). Write a verdict on their action economy strength.
- "pacing_sandbox": Produce the sandbox entry for Level ${startL}. Do NOT include "level", "dpr_bounds", or "anchor_hp_floor" — these are injected downstream.
  * For the level entry, you MUST include 'budget_allocations' containing 3 standard archetypes:
    1. 'The Mastermind (Solo/Anchor)': 80% Anchor Boss (HP/Saves), 20% Environmental Hazards or Lair Triggers.
    2. 'The Tyrant & Court': 50% Anchor Boss, 30% Elite Bodyguards, 20% Minion Swarms.
    3. 'The Bound Coven (Split Focus)': Three equal 33.3% Mid-Tier Brutes sharing a defensive pool.
    - Each archetype must include a Unicode-shaded horizontal progress bar visual representation of exactly 10 characters using block characters, e.g. '[████████░░]'.
    - Translate the percentages to concrete, level-appropriate CR and quantity translations. You MUST calculate creature HP exactly according to these rules relative to the level's Anchor HP Floor (Z):
      * Boss HP = Z * Boss Budget % (e.g. 50% Boss = Z * 0.5).
      * Elite HP = Z * (Elite Budget % / Number of Elites) (e.g. 30% Elite total budget with 2 Elites = Z * 0.15 per Elite).
      * Minion HP = Z * 0.05 (fixed at 5% of the floor per Minion).
    - Format the output text in 'translation_stat_block' explicitly as: '1x CR X Anchor (HP) [Y% of Z Floor]'.
- "player_specific_ledger": Break down each PC. Identify subclass, tactical interaction guidance, and biggest weakness.
  * For "magic_item_prescriptions", recommend exactly items from the subclass's 'Magic Item Prescriptions' list provided in the registry context.
  * For "items_to_avoid", list and warn against items from the subclass's 'Items to Avoid' list provided in the registry context.
- "current_item_impact": Detail how their existing items affect balance.
- "magic_item_prescriptions": Recommend exactly 2 original generic rewards or items traceable to SRD 5.2.1; avoid unverified book content and major damage or mobility spikes.
- "items_to_avoid": Detail exactly 1 item that would break balance (no cinematic flavor).
- NOTE: threat_windows, mechanical_threshold, nova_recoil_engine, rest_economy_throttle, and attrition_wave_scales are computed deterministically and injected downstream — do NOT emit them.

=== HIGH-FIDELITY SYSTEMS DESIGN GUIDELINES (CONCISE & MECHANICAL) ===
- Every single text string/description in the JSON MUST be exactly ONE sentence of maximum 10-15 words.
- Deliver rules-rich, mechanical descriptions citing D&D 2024 mechanics.
- Do NOT include any narrative flavor or cinematic description strings anywhere in the report.

TEMPLATE: You MUST respond with ONLY the raw JSON object. Do NOT include any preamble, reasoning, thoughts, comments, markdown formatting, or backticks. Start your response directly with the opening brace '{' and end it with the closing brace '}':
{
  "party_vulnerability_profile": {
    "collective_weaknesses": ["Weakness 1"],
    "nova_ceiling_outlook": "Outlook summary"
  },
  "tactical_combat_breakdown": {
    "role_assignments": [
      {
        "role_label": "Primary Damage Dealer",
        "pc_names": ["Valen"],
        "pressure_tactics": ["Tactic 1", "Tactic 2"]
      }
    ],
    "action_economy_verdict": "Verdict on action economy strength."
  },
  "pacing_sandbox": {
    "tactical_guidelines": ["Guideline 1"],
    "environmental_recommendations": ["Rec 1"],
    "budget_allocations": [
      {
        "archetype_name": "The Mastermind (Solo/Anchor)",
        "description": "Solo boss description",
        "allocation_bar_visual": "[████████░░]",
        "segment_breakdown": [
          { "role": "Anchor Boss", "percentage": 80, "translation_stat_block": "1x CR 5 Anchor (${maths.anchorHpFloor} HP) [80% of ${maths.anchorHpFloor} Floor]" }
        ]
      }
    ],
    "enemy_tactical_counters": [
      {
        "type": "Action Denial Counter",
        "mechanic_description": "When targeted by a spell requiring a DEX save, the creature can use its reaction to halve damage and move 5 feet without provoking opportunity attacks.",
        "targeted_players": ["Valen"]
      }
    ]
  },
  "player_specific_ledger": [
    {
      "pc_name": "Valen",
      "class_subclass": "Fighter (Battle Master)",
      "key_feature_interaction": "How to challenge maneuvers.",
      "biggest_weakness": "WIS saves.",
      "current_item_impact": "None.",
      "magic_item_prescriptions": [
        { "item_name": "Protective token", "benefit": "Provides a small defensive benefit defined by the GM.", "rule_reference": "Original generic material" }
      ],
      "items_to_avoid": [
        { "item_name": "Flametongue", "warning": "Spikes Nova DPR." }
      ]
    }
  ]
}`;
  }

  /**
   * Executes AI generation with standard retry loop for Zod validation errors.
   */
  private static async generateWithRetry(
    ai: any,
    prompt: string,
    deterministic: {
      maths: ReturnType<typeof GMAdviceHandler.calculateMath>;
      threatWindows: ReturnType<typeof GMAdviceHandler.calculateThreatWindows>;
      adv: ReturnType<typeof GMAdviceHandler.calculateAdvancedSections>;
    }
  ): Promise<GMAdviceReport> {
    const { maths, threatWindows, adv } = deterministic;
    let attempts = 0;
    let lastError = "";
    let temperature = 0;

    // The model fills the NARROW schema (core math fields omitted); those are
    // hydrated from `maths` after parsing.
    const schemaFields = zodToResponseSchema(ZodGMAdviceLLMSchema);
    delete (schemaFields as any).properties?.chain_of_thought_scratchpad;

    while (attempts < 3) {
      attempts++;
      try {
        const feedback = lastError
          ? `\n\n<system_feedback>\nCRITICAL: The previous attempt failed validation with the following Zod error:\n${lastError}\nYou MUST fix this in your JSON response.\n</system_feedback>`
          : "";

        const result = await ai.models.generateContent({
          contents: [{
            role: "user",
            parts: [{ text: prompt + feedback }]
          }],
          config: {
            responseMimeType: "application/json",
            responseSchema: schemaFields,
            temperature: temperature,
            maxOutputTokens: 8000
          }
        });

        const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || result.text || "";
        if (!rawText) throw new Error("Empty response from Gemini.");
        
        const cleanedText = this.cleanJson(rawText);
        const parsed = JSON.parse(cleanedText);

        // Validate the model's narrow output, then hydrate the deterministic core
        // math fields and re-validate the merged object against the full schema.
        const llmParsed = ZodGMAdviceLLMSchema.parse(parsed);

        const merged = {
          ...llmParsed,
          pacing_sandbox: {
            ...llmParsed.pacing_sandbox,
            level: maths.level,
            dpr_bounds: { min: maths.minDpr, max: maths.maxDpr },
            anchor_hp_floor: maths.anchorHpFloor
          },
          threat_windows: threatWindows,
          mechanical_threshold: adv.mechanical_threshold,
          nova_recoil_engine: adv.nova_recoil_engine,
          rest_economy_throttle: adv.rest_economy_throttle,
          attrition_wave_scales: adv.attrition_wave_scales
        };

        const validated = ZodGMAdviceReportSchema.parse(merged);

        return validated;
      } catch (err: any) {
        lastError = err.message;
        console.warn(`[GMAdviceHandler] Attempt ${attempts} failed validation:`, lastError);
        
        if (attempts >= 3) {
          throw new Error(`Failed to generate a valid Advice Report after 3 attempts. Last error: ${lastError}`);
        }

        temperature = Math.min(1.0, temperature + 0.1);
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts - 1)));
      }
    }

    throw new Error("Maximum attempts reached.");
  }

  /**
   * Cleans JSON blocks and removes markdown ticks/comments.
   */
  private static cleanJson(rawText: string): string {
    let json = rawText;
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const match = rawText.match(codeBlockRegex);
    
    if (match) {
      json = match[1].trim();
    } else {
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        json = rawText.substring(firstBrace, lastBrace + 1).trim();
      } else {
        json = rawText.trim();
      }
    }

    return json
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,\s*([\]}])/g, '$1')
      .trim();
  }
}
