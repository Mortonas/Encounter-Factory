import path from 'path';
import * as cheerio from 'cheerio';
import { 
  FullPipelineState, 
  PipelineStep,
  GMSetup,
  PipelineContext,
  MechanistOutput
} from "../types.js";
import * as MathUtils from "./math/utils.js";
import { PersistenceService } from "./persistenceService.js";
import { BotRegistry } from "./botRegistry.js";
import { AIProvider } from "./aiProvider.js";
import { SimulationEngine } from "./simulationEngine.js";
import { SimulationHooks } from "./simulation/simulationHooks.js";
import { BriefingHandler } from "./handlers/briefingHandler.js";
import { BalanceHandler } from "./handlers/balanceHandler.js";
import { ProfilerHandler } from "./handlers/profilerHandler.js";
import { LeadMechanistHandler } from "./handlers/mechanistHandler.js";
import { AuditorHandler } from "./handlers/auditorHandler.js";
import { CartographerHandler } from "./handlers/cartographerHandler.js";
import { NarrativeHandler } from "./handlers/narrativeHandler.js";
import { PublisherHandler } from "./handlers/publisherHandler.js";
import { SummaristHandler } from "./handlers/summaristHandler.js";
import { StylistHandler } from "./handlers/stylistHandler.js";

/**
 * PIPELINE INITIALIZATION
 */
export function initializePipeline() {
  BotRegistry.register(PipelineStep.BOT_0_BRIEFING, new BriefingHandler(AIProvider.getAI(PipelineStep.BOT_0_BRIEFING)));
  BotRegistry.register(PipelineStep.BOT_4_BALANCE, new BalanceHandler(AIProvider.getAI(PipelineStep.BOT_4_BALANCE)));
  BotRegistry.register(PipelineStep.BOT_6_PROFILER, new ProfilerHandler(AIProvider.getAI(PipelineStep.BOT_6_PROFILER)));
  BotRegistry.register(PipelineStep.BOT_3_MECHANIST, new LeadMechanistHandler(AIProvider.getAI(PipelineStep.BOT_3_MECHANIST)));
  BotRegistry.register(PipelineStep.BOT_5_AUDITOR, new AuditorHandler(AIProvider.getAI(PipelineStep.BOT_5_AUDITOR)));
  BotRegistry.register(PipelineStep.BOT_2_CARTOGRAPHER, new CartographerHandler(AIProvider.getAI(PipelineStep.BOT_2_CARTOGRAPHER)));
  BotRegistry.register(PipelineStep.BOT_1_NARRATIVE, new NarrativeHandler(AIProvider.getAI(PipelineStep.BOT_1_NARRATIVE)));
  BotRegistry.register(PipelineStep.BOT_8_PUBLISHER, new PublisherHandler(AIProvider.getAI(PipelineStep.BOT_8_PUBLISHER)));
  BotRegistry.register(PipelineStep.BOT_9_SUMMARIST, new SummaristHandler(AIProvider.getAI(PipelineStep.BOT_9_SUMMARIST)));
  BotRegistry.register(PipelineStep.BOT_10_STYLIST, new StylistHandler(AIProvider.getAI(PipelineStep.BOT_10_STYLIST)));
  console.log("[ORCHESTRATOR] Bot Registry initialized with modular handlers.");
}

export const PIPELINE_SEQUENCE = [
  { id: PipelineStep.BOT_0_BRIEFING, name: "Briefing Officer", bot: "Bot 0" },
  { id: PipelineStep.BOT_6_PROFILER, name: "Party Profiler", bot: "Bot 6" },
  { id: PipelineStep.BOT_4_BALANCE, name: "Balance Analyst", bot: "Bot 4" },
  { id: PipelineStep.BOT_3_MECHANIST, name: "Lead Mechanist", bot: "Bot 3" },
  { id: PipelineStep.BOT_2_CARTOGRAPHER, name: "Tactical Cartographer", bot: "Bot 2" },
  { id: PipelineStep.BOT_1_NARRATIVE, name: "Narrative Architect", bot: "Bot 1" },
  { id: PipelineStep.BOT_5_AUDITOR, name: "Editor / Auditor", bot: "Bot 5" },
  { id: PipelineStep.BOT_9_SUMMARIST, name: "Tactical Summarist", bot: "Bot 9" },
  { id: PipelineStep.BOT_8_PUBLISHER, name: "Desktop Publisher", bot: "Bot 8" },
  { id: PipelineStep.BOT_10_STYLIST, name: "Cinematic Stylist", bot: "Bot 10" },
];

/**
 * HELPER: Smart Resumption Check
 */
function hasStepData(state: FullPipelineState, id: PipelineStep): boolean {
  switch (id) {
    case PipelineStep.BOT_0_BRIEFING: return !!state.mcd;
    case PipelineStep.BOT_6_PROFILER: return !!state.ppp;
    case PipelineStep.BOT_4_BALANCE: return !!state.mechanics;
    case PipelineStep.BOT_3_MECHANIST: return !!state.section_5_actors_structured;
    case PipelineStep.BOT_2_CARTOGRAPHER: return !!state.section_4_zones_structured;
    case PipelineStep.BOT_1_NARRATIVE: return !!state.section_1_3_8_narrative;
    case PipelineStep.BOT_5_AUDITOR: return !!state.auditor_report;
    case PipelineStep.BOT_9_SUMMARIST: return !!state.section_10_tactical_summary;
    case PipelineStep.BOT_8_PUBLISHER: return !!state.section_7_8_publisher;
    case PipelineStep.BOT_10_STYLIST: return !!state.section_9_10_stylist;
    default: return false;
  }
}

/**
 * PIPELINE EXECUTOR
 * Processes a single step and returns the transitioned context.
 */
async function executePipelineStep(
  context: PipelineContext,
  setup: GMSetup,
  jobId: string,
  onProgress: (index: number, status: any, data?: any) => Promise<void>
): Promise<PipelineContext> {
  const { currentStepIndex, globalAuditAttempts, auditorFeedback } = context;
  let state = { ...context.state };
  const step = PIPELINE_SEQUENCE[currentStepIndex];

  // 1. Smart Resumption
  if (hasStepData(state, step.id) && !auditorFeedback) {
    console.log(`[ORCHESTRATOR] Skipping Step ${currentStepIndex} (${step.id}) - Valid data found.`);
    await onProgress(currentStepIndex, "completed", "Skipped");
    return { ...context, currentStepIndex: currentStepIndex + 1 };
  }

  await onProgress(currentStepIndex, "running");

  const handler = BotRegistry.getHandler(step.id);
  if (!handler) {
    throw new Error(`Critical Error: No handler for step ${step.id}`);
  }

  try {
    const updatedState = await handler.execute(state, setup, auditorFeedback);
    state = { ...state, ...updatedState };

    // 2. Auditor Supervisor Logic (Jumps)
    if (step.id === PipelineStep.BOT_5_AUDITOR && state.auditor_report?.validation_passed === false) {
      if (globalAuditAttempts + 1 < 2) { // MAX_AUDIT_ATTEMPTS = 2
        const reEntryIndex = PIPELINE_SEQUENCE.findIndex(s => s.id === PipelineStep.BOT_4_BALANCE);
        if (reEntryIndex !== -1) {
          return {
            state,
            currentStepIndex: reEntryIndex,
            globalAuditAttempts: globalAuditAttempts + 1,
            auditorFeedback: JSON.stringify(state.auditor_report.validation_report, null, 2) || "The math fails."
          };
        }
      }
    }

    // 3. Post-Execution Simulation Hooks (Sequential Simulation Split)
    if (step.id === PipelineStep.BOT_3_MECHANIST && state.section_5_actors_structured) {
      state = performActorSimulationAudit(state);
    }
    if (step.id === PipelineStep.BOT_2_CARTOGRAPHER && state.section_4_zones_structured) {
      state = performEnvironmentalSimulationAudit(state);
    }

    // 4. Export Logic
    if (step.id === PipelineStep.BOT_10_STYLIST || step.id === PipelineStep.BOT_8_PUBLISHER) {
      await handleEncounterExport(state, step.id, jobId);
    }

    await onProgress(currentStepIndex, "completed", state);
    return {
      state,
      currentStepIndex: currentStepIndex + 1,
      globalAuditAttempts,
      auditorFeedback: step.id === PipelineStep.BOT_5_AUDITOR ? "" : auditorFeedback
    };

  } catch (error: any) {
    // Soft Fallback: Stylist -> Publisher
    if (step.id === PipelineStep.BOT_10_STYLIST && state.section_7_8_publisher) {
      console.warn(`[ORCHESTRATOR] Stylist failed. Reverting to Publisher output.`);
      state.section_9_10_stylist = {
        chain_of_thought_scratchpad: "Stylist failed fallback.",
        styled_output: state.section_7_8_publisher.semantic_markdown,
        vtt_section: state.section_7_8_publisher.vtt_section
      };
      await onProgress(currentStepIndex, "completed", "Fallback Applied");
      return { ...context, state, currentStepIndex: currentStepIndex + 1 };
    }
    await onProgress(currentStepIndex, "failed", error.message);
    throw error;
  }
}

/**
 * HELPER: Actor Simulation Audit
 */
function performActorSimulationAudit(state: FullPipelineState): FullPipelineState {
  const simulationWarnings: string[] = [...(state.simulation_warnings || [])].filter(
    w => !w.startsWith("[Phase")
  );
  const phaseBreakdownRecord: Record<string, { id: string, ehp: number }[]> = {};
  const actors = state.section_5_actors_structured?.actors || [];

  actors.forEach(actor => {
    if (actor.phases && actor.phases.length > 0) {
      let currentSimActor = { ...actor };
      const { phaseBreakdown } = MathUtils.calculateAggregateEHP(
        actor.hp, actor.ac, actor.dpr, actor.phases,
        state.math_engine_targets?.sustained_dpr || 20
      );
      phaseBreakdownRecord[actor.name] = phaseBreakdown;

      actor.phases.forEach((phase, index) => {
        const result = SimulationEngine.executePhaseTransition(currentSimActor as any, phase as any, 1);
        if (result.warnings.length > 0) {
          simulationWarnings.push(...result.warnings.map(w => `[Phase ${index + 1} Conflict]: ${w}`));
        }
        currentSimActor = result.updatedActor as any;
      });
    }
  });

  return {
    ...state,
    phase_breakdown: phaseBreakdownRecord,
    simulation_warnings: simulationWarnings
  };
}

/**
 * HELPER: Environmental Simulation Audit
 */
function performEnvironmentalSimulationAudit(state: FullPipelineState): FullPipelineState {
  const simulationWarnings: string[] = [...(state.simulation_warnings || [])].filter(
    w => !w.startsWith("[Map")
  );
  const axes = state.section_4_zones_structured?.axes || [];

  axes.forEach(axis => {
    const masteryWarning = SimulationHooks.validateMasterySynergy(axis);
    if (masteryWarning) simulationWarnings.push(`[Map Synergy Conflict]: ${masteryWarning.message}`);

    const spatialWarning = SimulationHooks.validateTacticalConstraints(axis);
    if (spatialWarning) simulationWarnings.push(`[Map Spatial Conflict]: ${spatialWarning.message}`);
  });

  return {
    ...state,
    simulation_warnings: simulationWarnings
  };
}

/**
 * HELPER: Encounter Export
 */
async function handleEncounterExport(state: FullPipelineState, stepId: PipelineStep, jobId: string) {
  let finalHtml = stepId === PipelineStep.BOT_10_STYLIST 
    ? (state.section_9_10_stylist?.styled_output || state.section_7_8_publisher?.semantic_markdown || "")
    : (state.section_7_8_publisher?.semantic_markdown || "");

  if (finalHtml) {
    // Strip headers if redundant
    const headerIndex = finalHtml.indexOf('<header>');
    if (headerIndex !== -1 && finalHtml.substring(0, headerIndex).includes('<h1')) {
      finalHtml = finalHtml.substring(headerIndex);
    }
    // Extract body content via cheerio
    try {
      const $ = cheerio.load(finalHtml);
      finalHtml = $('body').html() || finalHtml;
    } catch (e) {}

    await PersistenceService.exportEncounter(jobId, finalHtml, stepId === PipelineStep.BOT_8_PUBLISHER);
  }
}

/**
 * MAIN ENTRY POINT: runOrchestrator
 */
export async function runOrchestrator(
  setup: GMSetup,
  startAtStep: number = 0,
  initialState: FullPipelineState = {},
  onProgress: (index: number, status: any, data?: any) => Promise<void>,
  jobId: string = "test",
  onCheckpoint?: (index: number, state: FullPipelineState) => Promise<void>,
  checkInterrupt?: () => boolean
): Promise<FullPipelineState> {
  
  let context: PipelineContext = {
    state: initialState,
    currentStepIndex: startAtStep,
    globalAuditAttempts: 0,
    auditorFeedback: ""
  };

  while (context.currentStepIndex < PIPELINE_SEQUENCE.length) {
    if (checkInterrupt?.()) {
      console.log(`[ORCHESTRATOR] Interruption signal received for job ${jobId}.`);
      throw new Error("PIPELINE_INTERRUPTED");
    }

    context = await executePipelineStep(context, setup, jobId, onProgress);
    
    // Checkpoint after successful step
    if (onCheckpoint) {
      await onCheckpoint(context.currentStepIndex - 1, context.state);
    }
  }

  await PersistenceService.updateJobStatus(jobId, 'completed');
  return context.state;
}
