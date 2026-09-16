import type { FullPipelineState } from "../types.js";

type MarkdownValue = string | number | boolean | null | undefined;

const UNKNOWN = "Unknown";

function text(value: MarkdownValue, fallback = UNKNOWN): string {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : fallback;
}

function oneLine(value: MarkdownValue, fallback = UNKNOWN): string {
  return text(value, fallback).replace(/\s+/g, " ");
}

function escapeTableCell(value: MarkdownValue, fallback = UNKNOWN): string {
  return oneLine(value, fallback).replace(/\|/g, "\\|");
}

function escapeYamlString(value: MarkdownValue, fallback = UNKNOWN): string {
  return text(value, fallback)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, "\\n");
}

function slugTag(value: MarkdownValue): string {
  return oneLine(value, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function quoteBlock(value: MarkdownValue, fallback = "No details provided."): string {
  return text(value, fallback)
    .split(/\r?\n/)
    .map(line => `> ${line}`)
    .join("\n");
}

function bulletList(values: MarkdownValue[], fallback = "- None specified."): string {
  const cleanValues = values.map(value => text(value, "")).filter(Boolean);
  if (cleanValues.length === 0) return fallback;
  return cleanValues.map(value => `- ${value}`).join("\n");
}

function joinText(value: MarkdownValue | MarkdownValue[], fallback = UNKNOWN): string {
  if (Array.isArray(value)) return text(value.map(item => text(item, "")).filter(Boolean).join(", "), fallback);
  return text(value, fallback);
}

function getAiVttSection(state: FullPipelineState): string {
  return text(
    state.vtt_section || state.section_7_8_publisher?.vtt_section || state.section_9_10_stylist?.vtt_section,
    ""
  );
}

function buildActorPhaseRows(state: FullPipelineState): string[] {
  const rows: string[] = [];
  const actors = state.section_5_actors_structured?.actors ?? [];

  for (const actor of actors) {
    const phases = actor.phases ?? [];
    if (phases.length === 0) {
      rows.push(`| ${escapeTableCell(actor.name)} | Base | ${actor.hp} | ${actor.ac} | ${actor.dpr} | Start of encounter | ${escapeTableCell(actor.behavior_script)} |`);
      continue;
    }

    for (const phase of phases) {
      const hp = phase.state_overrides.hp_override ?? actor.hp;
      const ac = phase.state_overrides.ac_override ?? actor.ac;
      const dpr = phase.state_overrides.dpr_override ?? actor.dpr;
      const trigger = `${phase.trigger.type} ${phase.trigger.value}`;
      const notes = [
        phase.narrative_beat,
        phase.counter_play?.trigger ? `Counterplay: ${phase.counter_play.trigger} -> ${phase.counter_play.effect}` : "",
        phase.environment_shift?.description ? `Environment: ${phase.environment_shift.description}` : ""
      ].filter(Boolean).join(" ");

      rows.push(`| ${escapeTableCell(actor.name)} | ${escapeTableCell(phase.phase_id)} | ${hp} | ${ac} | ${dpr} | ${escapeTableCell(trigger)} | ${escapeTableCell(notes)} |`);
    }
  }

  return rows;
}

function buildMechanicsLines(state: FullPipelineState): string[] {
  const mechanics = state.mechanics?.mechanics;
  if (!mechanics) return ["- Mechanics block missing."];

  const lethalityRatio = mechanics.total_roster_hp
    ? (mechanics.damage_per_round_target / mechanics.total_roster_hp).toFixed(2)
    : UNKNOWN;

  return [
    `- Target DPR: ${mechanics.damage_per_round_target}`,
    `- Total roster HP: ${mechanics.total_roster_hp}`,
    `- Estimated lifespan: ${mechanics.estimated_lifespan_rounds} rounds`,
    `- Nova risk: ${mechanics.nova_risk_flag ? "High" : "Stable"}`,
    `- Nova DPR estimate: ${mechanics.nova_dpr_estimated}`,
    `- Lethality ratio: ${lethalityRatio}`,
    `- XP budget: ${mechanics.xp_budget_adjusted}`
  ];
}

export function buildVttMarkdown(state: FullPipelineState): string {
  const mcd = state.mcd;
  const title = oneLine(mcd?.premise?.setting, "Encounter Module");
  const aiVttSection = getAiVttSection(state);
  const actors = state.section_5_actors_structured?.actors ?? [];
  const axes = state.section_4_zones_structured?.axes ?? [];
  const beats = state.section_1_3_8_narrative?.gm_cinematic_beats ?? [];
  const tacticalBriefing = state.tactical_briefing;

  const actorRows = buildActorPhaseRows(state);

  const sections = [
    `# ${title} - VTT Tactical Packet`,
    "## Encounter Metadata",
    `- Difficulty: ${oneLine(mcd?.parameters?.target_difficulty)}`,
    `- Party: ${oneLine(mcd?.party?.size)} PCs, average level ${oneLine(mcd?.party?.avg_level)}`,
    `- Objective: ${oneLine(mcd?.parameters?.pc_objective, "Defeat the opposition")}`,
    "",
    "## Mechanical Benchmarks",
    buildMechanicsLines(state).join("\n"),
    "",
    "## Actor Phase Table",
    "| Actor | Phase | HP | AC | DPR | Trigger | Notes |",
    "| :--- | :--- | ---: | ---: | ---: | :--- | :--- |",
    actorRows.length ? actorRows.join("\n") : "| No actors defined | Base | -- | -- | -- | -- | -- |",
    "",
    "## Actor Run Sheet",
    actors.length
      ? actors.map(actor => [
          `### ${actor.name}`,
          `- Role: ${actor.type}`,
          `- Stats: AC ${actor.ac}, HP ${actor.hp}, DPR ${actor.dpr}, Speed ${actor.speed} ft, Initiative ${actor.initiative_bonus >= 0 ? "+" : ""}${actor.initiative_bonus}`,
          `- Traits: ${actor.traits?.length ? actor.traits.join(", ") : "None specified"}`,
          `- Actions: ${actor.actions?.length ? actor.actions.join("; ") : "None specified"}`,
          "- Behavior:",
          quoteBlock(actor.behavior_script)
        ].join("\n")).join("\n\n")
      : "No actors defined.",
    "",
    "## Map Pressure And Hazards",
    axes.length
      ? axes.map(axis => [
          `### ${axis.name} (${axis.type})`,
          `- Telegraph: ${oneLine(axis.telegraph)}`,
          `- Automatic trigger: ${oneLine(axis.automatic_trigger?.details)}`,
          `- Manual lever: ${oneLine(axis.manual_lever?.action_type)} DC ${oneLine(axis.manual_lever?.dc)} - ${oneLine(axis.manual_lever?.effect)}`,
          `- Fail-forward rider: ${oneLine(axis.failing_forward_rider)}`
        ].join("\n")).join("\n\n")
      : "No map hazards defined.",
    "",
    "## Cinematic Timeline",
    "| Round | Beat | Mechanical Trigger |",
    "| :--- | :--- | :--- |",
    beats.length
      ? beats.map(beat => `| ${beat.round} | ${escapeTableCell(beat.beat)} | ${escapeTableCell(beat.mechanical_trigger)} |`).join("\n")
      : "| -- | No timeline defined | -- |",
    "",
    "## Tactical Briefing",
    tacticalBriefing
      ? [
          `- Kill clock: ${tacticalBriefing.survival_range.min_rounds}-${tacticalBriefing.survival_range.max_rounds} rounds`,
          `- Outlook: ${oneLine(tacticalBriefing.kill_clock_outlook)}`,
          "### Mastery Levers",
          bulletList(tacticalBriefing.mastery_levers.map(lever => `${lever.toy_name}: ${lever.trigger} -> ${lever.synergy}`)),
          "### Warnings",
          bulletList(tacticalBriefing.lethality_warnings)
        ].join("\n")
      : "No tactical briefing generated.",
    "",
    "## AI VTT Section",
    aiVttSection || "No AI-authored VTT section generated. Deterministic fallback packet above is complete."
  ];

  return sections.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

export function buildObsidianMarkdown(state: FullPipelineState): string {
  const mcd = state.mcd;
  const rawTitle = text(mcd?.premise?.setting, "Encounter Module");
  const title = oneLine(rawTitle, "Encounter Module");
  const rawDifficulty = text(mcd?.parameters?.target_difficulty);
  const difficulty = oneLine(rawDifficulty);
  const rawTone = joinText(mcd?.premise?.tone || mcd?.parameters?.tone_guardrails, "Standard");
  const tone = oneLine(rawTone, "Standard");
  const rawObjective = text(mcd?.parameters?.pc_objective, "Combat");
  const objective = oneLine(rawObjective, "Combat");
  const levelTag = `level-${slugTag(mcd?.party?.avg_level)}`;
  const difficultyTag = slugTag(difficulty);
  const actors = state.section_5_actors_structured?.actors ?? [];
  const axes = state.section_4_zones_structured?.axes ?? [];
  const narrative = state.section_1_3_8_narrative;
  const mechanics = state.mechanics?.mechanics;
  const tacticalBriefing = state.tactical_briefing;

  const actorRows = actors.map(actor =>
    `| ${escapeTableCell(actor.name)} | ${escapeTableCell(actor.type)} | ${actor.ac} | ${actor.hp} | ${actor.dpr} | ${escapeTableCell(actor.behavior_script)} |`
  );

  const markdown = [
    "---",
    "type: encounter",
    `difficulty: "${escapeYamlString(rawDifficulty)}"`,
    `location: "${escapeYamlString(rawTitle)}"`,
    `tone: "${escapeYamlString(rawTone)}"`,
    `objective: "${escapeYamlString(rawObjective)}"`,
    `tags: ["encounter-factory", "${levelTag}", "${difficultyTag}"]`,
    "---",
    "",
    `# ${title}`,
    "",
    "> [!metadata] Encounter Stats",
    `> **Difficulty:** ${difficulty}`,
    `> **Party:** ${oneLine(mcd?.party?.size)} PCs, average level ${oneLine(mcd?.party?.avg_level)}`,
    `> **Tone:** ${tone}`,
    `> **Objective:** ${objective}`,
    "",
    "## Narrative Shell",
    "> [!quote] Cinematic Opening",
    quoteBlock(narrative?.section_1_cover, "The encounter begins."),
    "",
    "> [!abstract] Sensory Profile",
    `> - **Sight:** ${oneLine(narrative?.sensory_details?.sight, "---")}`,
    `> - **Sound:** ${oneLine(narrative?.sensory_details?.sound, "---")}`,
    `> - **Smell:** ${oneLine(narrative?.sensory_details?.smell, "---")}`,
    `> - **Lighting:** ${oneLine(narrative?.sensory_details?.lighting, "---")}`,
    "",
    "## Tactical Briefing",
    narrative?.interactive_points?.length
      ? narrative.interactive_points.map(point => [
          `> [!info] ${oneLine(point.point)}`,
          quoteBlock(point.gm_instruction)
        ].join("\n")).join("\n\n")
      : "> [!abstract] No tactical points defined.",
    "",
    "## Environmental Hazards",
    axes.length
      ? axes.map(axis => [
          `> [!danger] ${oneLine(axis.name)} (${oneLine(axis.type)})`,
          `> **Telegraph:** ${oneLine(axis.telegraph)}`,
          `> **Automatic:** ${oneLine(axis.automatic_trigger?.details)}`,
          `> **Lever:** ${oneLine(axis.manual_lever?.action_type)} DC ${oneLine(axis.manual_lever?.dc)} - ${oneLine(axis.manual_lever?.effect)}`,
          `> **Fail Rider:** ${oneLine(axis.failing_forward_rider)}`
        ].join("\n")).join("\n\n")
      : "> [!abstract] No hazards defined.",
    "",
    "## Cinematic Timeline",
    "| Round | Beat | Mechanical Trigger |",
    "| :--- | :--- | :--- |",
    narrative?.gm_cinematic_beats?.length
      ? narrative.gm_cinematic_beats.map(beat => `| ${beat.round} | ${escapeTableCell(beat.beat)} | ${escapeTableCell(beat.mechanical_trigger)} |`).join("\n")
      : "| -- | No timeline defined | -- |",
    "",
    "## System Audit",
    "> [!math] Mechanical Benchmarks",
    `> - **Nova Risk:** ${mechanics?.nova_risk_flag ? "High" : "Stable"}`,
    `> - **Nova DPR Est:** ${oneLine(mechanics?.nova_dpr_estimated, "0")}`,
    `> - **Target DPR:** ${oneLine(mechanics?.damage_per_round_target, "0")}`,
    `> - **Total Roster HP:** ${oneLine(mechanics?.total_roster_hp, "0")}`,
    `> - **Lifespan:** ${oneLine(mechanics?.estimated_lifespan_rounds, "3")} rounds`,
    "",
    "## Actors",
    "| Actor | Role | AC | HP | DPR | Tactical Script |",
    "| :--- | :--- | ---: | ---: | ---: | :--- |",
    actorRows.length ? actorRows.join("\n") : "| No actors defined | -- | -- | -- | -- | -- |",
    "",
    "## Tactical Advice",
    tacticalBriefing?.gm_advice ? quoteBlock(tacticalBriefing.gm_advice) : "> No tactical advice generated.",
    "",
    "## VTT Packet",
    "```markdown",
    buildVttMarkdown(state).trimEnd(),
    "```"
  ];

  return markdown.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
