/**
 * Public-preview class registry.
 *
 * This intentionally contains only broad, original tactical categories. It does
 * not reproduce subclass rules or summaries from non-SRD books. Unknown
 * subclasses remain user-supplied labels and receive no privileged mechanics.
 */

export interface SubclassProfile {
  name: string;
  forceMultiplierTier: "S+" | "S" | "A" | "B" | "C";
  keyFeatures: string[];
  novaTriggers: string[];
  tacticalWeaknesses: { weakness: string; gmCounterplay: string }[];
  magicItemPrescriptions: { item_name: string; benefit: string; rule_reference: string; sourceNote?: string }[];
  itemsToAvoid: { item_name: string; warning: string; sourceNote?: string }[];
  novaEstimates: { level: 5 | 8 | 11; roundOneMaxDamage: string; sustainedDPR: string; anchorHPFloor: number }[];
  synergyFlags: string[];
  verified: boolean;
  sourceNote: string;
  versionConflict?: string;
}

export interface ClassProfile {
  name: string;
  baseTier: "S" | "A" | "B" | "C";
  baseFeatures: string[];
  baseWeaknesses: string[];
  subclasses: Record<string, SubclassProfile>;
}

const profile = (name: string, baseFeatures: string[], baseWeaknesses: string[]): ClassProfile => ({
  name,
  baseTier: "B",
  baseFeatures,
  baseWeaknesses,
  subclasses: {}
});

export const CLASS_REGISTRY: Record<string, ClassProfile> = {
  Barbarian: profile("Barbarian", ["durable close-range pressure", "resource-limited damage resistance"], ["limited reach", "mental and ranged pressure"]),
  Bard: profile("Bard", ["flexible support", "skill and control options"], ["limited peak durability", "resource timing"]),
  Cleric: profile("Cleric", ["defensive support", "restorative and area tools"], ["concentration pressure", "competing action priorities"]),
  Druid: profile("Druid", ["battlefield control", "adaptable forms and support"], ["concentration pressure", "resource timing"]),
  Fighter: profile("Fighter", ["reliable weapon pressure", "short-burst action flexibility"], ["limited answers to distant control", "resource timing"]),
  Monk: profile("Monk", ["mobility", "short-range disruption"], ["limited durability", "resource pressure"]),
  Paladin: profile("Paladin", ["durable close-range support", "burst damage"], ["limited reach", "competing resource demands"]),
  Ranger: profile("Ranger", ["mobile weapon pressure", "exploration and support tools"], ["concentration pressure", "split tactical priorities"]),
  Rogue: profile("Rogue", ["mobility", "single-target precision"], ["limited multi-target pressure", "accuracy dependence"]),
  Sorcerer: profile("Sorcerer", ["flexible spell shaping", "burst casting"], ["limited durability", "resource pressure"]),
  Warlock: profile("Warlock", ["repeatable ranged pressure", "short-rest resources"], ["limited spell slots", "position dependence"]),
  Wizard: profile("Wizard", ["broad spell utility", "battlefield control"], ["limited durability", "concentration pressure"])
};
