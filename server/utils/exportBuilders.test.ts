import { describe, expect, it } from "vitest";
import type { FullPipelineState } from "../types.js";
import { buildObsidianMarkdown, buildVttMarkdown } from "./exportBuilders.js";

const baseState: FullPipelineState = {
  mcd: {
    chain_of_thought_scratchpad: "Briefed.",
    premise: {
      setting: "Moon Gate | North\nVault",
      antagonist_goal: "Open the gate",
      pc_objective: "Seal the breach",
      tone: "Mythic \"urgent\""
    },
    parameters: {
      target_difficulty: "Deadly | tuned",
      encounter_type: "Boss",
      pc_objective: "Seal | the breach\nbefore round 5",
      tone_guardrails: "Tense"
    },
    party: {
      size: 4,
      avg_level: 7,
      avg_dpr: 88,
      nova_potential: "high",
      optimization_level: "high",
      magic_items: ["Flame tongue"],
      pcs: []
    },
    constraints: {
      hard_limits: [],
      requested_monsters: [],
      requested_allies: [],
      terrain_must_haves: []
    },
    primary_material: "Obsidian",
    reference_style: "Tactical"
  } as any,
  mechanics: {
    chain_of_thought_scratchpad: "Math.",
    mechanics: {
      xp_budget_adjusted: 5000,
      total_roster_hp: 420,
      damage_per_round_target: 84,
      estimated_lifespan_rounds: 5,
      nova_risk_flag: true,
      nova_dpr_estimated: 160
    }
  } as any,
  section_5_actors_structured: {
    chain_of_thought_scratchpad: "Actors.",
    actors: [
      {
        name: "Gate Warden | Prime",
        type: "Anchor",
        hp: 240,
        ac: 18,
        dpr: 48,
        size: "Large",
        speed: 30,
        initiative_bonus: 4,
        behavior_script: "Round 1: mark the cleric | split party.\nRound 2: punish clustered PCs.",
        design_justification: "Anchor pressure.",
        traits: ["Reactive", "Magic Resistance"],
        actions: ["Moon cleave | recharge", "Gravity pulse"],
        phases: [
          {
            phase_id: "bloodied|gravity",
            trigger: { type: "HP_THRESHOLD", value: 0.5 },
            hp_pool_behavior: "CONTINUOUS",
            state_overrides: {
              ac_override: 19,
              dpr_override: 56,
              added_traits: ["Custom"],
              removed_traits: [],
              new_actions: ["Pull stars inward | DC 16"]
            },
            narrative_beat: "The gate folds inward | shadows lengthen.",
            counter_play: {
              trigger: "Radiant damage | Study",
              effect: "Suppresses gravity surge\nfor one round.",
              ehp_offset: 0.1
            },
            environment_shift: {
              flux_axis_impact: "Gravity",
              description: "Low gravity lanes rotate | every round."
            }
          }
        ],
        temp_hp: 0,
        is_untargetable: false,
        is_invulnerable: false,
        stall_until_round: null,
        last_phase_transition_round: null,
        current_phase_id: null
      },
      {
        name: "Mirror Acolyte",
        type: "Artillery",
        hp: 52,
        ac: 14,
        dpr: 22,
        size: "Medium",
        speed: 30,
        initiative_bonus: -1,
        behavior_script: "Stay behind mirrors and force saves.",
        design_justification: "Backline timer.",
        traits: [],
        actions: [],
        temp_hp: 0,
        is_untargetable: false,
        is_invulnerable: false,
        stall_until_round: null,
        last_phase_transition_round: null,
        current_phase_id: null
      }
    ],
    section_5_actors: "Actors.",
    mission_stat_block: "Stats.",
    initiative_tracker: "Tracker."
  },
  section_4_zones_structured: {
    chain_of_thought_scratchpad: "Map.",
    grid_dimensions: { width: 12, height: 10 },
    axes: [
      {
        name: "Moon Lens | Array",
        type: "Hazard",
        appearance: "Silver lenses",
        current_state: "Charged",
        telegraph: "White light crawls across the floor | then snaps upward.",
        tactical_clue: "Lens hum.",
        interaction_trigger: "Push",
        passive_trigger: "Forced movement",
        state_change: "Beam redirects.",
        once_per_encounter: true,
        mastery_synergies: ["Push"],
        size_constraint: "Large",
        activation_distance: 5,
        automatic_trigger: { type: "Tick Rate (Init 20)", details: "Fires at initiative 20 | targets largest cluster." },
        manual_lever: { action_type: "Study", dc: 15, effect: "Invert beam | grants cover for one round." },
        failing_forward_rider: "Takes radiant damage\nbut reveals the safe lane.",
        force_multiplier_value: "Hits 3+ targets.",
        social_out_trigger: false,
        choice_mandate: "Move or manipulate.",
        virtual_value_weight: 1.2
      }
    ],
    section_4_zones: "Zones.",
    section_6_timeline: "Timeline."
  },
  section_1_3_8_narrative: {
    chain_of_thought_scratchpad: "Narrative.",
    interactive_points: [
      {
        point: "Cracked lens | humming",
        gm_instruction: "A Search check reveals a bypass.\nFailure still marks the true beam path."
      }
    ],
    gm_cinematic_beats: [
      { round: 1, beat: "The gate exhales | blue fire.", mechanical_trigger: "Initiative 20 beam" }
    ],
    sensory_details: {
      sight: "Blue light | black stone",
      sound: "Glass chime\nlow thunder",
      smell: "Cold iron",
      lighting: "Moonlit dimness"
    },
    section_1_cover: "The Moon Gate opens.\nIts shadow points at the party.",
    section_8_hooks: "Hooks."
  },
  tactical_briefing: {
    kill_clock_outlook: "The anchor survives the nova but cannot ignore forced movement.",
    survival_range: { min_rounds: 3, max_rounds: 5, justification: "EHP vs sustained DPR." },
    mastery_levers: [
      { toy_name: "Moon Lens", trigger: "Push", synergy: "Redirects the beam" }
    ],
    lethality_warnings: ["Clustered PCs can be punished | hard."],
    gm_advice: "Start wide.\nSpend reactions on movement denial."
  }
};

describe("export Markdown builders", () => {
  it("builds a deterministic VTT fallback packet when the AI VTT section is missing", () => {
    const markdown = buildVttMarkdown(baseState);

    expect(markdown).toContain("# Moon Gate | North Vault - VTT Tactical Packet");
    expect(markdown).toContain("## Mechanical Benchmarks");
    expect(markdown).toContain("- Target DPR: 84");
    expect(markdown).toContain("| Gate Warden \\| Prime | bloodied\\|gravity | 240 | 19 | 56 | HP_THRESHOLD 0.5 |");
    expect(markdown).toContain("| Mirror Acolyte | Base | 52 | 14 | 22 | Start of encounter |");
    expect(markdown).toContain("### Moon Lens | Array (Hazard)");
    expect(markdown).toContain("No AI-authored VTT section generated. Deterministic fallback packet above is complete.");
  });

  it("preserves AI VTT content while still including deterministic actors, phases, and math", () => {
    const markdown = buildVttMarkdown({
      ...baseState,
      section_7_8_publisher: {
        chain_of_thought_scratchpad: "Done.",
        semantic_markdown: "<section>Handout</section>",
        vtt_section: "### AI VTT Notes\n- Imported token notes."
      }
    });

    expect(markdown).toContain("### AI VTT Notes");
    expect(markdown).toContain("- Imported token notes.");
    expect(markdown).toContain("## Actor Phase Table");
    expect(markdown).toContain("- Nova DPR estimate: 160");
  });

  it("escapes Obsidian YAML, tables, and callout content without dropping multiline text", () => {
    const markdown = buildObsidianMarkdown(baseState);

    expect(markdown).toContain('location: "Moon Gate | North\\nVault"');
    expect(markdown).toContain('tone: "Mythic \\"urgent\\""');
    expect(markdown).toContain('objective: "Seal | the breach\\nbefore round 5"');
    expect(markdown).toContain("| Gate Warden \\| Prime | Anchor | 18 | 240 | 48 | Round 1: mark the cleric \\| split party. Round 2: punish clustered PCs. |");
    expect(markdown).toContain("> The Moon Gate opens.");
    expect(markdown).toContain("> Its shadow points at the party.");
    expect(markdown).toContain("> Failure still marks the true beam path.");
    expect(markdown).toContain("```markdown");
    expect(markdown).toContain("# Moon Gate | North Vault - VTT Tactical Packet");
  });

  it("handles missing optional sections with explicit placeholders", () => {
    const sparseState: FullPipelineState = {
      mcd: {
        premise: { setting: "Sparse Room" },
        parameters: {},
        party: {}
      } as any
    };

    const vtt = buildVttMarkdown(sparseState);
    const obsidian = buildObsidianMarkdown(sparseState);

    expect(vtt).toContain("- Mechanics block missing.");
    expect(vtt).toContain("| No actors defined | Base | -- | -- | -- | -- | -- |");
    expect(vtt).toContain("No map hazards defined.");
    expect(vtt).toContain("No tactical briefing generated.");
    expect(obsidian).toContain('location: "Sparse Room"');
    expect(obsidian).toContain("> [!abstract] No tactical points defined.");
    expect(obsidian).toContain("> [!abstract] No hazards defined.");
    expect(obsidian).toContain("| No actors defined | -- | -- | -- | -- | -- |");
  });
});
