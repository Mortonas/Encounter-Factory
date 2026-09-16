import { BaseBotHandler } from "../baseBotHandler.js";
import { 
  FullPipelineState, 
  PipelineStep,
  GMSetup
} from "../../types.js";
import { buildPrompt } from "../../constants/prompts.js";
import { TacticalBriefingService } from "../tacticalBriefingService.js";
import * as MathUtils from "../math/utils.js";

/**
 * BOT 8: DESKTOP PUBLISHER
 * Assembles all encounter data into a high-fidelity "Grimoire" HTML document.
 * Uses generateRawWithRetry to handle large HTML payloads without JSON escaping issues.
 */
export class PublisherHandler extends BaseBotHandler {
  readonly stepId = PipelineStep.BOT_8_PUBLISHER;

  constructor(private ai: any) {
    super();
  }

  async execute(
    state: FullPipelineState, 
    setup: GMSetup, 
    auditorFeedback?: string
  ): Promise<FullPipelineState> {
    console.log(`[PUBLISHER_HANDLER] Executing Bot 8 (Publisher) logic...`);

    const tacticalBriefing = TacticalBriefingService.generate(state);
    
    // Derive Resilience Tier for Bot 8 Context
    const rf = state.mechanics?.mechanics?.resilience_factor || 0;
    let resilienceTier = "Low";
    if (rf >= 1.0) resilienceTier = "Mythic";
    else if (rf >= 0.7) resilienceTier = "High";
    else if (rf >= 0.4) resilienceTier = "Medium";

    // We modify the context slightly to tell the bot we want RAW output with markers
    const rawInstruction = `
=== RAW OUTPUT FORMAT ===
You are in RAW output mode. DO NOT output a JSON block. 
Instead, output your content using these exact markers:

[SCRATCHPAD]
(Your internal analysis)
[/SCRATCHPAD]

[SEMANTIC_HTML]
(The high-fidelity HTML body content for the player-facing handout)
[/SEMANTIC_HTML]

[TACTICAL_BRIEFING_MARKDOWN]
# TACTICAL BRIEFING: GM EYES ONLY
**Kill Clock:** ${tacticalBriefing.survival_range.min_rounds}–${tacticalBriefing.survival_range.max_rounds} Rounds.
${tacticalBriefing.kill_clock_outlook}

## Mastery Interactions & Levers
${tacticalBriefing.mastery_levers.map(l => `- **${l.toy_name}**: ${l.trigger} -> ${l.synergy}`).join("\n")}

## Strategic Advice
(Synthesize your tactical advice here based on the constraints above. Explain how the enemies should play to maximize their survival within the Kill Clock range.)
[/TACTICAL_BRIEFING_MARKDOWN]

[VTT_MARKDOWN]
(The callout-based markdown for VTT export)
[/VTT_MARKDOWN]

=== NON-NEGOTIABLE CONSTRAINTS ===
- You MUST use the Kill Clock rounds: ${tacticalBriefing.survival_range.min_rounds} to ${tacticalBriefing.survival_range.max_rounds}.
- You MUST mention the Mastery Synergies identified in the briefing data.
- The TACTICAL_BRIEFING_MARKDOWN must be formatted precisely as shown above.
`;

    const prompt = buildPrompt(
      this.stepId, 
      { 
        id: this.stepId, 
        mcd: state.mcd!, 
        mechanics: state.mechanics!,
        section_1_3_8_narrative: state.section_1_3_8_narrative,
        section_4_zones_structured: state.section_4_zones_structured,
        section_5_actors_structured: state.section_5_actors_structured,
        section_6_timeline: state.section_6_timeline,
        tactical_briefing_data: tacticalBriefing,
        resilience_tier: resilienceTier
      }, 
      setup.gmOverrides, 
      setup.gmNotes, 
      setup.gmConcerns, 
      auditorFeedback
    ) + rawInstruction;
    
    const validated = await this.generateRawWithRetry<{ 
      semantic_markdown: string; 
      vtt_section: string; 
      tactical_briefing_markdown: string 
    }>(
      this.ai,
      prompt,
      {
        state,
        model: "models/gemini-flash-latest",
        auditorFeedback,
        customValidation: (raw) => {
          const semanticMatch = raw.match(/\[SEMANTIC_HTML\]([\s\S]*?)\[\/SEMANTIC_HTML\]/i);
          const vttMatch = raw.match(/\[VTT_MARKDOWN\]([\s\S]*?)\[\/VTT_MARKDOWN\]/i);
          const briefingMatch = raw.match(/\[TACTICAL_BRIEFING_MARKDOWN\]([\s\S]*?)\[\/TACTICAL_BRIEFING_MARKDOWN\]/i);

          return {
            semantic_markdown: semanticMatch ? semanticMatch[1].trim() : "",
            vtt_section: vttMatch ? vttMatch[1].trim() : "",
            tactical_briefing_markdown: briefingMatch ? briefingMatch[1].trim() : ""
          };
        }
      }
    ) as { semantic_markdown: string; vtt_section: string; tactical_briefing_markdown: string };

    // Calculate Anchor EHP, Minions EHP, and Lethality Ratio dynamically
    const anchor = state.section_5_actors_structured?.actors.find(a => a.type === "Anchor") || state.section_5_actors_structured?.actors[0];
    let anchorEhp = "Unknown";
    if (anchor && state.math_engine_targets) {
      const { totalEhp } = MathUtils.calculateAggregateEHP(
        anchor.hp,
        anchor.ac,
        anchor.dpr,
        anchor.phases || [],
        state.math_engine_targets.sustained_dpr
      );
      anchorEhp = Math.round(totalEhp).toString();
    }
    let minionEhp = "Unknown";
    if (state.section_5_actors_structured) {
      const minions = state.section_5_actors_structured.actors.filter(a => a.type !== "Anchor");
      minionEhp = minions.reduce((sum, a) => sum + a.hp, 0).toString();
    }
    const damageTarget = state.mechanics?.mechanics?.damage_per_round_target || 0;
    const rosterHp = state.mechanics?.mechanics?.total_roster_hp || 1;
    const lethalityRatio = damageTarget > 0 ? (damageTarget / rosterHp).toFixed(2) : "Unknown";

    // Construct the Mechanical Appendix (Raw Math)
    const mechanicalAppendix = `
<!-- MECHANICAL APPENDIX START -->
### MECHANICAL APPENDIX: DESIGN DERIVATIONS
**Anchor EHP:** ${anchorEhp} | **Minions Total EHP:** ${minionEhp}
**Party Avg DPR:** ${state.mcd?.party?.avg_dpr ?? "Unknown"} | **Party Nova Peak:** ${state.mcd?.party?.avg_dpr ? Math.round(state.mcd.party.avg_dpr * 1.5) : "Unknown"}
**Kill Clock Logic:** Boss Lifespan = Anchor EHP / (Party DPR * Variance)
**Lethality Ratio:** ${lethalityRatio} (Target: 0.40) | **Resilience Budget:** Factor ${state.mechanics?.mechanics?.resilience_factor ?? 0} (${state.mechanics?.mechanics?.resilience_requirement ? "Required" : "Optional"})
<!-- MECHANICAL APPENDIX END -->
`.trim();

    return {
      ...state,
      section_7_8_publisher: {
        chain_of_thought_scratchpad: "Publisher completed successfully.",
        semantic_markdown: validated.semantic_markdown,
        vtt_section: validated.vtt_section,
      },
      publisher_output: `
<!-- TACTICAL BRIEFING START -->
${validated.tactical_briefing_markdown}
<!-- TACTICAL BRIEFING END -->

${validated.semantic_markdown}

${mechanicalAppendix}
`.trim(),
      tactical_briefing: {
        ...tacticalBriefing,
        gm_advice: validated.tactical_briefing_markdown
      }
    };
  }

  /**
   * STRUCTURAL MARKER VALIDATION
   */
  protected onValidate(data: any, state: FullPipelineState, rawText?: string): void {
    // 1. Base Validation (Commitment Bias / Scratchpad Order)
    super.onValidate(data, state, rawText);

    // If we are validating the parsed object from customValidation
    if (typeof data === 'object' && data !== null) {
      if (!data.semantic_markdown) {
        throw new Error("Missing [SEMANTIC_HTML] content. The handout requires high-fidelity HTML assembly.");
      }
      if (!data.tactical_briefing_markdown) {
        throw new Error("Missing [TACTICAL_BRIEFING_MARKDOWN] content. GM-eyes-only tactical advice is mandatory.");
      }
    }
  }
}
