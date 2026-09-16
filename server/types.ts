import { Schema, Type } from "@google/genai";
import { z } from "zod";
import { validateLethality, getLethalityErrorMessage, validateNovaProof, getNovaProofErrorMessage } from "./services/math/utils.js";

export enum PipelineStep {
  BOT_0_BRIEFING = "BOT_0_BRIEFING",
  BOT_6_PROFILER = "BOT_6_PROFILER",
  BOT_4_BALANCE = "BOT_4_BALANCE",
  BOT_2_CARTOGRAPHER = "BOT_2_CARTOGRAPHER",
  BOT_3_MECHANIST = "BOT_3_MECHANIST",
  BOT_1_NARRATIVE = "BOT_1_NARRATIVE",
  BOT_5_AUDITOR = "BOT_5_AUDITOR",
  BOT_9_SUMMARIST = "BOT_9_SUMMARIST",
  BOT_8_PUBLISHER = "BOT_8_PUBLISHER",
  BOT_10_STYLIST = "BOT_10_STYLIST"
}

export type Difficulty = "Easy" | "Medium" | "Hard" | "Deadly" | "Mythic";

export interface NPCAlly {
  id: string;
  name: string;
  type: "General" | "Specific";
  description: string;
  role: "Frontline" | "Support" | "Striker" | "Cannon Fodder" | "None" | "I don't know";
  quantity: number;
  isIndependent: boolean;
  dismissOrganically: boolean;
  stats?: string;
  generalContext?: string;
}

export interface PCProfile {
  id: string;
  name: string;
  className: string;
  level: number;
  weaponMasteries: string;
  hook?: string;
  subclass?: string;
  hp?: { current: number; max: number };
  stats?: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  powerMoves?: string;
  magicItems?: string;
  burstPotential?: "low" | "standard" | "high"; // Tiers for Kill Clock math
  reactionDensity?: "low" | "high"; // 5.5e Reaction Audit
  magicItemImpact?: "standard" | "bypass" | "dpr_shift"; 
  majorMagicItemsCount?: number; // EPL driver: increments effectivePartySize by 0.25-0.5 per item
  role?: "Frontline" | "Support" | "Striker" | "Healer" | "Controller" | "None" | "I don't know";
  generalContext?: string;
}

export interface Enemy {
  id: string;
  name: string;
  type: "Minion" | "Elite" | "Boss" | "Legendary";
  description: string;
  quantity: number;
  isStatLocked: boolean;
  isFragile: boolean;
  stats?: string;
  generalContext?: string;
}

export interface GMSetup {
  sessionName: string;
  setting: string;
  tone: string;
  targetExperience: "Gritty" | "Heroic" | "Gonzo"; // Determines asymmetric lethality ratios
  partyArchetype: "Glass Cannon Strikers" | "Control-Heavy Mages" | "Unkillable Tanks" | "Balanced Group" | "I don't know";
  difficulty: Difficulty;
  encounterStructure: "Skirmish" | "Wave" | "Siege" | "Boss" | "Puzzle";
  objective: string;
  oneFightDay: boolean;
  pcs: PCProfile[];
  allies: NPCAlly[];
  enemies: Enemy[];
  gmOverrides?: string;
  gmNotes?: string;
  gmConcerns?: string;
  socialOut: boolean;
  socialOutContext?: string;
  targetRounds: number;
  encounterCount: number;
  entryCondition: "fresh" | "winded" | "depleted";
  entryContext?: string;
  targetOutcome: "safe_victory" | "heavy_tax" | "brink_of_defeat";
  exitContext?: string;
  letDiceFall: boolean;
  contactInfo?: string;
  loreNotes?: string;
  gmRant?: string;
  allowExtraMinions: boolean;
  combatStyle: "Standard Brawl" | "Alternative Objective";
  winCondition?: string;
  failureConsequence: "narrative_setback" | "tpk_risk";
  inspirationVelocity: "low" | "high";
  toyList: string[];
  primaryMaterial: "Stone" | "Wood" | "Flesh" | "Ice" | "Metal" | "Magic" | "Water";
  licensingMode: "CC-BY-4.0" | "ORC" | "None";
  exportPriority: "Standard" | "VTT-First" | "Phone-Optimized";
}

export const ZodOwnerIdSchema = z.string().trim().min(1).max(200);

export const ZodPCProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  className: z.string().min(1),
  level: z.number().int().min(1).max(20),
  weaponMasteries: z.string(),
  hook: z.string().optional(),
  subclass: z.string().optional(),
  hp: z.object({
    current: z.number().int().min(0),
    max: z.number().int().min(1)
  }).strict().optional(),
  stats: z.object({
    str: z.number().int().min(1).max(30),
    dex: z.number().int().min(1).max(30),
    con: z.number().int().min(1).max(30),
    int: z.number().int().min(1).max(30),
    wis: z.number().int().min(1).max(30),
    cha: z.number().int().min(1).max(30)
  }).strict().optional(),
  powerMoves: z.string().optional(),
  magicItems: z.string().optional(),
  burstPotential: z.enum(["low", "standard", "high"]).optional(),
  reactionDensity: z.enum(["low", "high"]).optional(),
  magicItemImpact: z.enum(["standard", "bypass", "dpr_shift"]).optional(),
  majorMagicItemsCount: z.number().int().min(0).optional(),
  role: z.enum(["Frontline", "Support", "Striker", "Healer", "Controller", "None", "I don't know"]).optional(),
  generalContext: z.string().optional()
}).strict();

export const ZodNPCAllySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["General", "Specific"]),
  description: z.string(),
  role: z.enum(["Frontline", "Support", "Striker", "Cannon Fodder", "None", "I don't know"]),
  quantity: z.number().int().min(1),
  isIndependent: z.boolean(),
  dismissOrganically: z.boolean(),
  stats: z.string().optional(),
  generalContext: z.string().optional()
}).strict();

export const ZodEnemySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["Minion", "Elite", "Boss", "Legendary"]),
  description: z.string(),
  quantity: z.number().int().min(1),
  isStatLocked: z.boolean(),
  isFragile: z.boolean(),
  stats: z.string().optional(),
  generalContext: z.string().optional()
}).strict();

export const ZodGMSetupSchema = z.object({
  sessionName: z.string(),
  setting: z.string(),
  tone: z.string(),
  targetExperience: z.enum(["Gritty", "Heroic", "Gonzo"]),
  partyArchetype: z.enum(["Glass Cannon Strikers", "Control-Heavy Mages", "Unkillable Tanks", "Balanced Group", "I don't know"]),
  difficulty: z.enum(["Easy", "Medium", "Hard", "Deadly", "Mythic"]),
  encounterStructure: z.enum(["Skirmish", "Wave", "Siege", "Boss", "Puzzle"]),
  objective: z.string(),
  oneFightDay: z.boolean(),
  pcs: z.array(ZodPCProfileSchema).min(1),
  allies: z.array(ZodNPCAllySchema),
  enemies: z.array(ZodEnemySchema),
  gmOverrides: z.string().optional(),
  gmNotes: z.string().optional(),
  gmConcerns: z.string().optional(),
  socialOut: z.boolean(),
  socialOutContext: z.string().optional(),
  targetRounds: z.number().int().min(1).max(10),
  encounterCount: z.number().int().min(1),
  entryCondition: z.enum(["fresh", "winded", "depleted"]),
  entryContext: z.string().optional(),
  targetOutcome: z.enum(["safe_victory", "heavy_tax", "brink_of_defeat"]),
  exitContext: z.string().optional(),
  letDiceFall: z.boolean(),
  contactInfo: z.string().optional(),
  loreNotes: z.string().optional(),
  gmRant: z.string().optional(),
  allowExtraMinions: z.boolean(),
  combatStyle: z.enum(["Standard Brawl", "Alternative Objective"]),
  winCondition: z.string().optional(),
  failureConsequence: z.enum(["narrative_setback", "tpk_risk"]),
  inspirationVelocity: z.enum(["low", "high"]),
  toyList: z.array(z.string()),
  primaryMaterial: z.enum(["Stone", "Wood", "Flesh", "Ice", "Metal", "Magic", "Water"]),
  licensingMode: z.enum(["CC-BY-4.0", "ORC", "None"]),
  exportPriority: z.enum(["Standard", "VTT-First", "Phone-Optimized"])
}).strict();

export const ZodGenerateJobRequestSchema = z.object({
  setup: ZodGMSetupSchema.optional(),
  sessionId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
  startAtStep: z.number().int().min(0).max(20).optional(),
  currentState: z.record(z.string(), z.unknown()).optional()
}).strict().refine(
  payload => payload.setup || payload.sessionId,
  { message: "Generate job request requires either setup or sessionId.", path: ["setup"] }
);

export const ZodHtmlExportRequestSchema = z.object({
  jobId: z.string().uuid(),
  sessionId: z.string().uuid()
}).strict();

export const ZodClientNameSchema = z.string().trim().min(1).max(120);

export const ZodCreateSessionRequestSchema = z.object({
  clientName: ZodClientNameSchema,
  data: ZodGMSetupSchema
}).strict();

export const ZodQueuedSessionStatusSchema = z.enum([
  "new",
  "reviewed",
  "processing",
  "completed",
  "archived"
]);

export const ZodQueuedSessionTypeSchema = z.enum(["encounter", "advice"]);

export const ZodQueuedSessionSchema = z.object({
  id: z.string().uuid(),
  sessionType: ZodQueuedSessionTypeSchema.default("encounter"),
  title: z.string().trim().min(1).max(200).optional(),
  clientName: ZodClientNameSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  status: ZodQueuedSessionStatusSchema,
  data: ZodGMSetupSchema.optional(),
  adviceRequest: z.unknown().optional(),
  adviceReport: z.unknown().optional(),
  finalState: z.unknown().optional(),
  jobId: z.string().uuid().optional(),
  ownerId: ZodOwnerIdSchema.optional()
}).strict();

export type CreateSessionRequest = z.infer<typeof ZodCreateSessionRequestSchema>;
export type QueuedSessionStatus = z.infer<typeof ZodQueuedSessionStatusSchema>;
export type QueuedSessionType = z.infer<typeof ZodQueuedSessionTypeSchema>;
export type QueuedSession = z.infer<typeof ZodQueuedSessionSchema>;

// === ZOD SCHEMA HELPER FUNCTIONS ===

export const mechanicalInt = (
  defaultValue: number,
  fieldPath: string,
  options?: { min?: number; max?: number }
) => z.preprocess((val) => {
  let result = defaultValue;
  if (val !== null && val !== undefined) {
    if (typeof val === "number" && !Number.isNaN(val)) {
      result = Math.round(val);
    } else if (typeof val === "string") {
      const parsed = Number(val);
      if (!Number.isNaN(parsed)) {
        result = Math.round(parsed);
      } else {
        console.warn(`[ZOD HYDRATION] Invalid string value '${val}' at field path '${fieldPath}'. Hydrating with fallback: ${defaultValue}`);
      }
    } else {
      console.warn(`[ZOD HYDRATION] Invalid value type (${typeof val}) at field path '${fieldPath}'. Hydrating with fallback: ${defaultValue}`);
    }
  } else {
    console.warn(`[ZOD HYDRATION] Missing or null value at field path '${fieldPath}'. Hydrating with fallback: ${defaultValue}`);
  }

  // Silent clamping of out-of-bound values
  if (options?.min !== undefined && result < options.min) {
    console.warn(`[ZOD HYDRATION] Value ${result} out of bounds (< ${options.min}) at field path '${fieldPath}'. Clamping to min: ${options.min}`);
    result = options.min;
  }
  if (options?.max !== undefined && result > options.max) {
    console.warn(`[ZOD HYDRATION] Value ${result} out of bounds (> ${options.max}) at field path '${fieldPath}'. Clamping to max: ${options.max}`);
    result = options.max;
  }

  return result;
}, z.number().int());

export const mechanicalNumber = (
  defaultValue: number,
  fieldPath: string,
  options?: { min?: number; max?: number }
) => z.preprocess((val) => {
  let result = defaultValue;
  if (val !== null && val !== undefined) {
    if (typeof val === "number" && !Number.isNaN(val)) {
      result = val;
    } else if (typeof val === "string") {
      const parsed = Number(val);
      if (!Number.isNaN(parsed)) {
        result = parsed;
      } else {
        console.warn(`[ZOD HYDRATION] Invalid string value '${val}' at field path '${fieldPath}'. Hydrating with fallback: ${defaultValue}`);
      }
    } else {
      console.warn(`[ZOD HYDRATION] Invalid value type (${typeof val}) at field path '${fieldPath}'. Hydrating with fallback: ${defaultValue}`);
    }
  } else {
    console.warn(`[ZOD HYDRATION] Missing or null value at field path '${fieldPath}'. Hydrating with fallback: ${defaultValue}`);
  }

  // Silent clamping of out-of-bound values
  if (options?.min !== undefined && result < options.min) {
    console.warn(`[ZOD HYDRATION] Value ${result} out of bounds (< ${options.min}) at field path '${fieldPath}'. Clamping to min: ${options.min}`);
    result = options.min;
  }
  if (options?.max !== undefined && result > options.max) {
    console.warn(`[ZOD HYDRATION] Value ${result} out of bounds (> ${options.max}) at field path '${fieldPath}'. Clamping to max: ${options.max}`);
    result = options.max;
  }

  return result;
}, z.number());

// === ZOD RUNTIME SCHEMAS ===

export const ZodMcdSchema = z.object({
  chain_of_thought_scratchpad: z.string().describe("Abbreviated tactical analysis and logic. BE EXTREMELY CONCISE (3-5 bullets max)."),
  premise: z.object({
    setting: z.string(),
    tone: z.string(),
    slot: z.string().nullable().default(""),
    gm_requirements: z.string().nullable().default(""),
    time_constraint: z.string().nullable().default(""),
    one_fight_day: z.boolean(),
    encounter_structure: z.enum(["Skirmish", "Wave", "Siege", "Boss", "Puzzle"]),
    is_boss_fight: z.boolean(),
    target_experience: z.enum(["Gritty", "Heroic", "Gonzo"]).default("Heroic"),
    party_archetype: z.enum(["Glass Cannon Strikers", "Control-Heavy Mages", "Unkillable Tanks", "Balanced Group", "I don't know"]).default("Balanced Group"),
    pipeline_mode: z.enum(["Precision", "Casual"]),
    encounter_count: z.number().int().default(1),
    monster_faction_request: z.string().nullable().default(""),
    lore_notes: z.string().nullable().default(""),
    gm_rant: z.string().nullable().default(""),
    allow_extra_minions: z.boolean().default(true),
    combat_style: z.enum(["Standard Brawl", "Alternative Objective"]).default("Standard Brawl"),
    win_condition: z.string().nullable().default(""),
    failure_consequence: z.enum(["narrative_setback", "tpk_risk"]).default("narrative_setback"),
    target_rounds: z.number().int().min(1).max(10).default(4),
    licensing_mode: z.enum(["CC-BY-4.0", "ORC", "None"]).default("None"),
    export_priority: z.enum(["Standard", "VTT-First", "Phone-Optimized"]).default("Standard"),
    inspiration_velocity: z.enum(["low", "high"]).default("low"),
    primary_material: z.enum(["Stone", "Wood", "Flesh", "Ice", "Metal", "Magic", "Water"]).default("Stone"),
    toy_list: z.array(z.string()).default([])
  }),
  party: z.object({
    size: mechanicalInt(4, "party.size", { min: 1 }),
    avg_level: mechanicalInt(5, "party.avg_level", { min: 1 }),
    tier: mechanicalInt(2, "party.tier", { min: 1, max: 4 }),
    classes: z.array(z.string()),
    avg_ac: mechanicalNumber(15, "party.avg_ac"),
    avg_hp_per_pc: mechanicalNumber(40, "party.avg_hp_per_pc"),
    avg_hp_pool: mechanicalNumber(160, "party.avg_hp_pool"),
    avg_dpr: mechanicalNumber(20, "party.avg_dpr"),
    high_threat_pcs: z.array(z.string()),
    weapon_masteries: z.array(z.string()),
    strengths: z.array(z.string()),
    vulnerabilities: z.array(z.string()),
    resource_state: z.enum(["Fresh", "Partially Depleted", "Heavily Depleted", "Nova Ready"]),
    rest_frequency: z.enum(["Short Rest", "Long Rest", "Mixed"]),
    requested_enemies: z.array(z.object({
      name: z.string(),
      type: z.enum(["Minion", "Elite", "Boss", "Legendary"]),
      quantity: mechanicalInt(1, "party.requested_enemies.quantity"),
      is_stat_locked: z.boolean().default(false),
      is_fragile: z.boolean().default(false),
      provided_stats: z.string().nullable().default(""),
      context: z.string().nullable().default("")
    })).default([]),
    pcs: z.array(z.object({
      name: z.string(),
      hp: mechanicalInt(40, "party.pcs.hp").describe("Total HP as a single integer (e.g. 45). NEVER use an object."),
      ac: mechanicalInt(15, "party.pcs.ac").describe("AC as a single integer (e.g. 15). NEVER use an object."),
      dpr: mechanicalInt(20, "party.pcs.dpr").describe("Average DPR as a single integer (e.g. 20). NEVER use an object."),
      role: z.string(),
      reaction_density: z.enum(["low", "high"]).default("low"),
      magic_item_impact: z.enum(["standard", "bypass", "dpr_shift"]).default("standard"),
      major_magic_items_count: mechanicalInt(0, "party.pcs.major_magic_items_count")
    })).default([]),
    roleplay_hooks: z.array(z.object({ 
      pc_name: z.string(), 
      role: z.string().nullable().default("None"),
      hook: z.string().nullable().default(""),
      general_context: z.string().nullable().default("")
    })).default([]),
    is_dpr_estimated: z.boolean(),
    is_ac_estimated: z.boolean(),
    is_hp_estimated: z.boolean(),
    high_reaction_density: z.boolean().default(false)
  }),
  allies: z.array(z.object({
    name: z.string(),
    type: z.enum(["General", "Specific"]),
    role: z.enum(["Frontline", "Support", "Striker", "Cannon Fodder"]),
    quantity: mechanicalInt(1, "allies.quantity"),
    avg_dpr: mechanicalInt(0, "allies.avg_dpr").describe("Sustainable average DPR for the ally. Estimate if unknown."),
    avg_cr: mechanicalNumber(0, "allies.avg_cr").describe("Challenge Rating of the ally unit. 0.25 for CR 1/4, 0 if unknown."),
    is_independent: z.boolean(),
    dismiss_organically: z.boolean(),
    stats_provided: z.boolean(),
    parser_hint: z.string().nullable().default(""),
    general_context: z.string().nullable().default("")
  })).default([]),
  parameters: z.object({
    target_difficulty: z.enum(["Easy", "Medium", "Hard", "Deadly", "Mythic"]),
    pc_objective: z.string(),
    social_out_required: z.boolean(),
    social_out_context: z.string().nullable().default(""),
    mythic_encounter: z.boolean().default(false),
    entry_condition: z.enum(["fresh", "winded", "depleted"]),
    entry_context: z.string().nullable().default(""),
    target_outcome: z.enum(["safe_victory", "heavy_tax", "brink_of_defeat"]),
    exit_context: z.string().nullable().default(""),
    let_dice_fall: z.boolean().default(false),
    tone_guardrails: z.array(z.string()).nullable().default([])
  }),
  flags: z.object({
    known_conflicts: z.array(z.string()).nullable().default([]),
    suggested_resolutions: z.array(z.string()).nullable().default([]),
    missing_information: z.array(z.string()).nullable().default([])
  })
}).strict();

export const ZodPppSchema = z.object({
  chain_of_thought_scratchpad: z.string().describe("Abbreviated tactical analysis and logic."),
  power_profile: z.object({
    tier_classification: z.enum(["S", "A", "B", "C"]),
    primary_threat_vector: z.string(),
    subclass_force_multipliers: z.array(z.string()),
    known_exploits: z.array(z.string()),
    nova_potential: z.enum(["High", "Medium", "Low"]),
    one_fight_day_flags: z.object({
      active: z.boolean(),
      phase_count_required: z.number().int(),
      mandatory_initiative_expertise: z.boolean(),
      concentration_break_required: z.boolean(),
      xp_budget_modifier: z.number()
    }),
    recommended_monster_upgrades: z.object({
      hp_increase_percent: z.number().int(),
      initiative_bonus: z.string(),
      convert_actions_to_bonus_actions: z.boolean(),
      unconditional_bps_resistance: z.boolean(),
      solo_boss_legendary_actions: z.string()
    }),
    exploit_mitigations: z.array(z.string())
  })
}).strict();

export const ZodMechanicsSchema = z.object({
  chain_of_thought_scratchpad: z.string().describe("Abbreviated tactical analysis and math interpretation."),
  mechanics: z.object({
    tier: mechanicalNumber(2, "mechanics.tier"),
    xp_budget_raw: mechanicalNumber(500, "mechanics.xp_budget_raw"),
    encounter_multiplier: mechanicalNumber(1.0, "mechanics.encounter_multiplier"),
    xp_budget_adjusted: mechanicalNumber(500, "mechanics.xp_budget_adjusted"),
    action_ratio_target: z.string(),
    max_ac: mechanicalNumber(15, "mechanics.max_ac"),
    max_attack_bonus: mechanicalNumber(5, "mechanics.max_attack_bonus"),
    max_save_dc: mechanicalNumber(13, "mechanics.max_save_dc"),
    anchor_hp_range: z.object({
      min: mechanicalNumber(100, "mechanics.anchor_hp_range.min"),
      max: mechanicalNumber(150, "mechanics.anchor_hp_range.max")
    }),
    minion_hp_range: z.object({
      min: mechanicalNumber(10, "mechanics.minion_hp_range.min"),
      max: mechanicalNumber(20, "mechanics.minion_hp_range.max")
    }),
    total_roster_hp: mechanicalNumber(200, "mechanics.total_roster_hp"),
    damage_per_round_target: mechanicalNumber(40, "mechanics.damage_per_round_target"),
    legendary_actions_required: mechanicalNumber(0, "mechanics.legendary_actions_required"),
    surrender_threshold: mechanicalNumber(0.1, "mechanics.surrender_threshold"),
    mastery_zone_type: z.string(),
    mastery_interactions: z.array(z.string()),
    resource_drain_target: mechanicalNumber(0.2, "mechanics.resource_drain_target"),
    mythic_encounter: z.boolean(),
    estimated_lifespan_rounds: mechanicalNumber(3, "mechanics.estimated_lifespan_rounds"),
    nova_risk_flag: z.boolean(),
    nova_dpr_estimated: mechanicalInt(40, "mechanics.nova_dpr_estimated"),
    max_single_action_damage: mechanicalInt(30, "mechanics.max_single_action_damage").describe("The hard cap for any single damage trigger to prevent one-shots."),
    is_boss_archetype: z.boolean().describe("True if the encounter is a Boss fight or Solo Anchor archetype."),
    is_fragile: z.boolean().default(false).describe("True if the boss is a glass cannon/fragile archetype; bypasses Nova-Proof HP floor."),
    pacing_estimate_minutes: mechanicalInt(30, "mechanics.pacing_estimate_minutes").describe("Estimated real-world time to resolve combat."),
    slog_risk_warning: z.boolean().describe("True if pacing > 120 minutes or roster is homogenous."),
    action_budget: z.object({
      target_effective_actions: mechanicalInt(4, "mechanics.action_budget.target_effective_actions"),
      legendary_actions: mechanicalInt(0, "mechanics.action_budget.legendary_actions"),
      reaction_pressure: z.enum(["low", "high"]),
      reaction_budget: mechanicalInt(1, "mechanics.action_budget.reaction_budget").describe("Number of reactions per round. High density parties trigger 'One per Player Turn' (e.g. 4-5)."),
      reactive_multi_act: z.boolean().default(false).describe("True if Boss gets 1 reaction per player turn to counter high mobility/reactions.")
    }),
    exhaustion_risk: z.boolean().default(false).describe("True if the encounter uses 5.5e Exhaustion tiers as a primary failure consequence."),
    reliability_counters_required: z.boolean().default(false).describe("True if the boss needs features to counter high Inspiration velocity (e.g. Sap mastery)."),
    phase_triggers: z.array(z.object({
      phase_name: z.string(),
      hp_threshold: mechanicalInt(50, "mechanics.phase_triggers.hp_threshold").describe("Usually 50 for Bloodied"),
      trigger: z.enum(["Bloodied", "Round_3", "Ally_Death"]).default("Bloodied"),
      effect: z.enum(["Condition_Clear", "Map_Transformation", "Action_Budget_Increase"]).default("Condition_Clear"),
      budget_shift: mechanicalNumber(1.0, "mechanics.phase_triggers.budget_shift").describe("Multiplier for Action Budget in this phase"),
      new_mechanic: z.string().describe("New ability or environmental hazard triggered"),
      sensory_ledger: z.object({
        visual: z.string(),
        auditory: z.string(),
        mechanical: z.string().describe("Direct warning for players about new threats.")
      }),
      narrative_beat: z.string().describe("Cinematic description of the transition")
    })).default([{ 
      phase_name: "Bloodied", 
      hp_threshold: 50, 
      trigger: "Bloodied", 
      effect: "Condition_Clear",
      budget_shift: 1.0,
      new_mechanic: "Boss clears all conditions and readies a signature move.",
      sensory_ledger: {
        visual: "The boss roars in pain, eyes glowing with a feral intensity.",
        auditory: "The sound of snapping bone and grinding stone echoes through the arena.",
        mechanical: "Tell the players: 'The boss is bracing for a massive counter-strike. Its defenses are lowered but its power is surging.'"
      },
      narrative_beat: "The boss roars in pain, shaking off its injuries as the battlefield shifts!"
    }]),
    resilience_factor: mechanicalNumber(0, "mechanics.resilience_factor"),
    resilience_requirement: z.boolean().default(false)
  }),
  section_7: z.string()
}).strict()
.superRefine((m, ctx) => {
  if (!validateLethality(m.mechanics.damage_per_round_target, m.mechanics.total_roster_hp)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: getLethalityErrorMessage(m.mechanics.damage_per_round_target, m.mechanics.total_roster_hp),
      path: ["mechanics", "damage_per_round_target"]
    });
  }
  if (!validateNovaProof(m.mechanics.anchor_hp_range.min, m.mechanics.nova_dpr_estimated, m.mechanics.is_boss_archetype, m.mechanics.is_fragile)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: getNovaProofErrorMessage(),
      path: ["mechanics", "anchor_hp_range", "min"]
    });
  }
});


export const ZodMechanicalTraitEnum = z.enum([
  "Regeneration",        // Adds EHP (Effective HP)
  "Reactive",            // Triggers Reaction Pressure logic
  "Phase_Shift",         // Grants temporary Invulnerability/Evasion
  "Hover",               // Tactical multiplier (Verticality)
  "Damage_Resistant",    // +50% EHP multiplier
  "Magic_Resistance",    // Save-based EHP buff
  "Legendary_Resistance", // Resource-based survival
  "Custom"               // For unique mechanics; math must be reflected in overrides
]);

/**
 * PH7: Defines a specific phase for a Multi-Phase Boss.
 */
export const ZodActorPhaseSchema = z.object({
  phase_id: z.string().describe("Slug for the phase state (e.g., 'bloodied_enrage')"),
  trigger: z.object({
    type: z.enum(["HP_THRESHOLD", "ROUND_TIMER", "ACTOR_DEATH", "ENVIRONMENTAL_FLUX"]),
    value: z.number().describe("Percentage (0.5 = 50% HP) or Round number (3)"),
    target_actor_id: z.string().optional().describe("Actor ID if type is ACTOR_DEATH"),
  }),
  hp_pool_behavior: z.enum([
    "CONTINUOUS", // Current HP continues from previous phase (standard Bloodied)
    "RESET"       // HP resets to the override value (Mythic/Multi-HP bar style)
  ]).describe("Determines if the actor starts a new HP pool or continues the current one."),
  transition_overhead: z.number().optional().describe("Number of untargetable rounds during shift"),
  state_overrides: z.object({
    /** 
     * FALLBACK BEHAVIOR: If an override is undefined, the system must default to the 
     * Initial State (Base) stats to maintain statelessness in the MathEngine.
     */
    ac_override: z.number().int().optional().describe("New base AC for this phase"),
    dpr_override: z.number().int().optional().describe("New target DPR for this phase"),
    hp_override: z.number().int().optional().describe("Required if behavior is RESET"),
    manual_weight_modifier: z.number().describe("Float (e.g. 1.2) to scale EHP calculation for non-deterministic variables.").optional(),
    added_traits: z.array(ZodMechanicalTraitEnum).default([]),
    removed_traits: z.array(ZodMechanicalTraitEnum).default([]),
    new_actions: z.array(z.string()).default([]),
  }),
  narrative_beat: z.string().describe("Cinematic shift text for Narrative bot"),
  counter_play: z.object({
    trigger: z.string().describe("The specific player action (e.g., 'Cold damage', 'Topple mastery')"),
    effect: z.string().describe("The mechanical penalty (e.g., 'Disadvantage on attacks', 'Loses Regeneration')"),
    ehp_offset: z.number().describe("The calculated reduction in EHP (e.g., 0.1 for a -10% EHP tax)").default(0)
  }).describe("The mandatory tactical weakness for this phase."),
  environment_shift: z.object({
    flux_axis_impact: z.enum(["Gravity", "Obscurement", "Hazard", "Verticality"]).optional(),
    description: z.string().optional(),
  }).nullable()
});

/**
 * PH7: Extended Phase Validation Contract
 */
export const ZodPhaseTransitionSchema = z.array(ZodActorPhaseSchema).max(2)
  .refine(
    (phases) => phases.every(p => p.hp_pool_behavior !== "RESET" || p.state_overrides.hp_override !== undefined),
    { message: "Phases with RESET behavior MUST provide an explicit hp_override in state_overrides." }
  )
  .refine(
    (phases) => phases.every(p => {
      const hasCustom = p.state_overrides.added_traits.includes("Custom");
      const hasEnvShift = p.environment_shift !== null;
      if (hasCustom || hasEnvShift) {
        return p.state_overrides.manual_weight_modifier !== undefined;
      }
      return true;
    }),
    { message: "manual_weight_modifier is mandatory when 'Custom' trait is used or environment_shift is present." }
  );

export const ZodMechanistSchema = z.object({

  chain_of_thought_scratchpad: z.string().describe("Abbreviated tactical analysis and logic."),
    actors: z.array(z.object({
      name: z.string(),
      type: z.enum(["Anchor", "Brute", "Skirmisher", "Artillery"]),
      hp: z.number().int().positive(),
      ac: z.number().int(),
      dpr: z.number().int(),
      size: z.enum(["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"]).default("Medium"),
      speed: z.number().int(),
      initiative_bonus: z.number().int(),
      behavior_script: z.string(),
      design_justification: z.string().describe("Brief reasoning for custom traits or stat adjustments."),
      traits: z.array(z.string()).default([]),
      actions: z.array(z.string()).default([]),
      phases: ZodPhaseTransitionSchema.optional(),

      // PH7: Runtime Simulation Tracking
      temp_hp: z.number().default(0),
      is_untargetable: z.boolean().default(false),
      is_invulnerable: z.boolean().default(false),
      stall_until_round: z.number().int().nullable().default(null),
      last_phase_transition_round: z.number().int().nullable().default(null),
      current_phase_id: z.string().nullable().default(null)
    })),
  section_5_actors: z.string(),
  mission_stat_block: z.string(),
  initiative_tracker: z.string()
}).strict();

export const ZodAxisSchema = z.object({
  name: z.string(),
  type: z.enum(["Protein", "Multiplier", "Hazard", "Flux"]),
  appearance: z.string().describe("The narrative skinning of the toy (e.g. 'A rusted pressure valve')."),
  current_state: z.string(),
  telegraph: z.string().describe("Mandatory warning cue for lethal/condition states."),
  tactical_clue: z.string().describe("The 'Telegraph' for Search/Study actions (e.g. 'Hissing steam')."),
  interaction_trigger: z.string().describe("What specific action (Push, Attack, Spell) activates this toy?"),
  passive_trigger: z.string().optional().describe("Physics-based trigger (e.g. 'Forced movement into space')."),
  state_change: z.string().describe("How the map looks/behaves after interaction."),
  once_per_encounter: z.boolean().default(true),
  mastery_synergies: z.array(z.enum(["Push", "Topple", "Slow", "Sap", "Cleave", "Graze", "Nick", "Vex"])).default([]),
  size_constraint: z.enum(["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"]).nullable().default("Large").describe("The maximum size this toy can affect (e.g. Push only works on Large or smaller)."),
  activation_distance: z.number().int().default(5).describe("Distance in feet from which this toy can be triggered or interacted with."),
  automatic_trigger: z.object({
    type: z.enum(["Tick Rate (Init 20)", "Threshold (%)"]),
    details: z.string()
  }),
  manual_lever: z.object({
    action_type: z.enum(["Utilize", "Study", "Search", "Magic"]),
    dc: z.number().int(),
    effect: z.string().describe("The benefit of the manual intervention.")
  }),
  failing_forward_rider: z.string().describe("The penalty/condition applied on a failed manual check."),
  force_multiplier_value: z.string().describe("Explanation of the 3x efficiency (e.g., 'Affects 3+ targets')."),
  social_out_trigger: z.boolean(),
  choice_mandate: z.string(),
  // PH7: Tactical Efficiency Tracking
  virtual_value_weight: z.number().default(1.0).describe("Internal multiplier for the 'Kill Clock' audit.")
});

export const ZodCartographerSchema = z.object({
  chain_of_thought_scratchpad: z.string().describe("Abbreviated tactical analysis and logic."),
  grid_dimensions: z.object({
    width: z.number().int().positive().describe("Grid width in 5ft squares."),
    height: z.number().int().positive().describe("Grid height in 5ft squares.")
  }).describe("Mandatory spatial constraints for the Tactical Grid."),
  axes: z.array(ZodAxisSchema),
  section_4_zones: z.string(),
  section_6_timeline: z.string()
}).strict();

export const ZodNarrativeSchema = z.object({
  chain_of_thought_scratchpad: z.string().describe("Abbreviated tactical analysis and logic."),
  interactive_points: z.array(z.object({
    point: z.string().describe("Interactive element with **Bolded Key Terms**."),
    gm_instruction: z.string().describe("What happens when players interact.")
  })).describe("Replaces traditional boxed text with OSR-style bullet points."),
  gm_cinematic_beats: z.array(z.object({
    round: z.number(),
    beat: z.string(),
    mechanical_trigger: z.string()
  })),
  sensory_details: z.object({
    sight: z.string(),
    sound: z.string(),
    smell: z.string(),
    lighting: z.string()
  }),
  section_1_cover: z.string(),
  section_8_hooks: z.string()
}).strict();

// === EXPORTED TYPES FOR SERVICES ===
export type Actor = z.infer<typeof ZodMechanistSchema>["actors"][0];
export type ActorPhase = z.infer<typeof ZodActorPhaseSchema>;

export const ZodAuditorSchema = z.object({
  chain_of_thought_scratchpad: z.string().describe("Abbreviated tactical analysis and logic."),
  section_2_gm_summary: z.string(),
  section_10_design_notes: z.string(),
  final_compiled_markdown: z.string(),
  validation_passed: z.boolean(),
  validation_report: z.object({
    nova_proof_status: z.enum(["Pass", "Fail", "Bypass", "Bypassed", "Bypassed (Fragile)", "N/A"]),
    checklist: z.string(),
    conflict_notes: z.string().default(""),
    ally_weight_audit: z.string(),
    lethality_ratio_check: z.string(),
    narrative_consistency: z.string(),
    critical_math_errors: z.array(z.string()).default([]),
    simulation_warnings: z.array(z.string()).default([]).describe("Inherited warnings from the SimulationEngine's stateless math audit.")
  }).strict()
}).strict();

export const ZodPublisherSchema = z.object({
  chain_of_thought_scratchpad: z.string().describe("Abbreviated tactical analysis and logic."),
  semantic_markdown: z.string(),
  vtt_section: z.string(),
  sensory_ledger_rendered: z.string().optional()
}).strict();

export const ZodStylistSchema = z.object({
  chain_of_thought_scratchpad: z.string().describe("Abbreviated tactical analysis and logic."),
  styled_output: z.string(),
  vtt_section: z.string().optional()
}).strict();

export const ZodSummaristSchema = z.object({
  chain_of_thought_scratchpad: z.string().describe("Abbreviated tactical analysis and logic."),
  tactical_summary_markdown: z.string().describe("The final synthesized run-sheet for the GM.")
}).strict();

export const ZodTacticalBriefingSchema = z.object({
  kill_clock_outlook: z.string().describe("Narrative summary of survival rounds based on party DPR."),
  survival_range: z.object({
    min_rounds: z.number().describe("Survival rounds if the party crits or uses high-resource moves."),
    max_rounds: z.number().describe("Survival rounds if the party has average to low luck."),
    justification: z.string().describe("Mechanical explanation (e.g. 'Inflated HP to survive Paladin smites').")
  }),
  mastery_levers: z.array(z.object({
    toy_name: z.string(),
    trigger: z.string(),
    synergy: z.string().describe("How Push/Topple/Slow interacts with this hazard.")
  })),
  lethality_warnings: z.array(z.string()),
  gm_advice: z.string().describe("Direct instructions for running the encounter.")
});

export type TacticalBriefing = z.infer<typeof ZodTacticalBriefingSchema>;

// === GM ADVICE REPORT SCHEMAS ===

export const ZodGMAdviceRequestSchema = z.object({
  partySize: z.number().int().min(1),
  startLevel: z.number().int().min(1).max(20),
  pcs: z.array(z.object({
    name: z.string(),
    className: z.string(),
    subclass: z.string().optional(),
    currentMagicItems: z.array(z.string()).default([])
  })),
  targetDifficulty: z.enum(["Easy", "Medium", "Hard", "Deadly"]).default("Medium"),
  tone: z.string().default("Heroic")
});

export const ZodGMAdviceReportSchema = z.object({
  chain_of_thought_scratchpad: z.string().optional()
    .describe("Analytical scratchpad logic."),

  party_vulnerability_profile: z.object({
    collective_weaknesses: z.array(z.string())
      .describe("Shared vulnerabilities (e.g., all melee, lack of mental saves)."),
    nova_ceiling_outlook: z.string()
      .describe("Estimated round-1 damage output factoring in class burst and existing magic items.")
  }),

  tactical_combat_breakdown: z.object({
    role_assignments: z.array(z.object({
      role_label: z.string()
        .describe("Broad tactical role for this PC cluster, e.g. 'Primary Damage Dealer', 'Control Anchor', 'Support Buffer'."),
      pc_names: z.array(z.string())
        .describe("Names of PCs assigned to this role."),
      pressure_tactics: z.array(z.string())
        .describe("Enemy tactics and battlefield conditions that specifically stress this role (e.g. 'Split the healers with divided objectives', 'Deny Sneak Attack via Pack Tactics'). Min 2 entries.")
    })).describe("One entry per distinct tactical role cluster present in the party."),
    action_economy_verdict: z.string()
      .describe("Overall GM verdict on the party's action economy strength and how the encounter roster must compensate.")
  }),

  pacing_sandbox: z.object({
    level: mechanicalInt(5, "pacing_sandbox.level"),
    dpr_bounds: z.object({
      min: mechanicalNumber(20, "pacing_sandbox.dpr_bounds.min"),
      max: mechanicalNumber(50, "pacing_sandbox.dpr_bounds.max")
    }),
    anchor_hp_floor: mechanicalNumber(100, "pacing_sandbox.anchor_hp_floor")
      .describe("Minimum HP required for a solo boss to survive Round 1 Nova and Round 2 Sustained damage."),
    tactical_guidelines: z.array(z.string())
      .describe("How to structure encounters (e.g. minion ratios, action counts)."),
    environmental_recommendations: z.array(z.string())
      .describe("Interactive zones or hazards to challenge this level's mobility."),
    budget_allocations: z.array(z.object({
      archetype_name: z.string()
        .describe("e.g., 'The Mastermind', 'The Tyrant & Court', 'The Bound Coven'"),
      description: z.string(),
      allocation_bar_visual: z.string()
        .describe("A textual segmented bar visual representation, e.g., '[Anchor: 60% | Bodyguards: 30% | Minions: 10%]'"),
      segment_breakdown: z.array(z.object({
        role: z.string()
          .describe("e.g., 'Anchor Boss', 'Elite Bodyguards', 'Minion Swarms', 'Hazards'"),
        percentage: mechanicalInt(0, "pacing_sandbox.budget_allocations.segment_breakdown.percentage"),
        translation_stat_block: z.string()
          .describe("e.g., '1x CR 5 Anchor (207 HP)' or '4x CR 1/2 Minions (25 HP each)'")
      }))
    })).describe("Archetype templates translating percentages to level-specific monster selections."),

    enemy_tactical_counters: z.array(z.object({
      type: z.string()
        .describe("Category label for this counter strategy, e.g. 'Action Denial Counter', 'AoE Suppression', 'Concentration Disruption', 'Mobility Lockdown'."),
      mechanic_description: z.string()
        .describe("Concrete D&D 2024 rule text describing the enemy tactic or trait — no narrative flavor, mechanics only."),
      targeted_players: z.array(z.string())
        .describe("Names of the PCs this counter directly addresses or exploits.")
    })).describe("Uncapped array of enemy tactical counters targeting specific party members or role clusters.")
  }).describe("Pacing profile for the targeted startLevel only."),

  player_specific_ledger: z.array(z.object({
    pc_name: z.string(),
    class_subclass: z.string(),
    key_feature_interaction: z.string()
      .describe("How the GM should interact with their main class/subclass features tactically (not shut them down)."),
    biggest_weakness: z.string()
      .describe("Individual mechanical gap (saves, speed, range)."),
    current_item_impact: z.string()
      .describe("How their current magic items modify their strengths or mitigate their weaknesses."),
    magic_item_prescriptions: z.array(z.object({
      item_name: z.string(),
      benefit: z.string().describe("How it shores up their weakness."),
      rule_reference: z.string().describe("2024 mechanics applied.")
    })).describe("Magic items to compensate for remaining weaknesses."),
    items_to_avoid: z.array(z.object({
      item_name: z.string(),
      warning: z.string().describe("Why this item breaks the balance or escalates Nova output.")
    }))
  })),

  threat_windows: z.object({
    encounters_before_short_rest: mechanicalInt(2, "threat_windows.encounters_before_short_rest")
      .describe("Number of minor encounters recommended before a short rest."),
    encounters_before_long_rest: mechanicalInt(5, "threat_windows.encounters_before_long_rest")
      .describe("Number of encounters recommended before a long rest."),
    rest_economy_rationale: z.string()
      .describe("Visceral rule description scaling rests to party size redundancy.")
  }),

  mechanical_threshold: z.object({
    level: mechanicalInt(5, "mechanical_threshold.level"),
    party_sustained_dpr: mechanicalNumber(30, "mechanical_threshold.party_sustained_dpr"),
    dominant_cr_tier: z.string().describe("e.g., 'CR 5–10'"),
    monster_avg_save_bonus: mechanicalNumber(2, "mechanical_threshold.monster_avg_save_bonus"),
    required_dc_for_50pct: mechanicalNumber(13, "mechanical_threshold.required_dc_for_50pct")
      .describe("DC required to force 50% failure rate: ceil(avgSaveBonus + 10.5)"),
    threshold_crossover: z.boolean()
      .describe("true = party per-PC DPR now outpaces the CR tier's save bonus scaling")
  }).describe("Offensive scaling vs monster save threshold tracker for the target level."),

  nova_recoil_engine: z.object({
    level: mechanicalInt(5, "nova_recoil_engine.level"),
    post_nova_sustained_dpr: mechanicalNumber(30, "nova_recoil_engine.post_nova_sustained_dpr")
      .describe("Party DPR after Round 1 nova burst has resolved."),
    nova_threshold: mechanicalNumber(40, "nova_recoil_engine.nova_threshold")
      .describe("HP trigger value for secondary wave activation (% of anchor HP floor)."),
    secondary_wave_trigger: z.string()
      .describe("Operational rule string describing the wave condition."),
    resource_depletion_note: z.string()
      .describe("What was spent in Round 1 nova burst.")
  }).describe("Nova recoil profile for the target level."),

  rest_economy_throttle: z.object({
    level: mechanicalInt(5, "rest_economy_throttle.level"),
    slot_drain_per_encounter_pct: mechanicalNumber(20, "rest_economy_throttle.slot_drain_per_encounter_pct").describe("Estimated % of spell slots drained per encounter."),
    encounters_to_short_rest: mechanicalInt(2, "rest_economy_throttle.encounters_to_short_rest"),
    encounters_to_long_rest: mechanicalInt(5, "rest_economy_throttle.encounters_to_long_rest")
  }).describe("Rest economy throttle metrics for the target level."),

  attrition_wave_scales: z.object({
    waves_to_force_long_rest: mechanicalInt(5, "attrition_wave_scales.waves_to_force_long_rest"),
    wave_hp_budget: mechanicalNumber(25, "attrition_wave_scales.wave_hp_budget")
      .describe("HP budget per attrition wave (25% of primary encounter anchor floor)."),
    ability_drain_threshold_note: z.string()
      .describe("At what wave count high-tier nova abilities are ~40% depleted.")
  })
}).strict();

export type GMAdviceRequest = z.infer<typeof ZodGMAdviceRequestSchema>;
export type GMAdviceReport = z.infer<typeof ZodGMAdviceReportSchema>;

/**
 * Narrow schema the LLM actually fills (Echo Pattern).
 *
 * All deterministic fields are omitted so the model no longer echoes them:
 *   - pacing_sandbox.{level, dpr_bounds, anchor_hp_floor} (increment 1)
 *   - the five telemetry sections threat_windows, mechanical_threshold,
 *     nova_recoil_engine, rest_economy_throttle, attrition_wave_scales (increment 2)
 * These are hydrated in gmAdvisorHandler from calculateMath() / calculateThreatWindows()
 * / calculateAdvancedSections(), and the merged object is re-validated against the full
 * ZodGMAdviceReportSchema. This schema is internal to the advice handler —
 * GMAdviceReport (above) remains the canonical output contract.
 */
export const ZodGMAdviceLLMSchema = ZodGMAdviceReportSchema.omit({
  threat_windows: true,
  mechanical_threshold: true,
  nova_recoil_engine: true,
  rest_economy_throttle: true,
  attrition_wave_scales: true
}).extend({
  pacing_sandbox: ZodGMAdviceReportSchema.shape.pacing_sandbox.omit({
    level: true,
    dpr_bounds: true,
    anchor_hp_floor: true
  })
}).strict();

export type GMAdviceLLMOutput = z.infer<typeof ZodGMAdviceLLMSchema>;

// === INFERRED TYPES ===
// Top-level schema output types — used to type FullPipelineState fields.

export type MasterContextDocument   = z.infer<typeof ZodMcdSchema>;
export type PartyPowerProfile       = z.infer<typeof ZodPppSchema>;
export type MechanicsBlock          = z.infer<typeof ZodMechanicsSchema>;
export type MechanistOutput         = z.infer<typeof ZodMechanistSchema>;
export type CartographerOutput      = z.infer<typeof ZodCartographerSchema>;
export type NarrativeOutput         = z.infer<typeof ZodNarrativeSchema>;
export type AuditorOutput           = z.infer<typeof ZodAuditorSchema>;
export type SummaristOutput       = z.infer<typeof ZodSummaristSchema>;
export type StylistOutput         = z.infer<typeof ZodStylistSchema>;
export type PublisherOutput         = z.infer<typeof ZodPublisherSchema>;

// Granular sub-type aliases — expose inner shapes for component-level imports.
// These prevent inline interface duplication across the frontend and backend.

/** The inner `mechanics` data object from MechanicsBlock. This is the shape
 *  passed to BalanceGauge and any component that reads Bot 4's numeric output.
 *  Includes nova_dpr_estimated for UI display of the Nova-Proof audit trail. */
export type MechanicsData           = MechanicsBlock["mechanics"];

/** The `power_profile` sub-object from PartyPowerProfile. */
export type PowerProfile            = PartyPowerProfile["power_profile"];

/** The `one_fight_day_flags` sub-object from PowerProfile. */
export type OneFightDayFlags        = PowerProfile["one_fight_day_flags"];

/** The `party` sub-object from MasterContextDocument. */
export type PartyContext            = MasterContextDocument["party"];

/** The `parameters` sub-object from MasterContextDocument. */
export type EncounterParameters     = MasterContextDocument["parameters"];

// === MATHEMATICAL DATA CONTRACTS ===

export interface HazardTargets {
  target_dc: number;
  avg_hazard_damage: number;
  damage_formula: string;
}

export interface MathEngineTargets {
  nova_dpr: number;
  sustained_dpr: number;
  target_anchor_hp_min: number;
  target_anchor_hp_max: number;
  target_roster_hp: number;
  benchmark_lifespan: number;
  nova_risk_threshold: number;
  lethality_limit: number;
  target_action_budget: number;
  reaction_budget: number;
  reactive_multi_act_recommended: boolean;
  exhaustion_risk: boolean;
  reliability_counters_required: boolean;
  lethality_curve: number[]; // [Phase 1, Phase 2, Phase 3] ratios
  is_fragile: boolean;
  stability_requirement: boolean;
  resilience_factor: number;
  resilience_requirement: boolean;
  message: string;
}

// === JOB & PIPELINE STATUS ===

export type JobStatus = "pending" | "running" | "done" | "error" | "interrupted";

export const ZodJobStatusSchema = z.enum(["pending", "running", "done", "error", "interrupted"]);

export const ZodJobEventSchema = z.object({
  index: z.number().int().min(0),
  status: z.enum(["running", "completed", "failed", "streaming", "rate_limited"]),
  data: z.unknown().optional()
}).passthrough();

export const ZodEncounterJobSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("encounter").optional(),
  status: ZodJobStatusSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
  clientId: z.string().optional(),
  ownerId: ZodOwnerIdSchema.optional(),
  sessionId: z.string().uuid().optional(),
  setup: ZodGMSetupSchema,
  events: z.array(ZodJobEventSchema),
  finalState: z.record(z.string(), z.unknown()).optional(),
  error: z.string().optional()
}).passthrough();

export const ZodAdviceJobSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("advice"),
  status: ZodJobStatusSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
  clientId: z.string().optional(),
  ownerId: ZodOwnerIdSchema.optional(),
  adviceRequest: ZodGMAdviceRequestSchema,
  events: z.array(ZodJobEventSchema),
  adviceReport: z.unknown().optional(),
  error: z.string().optional()
}).passthrough();

export const ZodPersistedJobSchema = z.union([
  ZodAdviceJobSchema,
  ZodEncounterJobSchema
]);

export interface JobEvent {
  index: number;
  status: "running" | "completed" | "failed" | "streaming" | "rate_limited";
  data?: any;
}

export interface Job {
  id: string;
  type?: "encounter";
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  /** Identifies which browser client created this job. */
  clientId?: string;
  /** Identifies the authenticated owner authorized to access this job. */
  ownerId?: string;
  /** Links an encounter job back to a queued public intake session. */
  sessionId?: string;
  /** The original GM briefing payload. */
  setup: GMSetup; 
  /** Incremental events — each bot progress update appended here. */
  events: JobEvent[];
  /** The final state of the pipeline (if completed). */
  finalState?: FullPipelineState;
  error?: string;
}

export interface AdviceJob {
  id: string;
  type: "advice";
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  clientId?: string;
  ownerId?: string;
  adviceRequest: GMAdviceRequest;
  events: JobEvent[];
  adviceReport?: GMAdviceReport;
  error?: string;
}

// === BOT CONTEXT UNION (STRICT PAYLOAD ENFORCEMENT) ===

export type BotContext = 
  | { id: "BOT_0_BRIEFING", setup: GMSetup } 
  | { id: "BOT_6_PROFILER", mcd: MasterContextDocument }
  | { id: "BOT_4_BALANCE", mcd: MasterContextDocument, ppp: PartyPowerProfile, math_engine_targets: MathEngineTargets }
  | { id: "BOT_3_MECHANIST", mcd: MasterContextDocument, ppp: PartyPowerProfile, mechanics: MechanicsBlock, math_engine_targets: MathEngineTargets, mechanist_override: string }
  | { id: "BOT_2_CARTOGRAPHER", mcd: MasterContextDocument, mechanics: MechanicsBlock, hazard_targets: HazardTargets }
  | { id: "BOT_1_NARRATIVE", mcd: MasterContextDocument, mechanics: MechanicsBlock, section_4_zones: string, section_5_actors: string }
  | { id: "BOT_5_AUDITOR", state: FullPipelineState }
  | { id: "BOT_9_SUMMARIST", state: FullPipelineState }
  | { id: "BOT_10_STYLIST", publisher_output: string, mcd: MasterContextDocument }
  | { id: "BOT_8_PUBLISHER", 
      mcd: MasterContextDocument, 
      ppp: PartyPowerProfile, 
      mechanics: MechanicsBlock, 
      auditor_report: AuditorOutput, 
      section_1_3_8_narrative: NarrativeOutput, 
      section_4_zones_structured: CartographerOutput, 
      section_5_actors_structured: MechanistOutput, 
      section_10_tactical_summary: SummaristOutput 
    };

/**
 * PIPELINE EXECUTOR CONTEXT
 * Explicitly tracks the state and control flow variables during a generation job.
 */
export interface PipelineContext {
  state: FullPipelineState;
  currentStepIndex: number;
  globalAuditAttempts: number;
  auditorFeedback: string;
}

export interface FullPipelineState {
  mcd?: MasterContextDocument;
  ppp?: PartyPowerProfile;
  mechanics?: MechanicsBlock;
  math_engine_targets?: MathEngineTargets;
  hazard_targets?: HazardTargets;
  section_5_actors_structured?: MechanistOutput;
  section_5_actors?: string;
  section_4_zones_structured?: CartographerOutput;
  section_4_zones?: string;
  section_6_timeline?: string;
  section_1_3_8_narrative?: NarrativeOutput;
  section_10_tactical_summary?: SummaristOutput;
  tactical_briefing?: TacticalBriefing;
  simulation_warnings?: string[];
  phase_breakdown?: Record<string, { id: string, ehp: number }[]>;
  auditor_report?: AuditorOutput;
  section_7_8_publisher?: PublisherOutput;
  section_9_10_stylist?: StylistOutput;
  publisher_output?: string;
  styled_output?: string;
  final_output_raw?: string;
  vtt_section?: string;
}

// === GEMINI RESPONSE SCHEMAS ===

export const McdSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    chain_of_thought_scratchpad: { type: Type.STRING },
    premise: {
      type: Type.OBJECT,
      properties: {
        setting: { type: Type.STRING },
        tone: { type: Type.STRING },
        slot: { type: Type.STRING, nullable: true },
        gm_requirements: { type: Type.STRING, nullable: true },
        time_constraint: { type: Type.STRING, nullable: true },
        one_fight_day: { type: Type.BOOLEAN },
        encounter_structure: { type: Type.STRING },
        combat_style: { type: Type.STRING },
        target_rounds: { type: Type.INTEGER },
        is_boss_fight: { type: Type.BOOLEAN },
        target_experience: { type: Type.STRING },
        party_archetype: { type: Type.STRING },
        pipeline_mode: { type: Type.STRING },
        encounter_count: { type: Type.INTEGER },
        monster_faction_request: { type: Type.STRING, nullable: true },
        lore_notes: { type: Type.STRING, nullable: true },
        gm_rant: { type: Type.STRING, nullable: true },
        inspiration_velocity: { type: Type.STRING },
        primary_material: { type: Type.STRING },
        toy_list: { type: Type.ARRAY, items: { type: Type.STRING } },
        licensing_mode: { type: Type.STRING },
        export_priority: { type: Type.STRING }
      },
      required: ["setting", "tone", "one_fight_day", "encounter_structure", "is_boss_fight", "pipeline_mode", "licensing_mode", "export_priority", "primary_material"]
    },
    party: {
      type: Type.OBJECT,
      properties: {
        size: { type: Type.INTEGER },
        avg_level: { type: Type.INTEGER },
        tier: { type: Type.INTEGER },
        classes: { type: Type.ARRAY, items: { type: Type.STRING } },
        avg_ac: { type: Type.INTEGER },
        avg_hp_per_pc: { type: Type.INTEGER },
        avg_hp_pool: { type: Type.INTEGER },
        avg_dpr: { type: Type.INTEGER },
        high_threat_pcs: { type: Type.ARRAY, items: { type: Type.STRING } },
        weapon_masteries: { type: Type.ARRAY, items: { type: Type.STRING } },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        vulnerabilities: { type: Type.ARRAY, items: { type: Type.STRING } },
        resource_state: { type: Type.STRING },
        rest_frequency: { type: Type.STRING },
        requested_enemies: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              type: { type: Type.STRING },
              quantity: { type: Type.INTEGER },
              is_stat_locked: { type: Type.BOOLEAN },
              is_fragile: { type: Type.BOOLEAN },
              provided_stats: { type: Type.STRING, nullable: true },
              context: { type: Type.STRING, nullable: true }
            },
            required: ["name", "type", "quantity", "is_stat_locked", "is_fragile"]
          }
        },
        pcs: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              hp: { type: Type.INTEGER },
              ac: { type: Type.INTEGER },
              role: { type: Type.STRING },
              reaction_density: { type: Type.STRING },
              major_magic_items_count: { type: Type.INTEGER }
            },
            required: ["name", "hp", "ac", "dpr", "role", "reaction_density", "major_magic_items_count"]
          }
        },
        roleplay_hooks: { 
          type: Type.ARRAY, 
          items: { 
            type: Type.OBJECT, 
            properties: { 
              pc_name: { type: Type.STRING }, 
              role: { type: Type.STRING, nullable: true },
              hook: { type: Type.STRING, nullable: true },
              general_context: { type: Type.STRING, nullable: true }
            },
            required: ["pc_name", "hook"]
          } 
        },
        is_dpr_estimated: { type: Type.BOOLEAN },
        is_ac_estimated: { type: Type.BOOLEAN },
        is_hp_estimated: { type: Type.BOOLEAN }
      },
      required: ["size", "avg_level", "tier", "classes", "avg_ac", "avg_hp_per_pc", "avg_hp_pool", "avg_dpr", "high_threat_pcs", "weapon_masteries", "strengths", "vulnerabilities", "resource_state", "rest_frequency", "pcs", "roleplay_hooks", "is_dpr_estimated", "is_ac_estimated", "is_hp_estimated"]
    },
    allies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          type: { type: Type.STRING },
          role: { type: Type.STRING },
          quantity: { type: Type.INTEGER },
          avg_dpr: { type: Type.INTEGER, description: "Sustainable average DPR for the ally. Estimate if unknown." },
          is_independent: { type: Type.BOOLEAN },
          dismiss_organically: { type: Type.BOOLEAN },
          stats_provided: { type: Type.BOOLEAN },
          parser_hint: { type: Type.STRING, nullable: true },
          general_context: { type: Type.STRING, nullable: true }
        },
        required: ["name", "type", "role", "quantity", "avg_dpr", "is_independent", "dismiss_organically", "stats_provided"]
      }
    },
    parameters: {
      type: Type.OBJECT,
      properties: {
        target_difficulty: { type: Type.STRING },
        pc_objective: { type: Type.STRING },
        social_out_required: { type: Type.BOOLEAN },
        social_out_context: { type: Type.STRING, nullable: true },
        mythic_encounter: { type: Type.BOOLEAN },
        entry_condition: { type: Type.STRING },
        entry_context: { type: Type.STRING, nullable: true },
        target_outcome: { type: Type.STRING },
        exit_context: { type: Type.STRING, nullable: true },
        let_dice_fall: { type: Type.BOOLEAN },
        tone_guardrails: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true }
      },
      required: ["target_difficulty", "pc_objective", "social_out_required", "mythic_encounter", "entry_condition", "target_outcome", "let_dice_fall"]
    },
    flags: {
      type: Type.OBJECT,
      properties: {
        known_conflicts: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
        suggested_resolutions: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
        missing_information: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true }
      }
    }
  },
  required: ["chain_of_thought_scratchpad", "premise", "party", "parameters", "flags"]
};

export const PppSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    chain_of_thought_scratchpad: { type: Type.STRING },
    power_profile: {
      type: Type.OBJECT,
      properties: {
        tier_classification: { type: Type.STRING },
        primary_threat_vector: { type: Type.STRING },
        subclass_force_multipliers: { type: Type.ARRAY, items: { type: Type.STRING } },
        known_exploits: { type: Type.ARRAY, items: { type: Type.STRING } },
        nova_potential: { type: Type.STRING },
        one_fight_day_flags: {
          type: Type.OBJECT,
          properties: {
            active: { type: Type.BOOLEAN },
            phase_count_required: { type: Type.INTEGER },
            mandatory_initiative_expertise: { type: Type.BOOLEAN },
            concentration_break_required: { type: Type.BOOLEAN },
            xp_budget_modifier: { type: Type.NUMBER }
          },
          required: ["active", "phase_count_required", "mandatory_initiative_expertise", "concentration_break_required", "xp_budget_modifier"]
        },
        recommended_monster_upgrades: {
          type: Type.OBJECT,
          properties: {
            hp_increase_percent: { type: Type.INTEGER },
            initiative_bonus: { type: Type.STRING },
            convert_actions_to_bonus_actions: { type: Type.BOOLEAN },
            unconditional_bps_resistance: { type: Type.BOOLEAN },
            solo_boss_legendary_actions: { type: Type.STRING }
          },
          required: ["hp_increase_percent", "initiative_bonus", "convert_actions_to_bonus_actions", "unconditional_bps_resistance", "solo_boss_legendary_actions"]
        },
        exploit_mitigations: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["tier_classification", "primary_threat_vector", "subclass_force_multipliers", "known_exploits", "nova_potential", "one_fight_day_flags", "recommended_monster_upgrades", "exploit_mitigations"]
    }
  },
  required: ["chain_of_thought_scratchpad", "power_profile"]
};

export const MechanicsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    chain_of_thought_scratchpad: { type: Type.STRING },
    mechanics: {
      type: Type.OBJECT,
      properties: {
        tier: { type: Type.INTEGER },
        xp_budget_raw: { type: Type.INTEGER },
        encounter_multiplier: { type: Type.NUMBER },
        xp_budget_adjusted: { type: Type.INTEGER },
        action_ratio_target: { type: Type.STRING },
        max_ac: { type: Type.INTEGER },
        max_attack_bonus: { type: Type.INTEGER },
        max_save_dc: { type: Type.INTEGER },
        anchor_hp_range: { type: Type.OBJECT, properties: { min: { type: Type.INTEGER }, max: { type: Type.INTEGER } }, required: ["min", "max"] },
        minion_hp_range: { type: Type.OBJECT, properties: { min: { type: Type.INTEGER }, max: { type: Type.INTEGER } }, required: ["min", "max"] },
        total_roster_hp: { type: Type.INTEGER },
        damage_per_round_target: { type: Type.INTEGER },
        legendary_actions_required: { type: Type.INTEGER },
        surrender_threshold: { type: Type.NUMBER },
        mastery_zone_type: { type: Type.STRING },
        mastery_interactions: { type: Type.ARRAY, items: { type: Type.STRING } },
        resource_drain_target: { type: Type.NUMBER },
        mythic_encounter: { type: Type.BOOLEAN },
        estimated_lifespan_rounds: { type: Type.NUMBER },
        nova_risk_flag: { type: Type.BOOLEAN },
        nova_dpr_estimated: {
          type: Type.INTEGER,
          description:
            "The estimated Round-1 nova strike DPR the party can focus onto a single target. " +
            "REQUIRED CALCULATION — do not omit or approximate. " +
            "Formula: nova_dpr_estimated = avg_dpr_per_pc × party_size × nova_multiplier. " +
            "Nova multiplier from PPP nova_potential: High = 3.0, Medium = 2.0, Low = 1.5. " +
            "The Anchor's anchor_hp_range.min MUST be >= this value unless is_fragile is true."
        },
        max_single_action_damage: { type: Type.INTEGER, description: "Hard cap for single-action damage." },
        is_boss_archetype: { type: Type.BOOLEAN, description: "True if the encounter is a Boss fight or Solo Anchor archetype." },
        is_fragile: { type: Type.BOOLEAN, description: "True if the boss is a glass cannon/fragile archetype; bypasses Nova-Proof HP floor." },
        pacing_estimate_minutes: { type: Type.INTEGER },
        slog_risk_warning: { type: Type.BOOLEAN },
        action_budget: {
          type: Type.OBJECT,
          properties: {
            target_effective_actions: { type: Type.INTEGER },
            legendary_actions: { type: Type.INTEGER },
            reaction_pressure: { type: Type.STRING },
            reaction_budget: { type: Type.INTEGER },
            reactive_multi_act: { type: Type.BOOLEAN }
          },
          required: ["target_effective_actions", "legendary_actions", "reaction_pressure", "reaction_budget", "reactive_multi_act"]
        },
        exhaustion_risk: { type: Type.BOOLEAN },
        reliability_counters_required: { type: Type.BOOLEAN },
        phase_triggers: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              phase_name: { type: Type.STRING },
              hp_threshold: { type: Type.INTEGER },
              trigger: { type: Type.STRING },
              effect: { type: Type.STRING },
              budget_shift: { type: Type.NUMBER },
              new_mechanic: { type: Type.STRING },
              sensory_ledger: {
                type: Type.OBJECT,
                properties: {
                  visual: { type: Type.STRING },
                  auditory: { type: Type.STRING },
                  mechanical: { type: Type.STRING }
                },
                required: ["visual", "auditory", "mechanical"]
              },
              narrative_beat: { type: Type.STRING }
            },
            required: ["phase_name", "hp_threshold", "trigger", "effect", "budget_shift", "new_mechanic", "narrative_beat"]
          }
        }
      },
      required: ["tier", "xp_budget_raw", "encounter_multiplier", "xp_budget_adjusted", "action_ratio_target", "max_ac", "max_attack_bonus", "max_save_dc", "anchor_hp_range", "minion_hp_range", "total_roster_hp", "damage_per_round_target", "legendary_actions_required", "surrender_threshold", "mastery_zone_type", "mastery_interactions", "resource_drain_target", "mythic_encounter", "estimated_lifespan_rounds", "nova_risk_flag", "nova_dpr_estimated", "max_single_action_damage", "is_boss_archetype", "is_fragile", "pacing_estimate_minutes", "slog_risk_warning", "action_budget", "phase_triggers"]
    },
    section_7: { type: Type.STRING, description: "Section 7 markdown text" }
  },
  required: ["chain_of_thought_scratchpad", "mechanics", "section_7"]
};

export const MechanistSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    chain_of_thought_scratchpad: { type: Type.STRING },
    actors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["Anchor", "Brute", "Skirmisher", "Artillery"] },
          hp: { type: Type.INTEGER },
          ac: { type: Type.INTEGER },
          dpr: { type: Type.INTEGER },
          speed: { type: Type.INTEGER },
          initiative_bonus: { type: Type.INTEGER },
          behavior_script: { type: Type.STRING },
          design_justification: { type: Type.STRING },
          phases: {
            type: Type.OBJECT,
            properties: {
              is_multi_phase: { type: Type.BOOLEAN },
              initial_state_id: { type: Type.STRING },
              phases: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    phase_id: { type: Type.STRING },
                    trigger: {
                      type: Type.OBJECT,
                      properties: {
                        type: { type: Type.STRING },
                        value: { type: Type.NUMBER },
                        target_actor_id: { type: Type.STRING, nullable: true }
                      },
                      required: ["type", "value"]
                    },
                    hp_pool_behavior: { type: Type.STRING },
                    state_overrides: {
                      type: Type.OBJECT,
                      properties: {
                        ac_override: { type: Type.INTEGER, nullable: true },
                        dpr_override: { type: Type.INTEGER, nullable: true },
                        hp_override: { type: Type.INTEGER, nullable: true },
                        manual_weight_modifier: { type: Type.NUMBER, nullable: true },
                        added_traits: { type: Type.ARRAY, items: { type: Type.STRING } },
                        removed_traits: { type: Type.ARRAY, items: { type: Type.STRING } },
                        new_actions: { type: Type.ARRAY, items: { type: Type.STRING } }
                      }
                    },
                    narrative_beat: { type: Type.STRING },
                    environment_shift: {
                      type: Type.OBJECT,
                      properties: {
                        flux_axis_impact: { type: Type.STRING, nullable: true },
                        description: { type: Type.STRING, nullable: true }
                      },
                      nullable: true
                    }
                  },
                  required: ["phase_id", "trigger", "hp_pool_behavior", "state_overrides", "narrative_beat"]
                }
              }
            },
            required: ["is_multi_phase", "phases"]
          }
        },
        required: ["name", "type", "hp", "ac", "dpr", "speed", "initiative_bonus", "behavior_script", "design_justification"]
      }
    },
    section_5_actors: { type: Type.STRING },
    mission_stat_block: { type: Type.STRING },
    initiative_tracker: { type: Type.STRING }
  },
  required: ["chain_of_thought_scratchpad", "actors", "section_5_actors", "mission_stat_block", "initiative_tracker"]
};

export const CartographerSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    chain_of_thought_scratchpad: { type: Type.STRING },
    grid_dimensions: {
      type: Type.OBJECT,
      properties: {
        width: { type: Type.INTEGER },
        height: { type: Type.INTEGER }
      },
      required: ["width", "height"]
    },
    axes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["Protein", "Multiplier", "Hazard", "Flux"] },
          current_state: { type: Type.STRING },
          telegraph: { type: Type.STRING },
          automatic_trigger: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ["Tick Rate (Init 20)", "Threshold (%)"] },
              details: { type: Type.STRING }
            },
            required: ["type", "details"]
          },
          manual_lever: {
            type: Type.OBJECT,
            properties: {
              action_type: { type: Type.STRING, enum: ["Utilize", "Study", "Search", "Magic"] },
              dc: { type: Type.INTEGER },
              effect: { type: Type.STRING }
            },
            required: ["action_type", "dc", "effect"]
          },
          failing_forward_rider: { type: Type.STRING },
          force_multiplier_value: { type: Type.STRING },
          social_out_trigger: { type: Type.BOOLEAN },
          choice_mandate: { type: Type.STRING }
        },
        required: ["name", "type", "current_state", "telegraph", "automatic_trigger", "manual_lever", "failing_forward_rider", "force_multiplier_value", "social_out_trigger", "choice_mandate"]
      }
    },
    section_4_zones: { type: Type.STRING },
    section_6_timeline: { type: Type.STRING }
  },
  required: ["chain_of_thought_scratchpad", "grid_dimensions", "axes", "section_4_zones", "section_6_timeline"]
};

export const NarrativeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    chain_of_thought_scratchpad: { type: Type.STRING },
    interactive_points: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          point: { type: Type.STRING },
          gm_instruction: { type: Type.STRING }
        },
        required: ["point", "gm_instruction"]
      }
    },
    gm_cinematic_beats: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          round: { type: Type.INTEGER },
          beat: { type: Type.STRING },
          mechanical_trigger: { type: Type.STRING }
        },
        required: ["round", "beat", "mechanical_trigger"]
      }
    },
    sensory_details: {
      type: Type.OBJECT,
      properties: {
        sight: { type: Type.STRING },
        sound: { type: Type.STRING },
        smell: { type: Type.STRING },
        lighting: { type: Type.STRING }
      },
      required: ["sight", "sound", "smell", "lighting"]
    },
    section_1_cover: { type: Type.STRING },
    section_8_hooks: { type: Type.STRING }
  },
  required: ["chain_of_thought_scratchpad", "interactive_points", "gm_cinematic_beats", "sensory_details", "section_1_cover", "section_8_hooks"]
};

export const AuditorSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    chain_of_thought_scratchpad: { type: Type.STRING },
    section_2_gm_summary: { type: Type.STRING },
    section_10_design_notes: { type: Type.STRING },
    final_compiled_markdown: {
      type: Type.STRING,
      description: "The fully assembled encounter document (Sections 1–10), without the validation report appended."
    },
    validation_passed: {
      type: Type.BOOLEAN,
      description: "true if every check in the Cross-Bot Validation Checklist passed, false if any failed."
    },
    validation_report: {
      type: Type.OBJECT,
      properties: {
        nova_proof_status: { type: Type.STRING },
        checklist: { type: Type.STRING },
        conflict_notes: { type: Type.STRING },
        ally_weight_audit: { type: Type.STRING },
        lethality_ratio_check: { type: Type.STRING },
        narrative_consistency: { type: Type.STRING },
        critical_math_errors: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["nova_proof_status", "checklist", "conflict_notes", "ally_weight_audit", "lethality_ratio_check", "narrative_consistency", "critical_math_errors"]
    }
  },
  required: ["chain_of_thought_scratchpad", "section_2_gm_summary", "section_10_design_notes", "final_compiled_markdown", "validation_passed", "validation_report"]
};

export const SummaristSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    chain_of_thought_scratchpad: { type: Type.STRING },
    tactical_summary_markdown: { type: Type.STRING }
  },
  required: ["chain_of_thought_scratchpad", "tactical_summary_markdown"]
};

export const StylistSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    chain_of_thought_scratchpad: { type: Type.STRING },
    styled_output: { type: Type.STRING }
  },
  required: ["chain_of_thought_scratchpad", "styled_output"]
};

export const PublisherSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    chain_of_thought_scratchpad: { type: Type.STRING },
    semantic_markdown: { type: Type.STRING },
    vtt_section: { type: Type.STRING }
  },
  required: ["chain_of_thought_scratchpad", "semantic_markdown", "vtt_section"]
};
