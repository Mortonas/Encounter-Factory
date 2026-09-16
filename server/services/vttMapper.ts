
/**
 * VTT Mapper
 * Repository-layer utility for mapping 5.5e Weapon Masteries to VTT-specific metadata.
 */
export const VTT_MASTERY_MAPPINGS: Record<string, { foundry: string; roll20: string; description: string }> = {
  "Push": {
    foundry: "status.forcedMovement",
    roll20: "[[10ft Push]]",
    description: "Automatic 10ft push (Large or smaller). No save."
  },
  "Topple": {
    foundry: "status.prone",
    roll20: "Condition: Prone",
    description: "DC (8+Prof+Mod) Con save or fall Prone."
  },
  "Slow": {
    foundry: "status.slowed",
    roll20: "-10ft Speed",
    description: "-10ft Speed until start of next turn."
  },
  "Sap": {
    foundry: "status.disadvantage",
    roll20: "Disadv. next attack",
    description: "Disadvantage on next attack roll."
  }
};

export class VTTMapper {
  /**
   * Generates a metadata block for a specific axis based on its mastery synergies.
   */
  static generateMasteryMetadata(synergies: string[]): any {
    const metadata: any = {
      foundry_tags: [],
      roll20_macros: [],
      mastery_notes: []
    };

    synergies.forEach(mastery => {
      const mapping = VTT_MASTERY_MAPPINGS[mastery];
      if (mapping) {
        metadata.foundry_tags.push(mapping.foundry);
        metadata.roll20_macros.push(mapping.roll20);
        metadata.mastery_notes.push(`${mastery}: ${mapping.description}`);
      }
    });

    return metadata;
  }
}
