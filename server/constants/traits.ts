/**
 * STABILITY_TRAITS_LIBRARY
 * A set of standardized 5.5e mechanical anchors to prevent anti-climactic
 * encounter endings due to displacement masteries.
 */
export const STABILITY_TRAITS = {
  SURE_FOOTED: {
    name: "Sure-Footed",
    description: "The creature has advantage on Strength and Dexterity saving throws made against being knocked prone or moved against its will.",
    design_intent: "Counter to Topple and Push masteries for heavy/stable anchors."
  },
  ANCHORED: {
    name: "Anchored",
    description: "The creature is immune to any effect that would move it against its will or knock it prone while it is on the ground.",
    design_intent: "Hard-counter for Bosses in high-verticality zones (Cliffs/Pits)."
  },
  REACTIVE_RECOVERY: {
    name: "Reactive Recovery",
    description: "Reaction: If the creature is moved against its will or knocked prone, it can immediately move up to half its speed without provoking opportunity attacks and stand up if it is prone.",
    design_intent: "High-mobility counter to displacement; maintains tactical positioning."
  },
  UNSTOPPABLE_MOMENTUM: {
    name: "Unstoppable Momentum",
    description: "The creature is immune to the Slowed and Restrained conditions. Its speed cannot be reduced below 10 feet.",
    design_intent: "Counter to Slow and Sap masteries; prevents 'Action Denial' locks."
  }
};
