import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runOrchestrator, PIPELINE_SEQUENCE } from './orchestrator.js';
import { BotRegistry } from './botRegistry.js';
import { PersistenceService } from './persistenceService.js';
import { PipelineStep } from '../types.js';

// Mock dependencies
vi.mock('./persistenceService.js', () => ({
  PersistenceService: {
    exportEncounter: vi.fn().mockResolvedValue(undefined),
    updateJobStatus: vi.fn().mockResolvedValue(undefined),
    saveJob: vi.fn().mockResolvedValue(undefined),
  }
}));

describe('Orchestrator Integration Baseline', () => {
  const jobId = '12345678-1234-4234-8234-1234567890ab';
  const setup = {
    gmOverrides: {},
    gmNotes: '',
    gmConcerns: ''
  };

  beforeEach(() => {
    vi.clearAllMocks();
    BotRegistry.clear();
  });

  const createMockHandler = (id: string) => ({
    execute: vi.fn().mockImplementation(async (state) => ({ ...state, [id]: 'data' }))
  });

  it('should execute the full pipeline sequence in order', async () => {
    const onProgress = vi.fn().mockResolvedValue(undefined);
    const handlers = PIPELINE_SEQUENCE.map(step => {
      const h = createMockHandler(step.id.toString());
      BotRegistry.register(step.id, h as any);
      return h;
    });
    
    await runOrchestrator(setup as any, 0, {}, onProgress, jobId);

    // Verify each handler was called once
    handlers.forEach(h => {
      expect(h.execute).toHaveBeenCalledTimes(1);
    });
    
    // Verify sequence of steps reported to onProgress
    PIPELINE_SEQUENCE.forEach((step, index) => {
      expect(onProgress).toHaveBeenCalledWith(index, 'running');
      expect(onProgress).toHaveBeenCalledWith(index, 'completed', expect.anything());
    });
  });

  it('should skip steps with existing data (Smart Resumption)', async () => {
    const onProgress = vi.fn().mockResolvedValue(undefined);
    const handlers = PIPELINE_SEQUENCE.map(step => {
      const h = createMockHandler(step.id.toString());
      BotRegistry.register(step.id, h as any);
      return h;
    });

    const initialState = {
      mcd: { premise: {} } as any // Data for BOT_0_BRIEFING
    };

    await runOrchestrator(setup as any, 0, initialState, onProgress, jobId);

    // BOT_0_BRIEFING (index 0) should be skipped
    expect(onProgress).toHaveBeenCalledWith(0, 'completed', 'Skipped');
    expect(handlers[0].execute).not.toHaveBeenCalled();
    // Others should be called
    expect(handlers[1].execute).toHaveBeenCalled();
  });

  it('should handle Auditor Jumps when validation fails', async () => {
    const onProgress = vi.fn().mockResolvedValue(undefined);
    
    let auditorCalls = 0;
    const handlers = PIPELINE_SEQUENCE.map(step => {
      const h = {
        execute: vi.fn().mockImplementation(async (state) => {
          if (step.id === PipelineStep.BOT_5_AUDITOR) {
            auditorCalls++;
            if (auditorCalls === 1) {
              return { 
                ...state, 
                auditor_report: { validation_passed: false, validation_report: 'Math is wrong' } 
              };
            }
            return { ...state, auditor_report: { validation_passed: true } };
          }
          return { ...state };
        })
      };
      BotRegistry.register(step.id, h as any);
      return h;
    });

    await runOrchestrator(setup as any, 0, {}, onProgress, jobId);

    expect(auditorCalls).toBe(2);
    
    const balanceIndex = PIPELINE_SEQUENCE.findIndex(s => s.id === PipelineStep.BOT_4_BALANCE);
    const auditorIndex = PIPELINE_SEQUENCE.findIndex(s => s.id === PipelineStep.BOT_5_AUDITOR);

    // Balance should be called twice (initial + jump)
    expect(handlers[balanceIndex].execute).toHaveBeenCalledTimes(2);
    // Steps between Balance and Auditor should also be called twice
    expect(handlers[auditorIndex - 1].execute).toHaveBeenCalledTimes(2);
  });

  it('should run simulation audit after BOT_3_MECHANIST', async () => {
    const onProgress = vi.fn().mockResolvedValue(undefined);
    
    PIPELINE_SEQUENCE.forEach(step => {
      const h = {
        execute: vi.fn().mockImplementation(async (state) => {
          if (step.id === PipelineStep.BOT_3_MECHANIST) {
            return { 
              ...state, 
              section_5_actors_structured: { 
                actors: [
                  { 
                    name: 'Boss', 
                    hp: 100, 
                    ac: 15, 
                    dpr: 20,
                    phases: [{ 
                      trigger: { type: 'ROUND_TIMER', value: 2 }, 
                      hp: 50, 
                      dpr: 30,
                      state_overrides: { 
                        added_traits: [],
                        removed_traits: [],
                        new_actions: [],
                        removed_actions: [],
                        manual_weight_modifier: 1
                      }
                    }]
                  }
                ] 
              } 
            };
          }
          return { ...state };
        })
      };
      BotRegistry.register(step.id, h as any);
    });

    const finalState = await runOrchestrator(setup as any, 0, {}, onProgress, jobId);

    // Verify simulation warnings exist
    expect(finalState.simulation_warnings).toBeDefined();
    expect(finalState.phase_breakdown).toBeDefined();
    expect(finalState.phase_breakdown['Boss']).toBeDefined();
  });

  it('should call exportEncounter for Publisher and Stylist steps', async () => {
    const onProgress = vi.fn().mockResolvedValue(undefined);
    
    PIPELINE_SEQUENCE.forEach(step => {
      const h = {
        execute: vi.fn().mockImplementation(async (state) => {
          if (step.id === PipelineStep.BOT_8_PUBLISHER) {
            return { ...state, section_7_8_publisher: { semantic_markdown: '<h1>Publisher</h1>' } };
          }
          if (step.id === PipelineStep.BOT_10_STYLIST) {
            return { ...state, section_9_10_stylist: { styled_output: '<html>Stylist</html>' } };
          }
          return { ...state };
        })
      };
      BotRegistry.register(step.id, h as any);
    });

    await runOrchestrator(setup as any, 0, {}, onProgress, jobId);

    // Should be called for Publisher and Stylist
    expect(PersistenceService.exportEncounter).toHaveBeenCalledTimes(2);
  });

  it('should run actor simulation audit after BOT_3_MECHANIST and environmental simulation audit after BOT_2_CARTOGRAPHER', async () => {
    const onProgress = vi.fn().mockResolvedValue(undefined);
    
    PIPELINE_SEQUENCE.forEach(step => {
      const h = {
        execute: vi.fn().mockImplementation(async (state) => {
          if (step.id === PipelineStep.BOT_3_MECHANIST) {
            return { 
              ...state, 
              section_5_actors_structured: { 
                actors: [
                  { 
                    name: 'Boss', 
                    hp: 100, 
                    ac: 15, 
                    dpr: 20,
                    phases: [{ 
                      trigger: { type: 'ROUND_TIMER', value: 2 }, 
                      hp: 50, 
                      dpr: 30,
                      state_overrides: { 
                        added_traits: [],
                        removed_traits: [],
                        new_actions: [],
                        removed_actions: [],
                        manual_weight_modifier: 1
                      }
                    }]
                  }
                ] 
              } 
            };
          }
          if (step.id === PipelineStep.BOT_2_CARTOGRAPHER) {
            return {
              ...state,
              section_4_zones_structured: {
                grid_dimensions: { width: 10, height: 10 },
                axes: [
                  {
                    name: "Hazard Toy",
                    type: "Hazard",
                    current_state: "Active",
                    telegraph: "Flashing red",
                    tactical_clue: "Loud humming",
                    interaction_trigger: "Push",
                    passive_trigger: "Enter zone",
                    state_change: "Detonated",
                    once_per_encounter: true,
                    mastery_synergies: ["Push"],
                    size_constraint: "Large",
                    activation_distance: 5,
                    automatic_trigger: { type: "Tick Rate (Init 20)", details: "Triggers on Initiative 20" },
                    manual_lever: { action_type: "Utilize", dc: 15, effect: "Disable hazard" },
                    failing_forward_rider: "Takes damage on failure",
                    force_multiplier_value: "3x damage",
                    social_out_trigger: false,
                    choice_mandate: "Choose whether to cross",
                    virtual_value_weight: 1.0
                  }
                ]
              }
            };
          }
          return { ...state };
        })
      };
      BotRegistry.register(step.id, h as any);
    });

    const finalState = await runOrchestrator(setup as any, 0, {}, onProgress, jobId);

    // Verify actor phase warnings/breakdowns and environmental warnings exist
    expect(finalState.phase_breakdown).toBeDefined();
    expect(finalState.phase_breakdown['Boss']).toBeDefined();
    expect(finalState.simulation_warnings).toBeDefined();
  });
});
