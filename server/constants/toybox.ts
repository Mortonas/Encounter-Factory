/**
 * THE TOYBOX REGISTRY v1.0
 * Professional-grade mechanical archetypes for D&D 2024 (5.5e).
 * Each toy decouple mechanical math from narrative "skinning".
 */

export interface ToyBlueprint {
  id: string;
  label: string;
  archetype: "Protein" | "Multiplier" | "Hazard" | "Flux";
  mechanical_intent: string;
  trigger_action: "Utilize" | "Study" | "Search" | "Magic";
  passive_trigger?: string;
  placement_logic: string;
  synergy_tags: string[];
  base_math: {
    dmg_multiplier: number; // Factor of Avg_PC_DPR or EPL
    dc_offset: number;     // Offset from target_max_dc
  };
  valuation_weight?: number; // Virtual damage weight for Flux (Action Denial)
}

export const TOYBOX_REGISTRY: ToyBlueprint[] = [
  {
    id: "T-01",
    label: "The Kinetic Pillar",
    archetype: "Hazard",
    mechanical_intent: "Circular AOE Damage + Forced Movement (Push)",
    trigger_action: "Utilize",
    passive_trigger: "Creatures forced into this space take damage and are pushed 10ft away.",
    placement_logic: "Place 10ft behind the Boss. Rewards Martials with Push mastery.",
    synergy_tags: ["Forced_Movement", "Collision"],
    base_math: { dmg_multiplier: 2.0, dc_offset: -2 }
  },
  {
    id: "T-04",
    label: "The Gravity Well",
    archetype: "Flux",
    mechanical_intent: "Action Denial + Difficult Terrain",
    trigger_action: "Study",
    passive_trigger: "Creatures starting their turn here have speed halved and cannot take Reactions.",
    placement_logic: "Place in the center of the arena. Forces tactical repositioning.",
    synergy_tags: ["Crowd_Control", "Reaction_Lock"],
    base_math: { dmg_multiplier: 0, dc_offset: 0 },
    valuation_weight: 0.8 // Halved speed + Reaction lock
  },
  {
    id: "T-07",
    label: "The Arcane Relay",
    archetype: "Multiplier",
    mechanical_intent: "Damage Buff + Status Clear",
    trigger_action: "Magic",
    passive_trigger: "Creatures standing adjacent gain +1d8 damage to attacks.",
    placement_logic: "Place in high-risk zones (e.g. adjacent to hazards) to create 'High Risk, High Reward' play.",
    synergy_tags: ["Buff", "Action_Efficiency"],
    base_math: { dmg_multiplier: 1.5, dc_offset: -2 }
  },
  {
    id: "T-10",
    label: "The Fragile Floor",
    archetype: "Hazard",
    mechanical_intent: "Fall Damage + Prone + Trap",
    trigger_action: "Search",
    passive_trigger: "Creatures with Huge+ size or falling into space trigger collapse.",
    placement_logic: "Place near ranged PCs or under 'Topple' mastery targets.",
    synergy_tags: ["Environmental_Kill", "Hazard_Zone"],
    base_math: { dmg_multiplier: 3.0, dc_offset: 0 }
  },
  {
    id: "T-12",
    label: "The Resonant Bell",
    archetype: "Flux",
    mechanical_intent: "Stun (1 round) + Auditory Telegraph",
    trigger_action: "Utilize",
    passive_trigger: "Sonic damage triggers the bell automatically.",
    placement_logic: "Place 30ft away from the primary combat zone. Rewards high-mobility strikers.",
    synergy_tags: ["Condition_Stun", "Telegraph"],
    base_math: { dmg_multiplier: 1.0, dc_offset: +2 },
    valuation_weight: 1.5 // Stun (1 round)
  },
  {
    id: "T-15",
    label: "The Magnetic Valve",
    archetype: "Flux",
    mechanical_intent: "Mass Pull (30ft) + Cluster Formation",
    trigger_action: "Study",
    passive_trigger: "Creatures wearing heavy metal armor have -10ft speed while within 20ft.",
    placement_logic: "Place to cluster enemies for Wizard AOEs.",
    synergy_tags: ["Movement_Force", "AOE_Setup"],
    base_math: { dmg_multiplier: 0, dc_offset: -2 },
    valuation_weight: 0.6 // Mass Pull (setup)
  },
  {
    id: "T-18",
    label: "The Healing Font",
    archetype: "Protein",
    mechanical_intent: "Health Recovery + Condition Removal",
    trigger_action: "Magic",
    passive_trigger: "First time entering per round clears one minor condition (Poisoned/Blind).",
    placement_logic: "Place behind the party's starting line. Creates a 'Base of Operations'.",
    synergy_tags: ["Heal", "Condition_Clear"],
    base_math: { dmg_multiplier: 1.0, dc_offset: -4 }
  },
  {
    id: "T-21",
    label: "The Spiked Barricade",
    archetype: "Hazard",
    mechanical_intent: "Reliable Damage + Cover",
    trigger_action: "Utilize",
    passive_trigger: "Creatures pushed into the barricade take automatic bleed damage.",
    placement_logic: "Place in diagonal lines across the grid to break Line of Sight.",
    synergy_tags: ["Cover", "Collision"],
    base_math: { dmg_multiplier: 1.2, dc_offset: 0 }
  },
  {
    id: "T-24",
    label: "The Overload Capacitor",
    archetype: "Multiplier",
    mechanical_intent: "Mass Stun + Chain Damage",
    trigger_action: "Magic",
    passive_trigger: "Lightning damage to the capacitor triggers a 20ft explosion.",
    placement_logic: "Place near large clusters of minions.",
    synergy_tags: ["Explosion", "Action_Efficiency"],
    base_math: { dmg_multiplier: 4.0, dc_offset: +2 }
  },
  {
    id: "T-27",
    label: "The Steam Vent",
    archetype: "Hazard",
    mechanical_intent: "Obscurement + Fire Damage",
    trigger_action: "Search",
    passive_trigger: "Fire damage to the vent doubles the obscurement radius.",
    placement_logic: "Place near the Boss to protect it from ranged PC 'Nova' fire.",
    synergy_tags: ["Obscurement", "Hazard_Zone"],
    base_math: { dmg_multiplier: 1.8, dc_offset: 0 }
  }
];
