import { v4 as uuidv4 } from "uuid";
import type {
  Job,
  AdviceJob,
  GMSetup,
  GMAdviceRequest,
  FullPipelineState,
  CreateSessionRequest,
  QueuedSession,
  QueuedSessionStatus
} from "../types.js";
import { PersistenceService } from "./persistenceService.js";
import { runOrchestrator, PIPELINE_SEQUENCE } from "./orchestrator.js";
import { JobContractError } from "./jobErrors.js";

/**
 * JobManager
 * Singleton service responsible for managing the lifecycle of encounter generation jobs.
 * Handles in-memory state, persistence sync, background orchestration, and job resumption.
 */
export class JobManager {
  private static instance: JobManager;
  private jobStore: Map<string, Job | AdviceJob> = new Map();
  private sessionStore: Map<string, QueuedSession> = new Map();
  private activeClaims: Set<string> = new Set();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly JOB_TTL_MS = 24 * 60 * 60 * 1000;
  private isInitialized = false;
  private isShuttingDown = false;

  private constructor() {}

  public static getInstance(): JobManager {
    if (!JobManager.instance) {
      JobManager.instance = new JobManager();
    }
    return JobManager.instance;
  }

  /**
   * Initializes the manager by loading persisted jobs/sessions and resuming active tasks.
   * MUST be called before the server starts accepting requests.
   */
  public async initialize() {
    if (this.isInitialized) return;

    console.log("[JobManager] Initializing state from persistence...");
    this.jobStore = PersistenceService.loadAllJobs();
    this.sessionStore = new Map(PersistenceService.loadSessions().map(s => [s.id, s]));

    this.startCleanupInterval();
    
    // Non-blocking resumption of active jobs
    this.resumeActiveJobs();

    this.isInitialized = true;
    console.log(`[JobManager] Ready. (${this.jobStore.size} jobs, ${this.sessionStore.size} sessions loaded)`);
  }

  private startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, job] of this.jobStore.entries()) {
        if (now - job.createdAt > this.JOB_TTL_MS) {
          console.log(`[JobManager] TTL Expired: Purging job ${id}`);
          this.jobStore.delete(id);
        }
      }
    }, 30 * 60 * 1000); // Every 30 mins
  }

  /**
   * Performs a graceful shutdown by stopping new jobs, signaling active ones to checkpoint,
   * and waiting for current steps to finish.
   */
  public async shutdown() {
    const totalActive = this.activeClaims.size;
    console.log("[JobManager] Graceful shutdown initiated...");
    this.isShuttingDown = true;
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (totalActive > 0) {
      console.log(`[JobManager] Waiting for ${totalActive} active jobs to reach checkpoint...`);
      // Wait up to 20 seconds for current steps to finish
      const start = Date.now();
      while (this.activeClaims.size > 0 && Date.now() - start < 20000) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const remaining = this.activeClaims.size;
    const checkpointed = totalActive - remaining;

    // Force persistence for any jobs that were still 'running' but didn't catch the interrupt
    for (const [id, job] of this.jobStore.entries()) {
      if (job.status === "running") {
        job.status = "interrupted";
        job.updatedAt = Date.now();
        await PersistenceService.saveJob(id, job);
      }
    }

    console.log(`[JobManager] Shutdown complete. Checkpointed: ${checkpointed}, Forcibly Interrupted: ${remaining}`);
  }

  private async resumeActiveJobs() {
    for (const [jobId, job] of this.jobStore.entries()) {
      if (job.status === "running") {
        console.log(`[JobManager] Detected interrupted job: ${jobId}. Claiming for resumption...`);
        if (job.type === "advice") {
          this.startAdviceOrchestrator(jobId, job as AdviceJob);
        } else {
          this.startOrchestrator(jobId, job as Job, true);
        }
      }
    }
  }

  // --- Job Operations ---

  public async createJob(params: {
    setup?: GMSetup,
    ownerId?: string,
    sessionId?: string,
    startAtStep?: number,
    currentState?: FullPipelineState
  }): Promise<string> {
    const { setup: rawSetup, ownerId, sessionId, startAtStep = 0, currentState = {} } = params;
    let setup = rawSetup;
    const jobId = uuidv4();
    let previousSession: QueuedSession | undefined;

    if (sessionId) {
      const session = this.getSession(sessionId);
      if (!session) {
        throw new JobContractError(404, "SESSION_NOT_FOUND", "Session not found.");
      }
      if (!ownerId) throw new Error("Session-backed jobs require an authenticated owner.");
      if (session.ownerId && session.ownerId !== ownerId) {
        throw new JobContractError(403, "OWNER_SCOPE_DENIED", "The session belongs to another operator.");
      }
      if (session.jobId) {
        throw new JobContractError(409, "SESSION_ALREADY_ENGAGED", "The session already has a job.");
      }
      previousSession = { ...session };
      if (!setup) setup = session.data;
    }

    if (!setup) throw new Error("Missing GM Setup payload.");

    const now = Date.now();
    const job: Job = {
      id: jobId,
      type: "encounter",
      status: "pending",
      createdAt: now,
      updatedAt: now,
      ownerId,
      sessionId,
      setup: setup,
      events: [],
    };

    this.jobStore.set(jobId, job);
    if (sessionId && previousSession) {
      this.sessionStore.set(sessionId, {
        ...previousSession,
        ownerId,
        jobId,
        status: "processing",
        updatedAt: new Date().toISOString()
      });
    }

    try {
      await PersistenceService.saveJob(jobId, job);
      if (sessionId) this.saveSessions();
    } catch (error) {
      this.jobStore.delete(jobId);
      PersistenceService.deleteJob(jobId);
      if (sessionId && previousSession) {
        this.sessionStore.set(sessionId, previousSession);
        this.saveSessions();
      }
      throw error;
    }

    // Background execution
    this.startOrchestrator(jobId, job, false, startAtStep, currentState, sessionId);

    return jobId;
  }

  public async createAdviceJob(params: {
    adviceRequest: GMAdviceRequest,
    clientId?: string,
    ownerId?: string
  }): Promise<string> {
    const { adviceRequest, clientId, ownerId } = params;
    if (!adviceRequest) throw new Error("Missing GM Advice Request payload.");

    const jobId = uuidv4();
    const now = Date.now();
    const job: AdviceJob = {
      id: jobId,
      type: "advice",
      status: "pending",
      createdAt: now,
      updatedAt: now,
      clientId: clientId,
      ownerId: ownerId,
      adviceRequest: adviceRequest,
      events: [],
    };

    this.jobStore.set(jobId, job);

    // Background execution
    this.startAdviceOrchestrator(jobId, job);

    return jobId;
  }

  public getJob(id: string): Job | AdviceJob | undefined {
    return this.jobStore.get(id);
  }

  public getJobForOwner(id: string, ownerId: string): Job | AdviceJob | undefined {
    const job = this.jobStore.get(id);
    return job && this.isOwnedBy(job, ownerId) ? job : undefined;
  }

  public listJobs(clientId?: string): (Job | AdviceJob)[] {
    let jobs = Array.from(this.jobStore.values());
    if (clientId) {
      jobs = jobs.filter(j => j.clientId === clientId);
    }
    return jobs.sort((a, b) => b.createdAt - a.createdAt);
  }

  public listJobsForOwner(ownerId: string): (Job | AdviceJob)[] {
    return Array.from(this.jobStore.values())
      .filter(job => this.isOwnedBy(job, ownerId))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  public async resumeJob(id: string): Promise<number> {
    const job = this.jobStore.get(id);
    if (!job) throw new Error("Job not found");
    if (job.status === "running") throw new Error("Job is already running");

    if (job.type === "advice") {
      this.startAdviceOrchestrator(id, job as AdviceJob);
      return 0;
    }

    const lastEvent = [...(job as Job).events].reverse().find(e => e.status === "completed");
    const resumeIndex = lastEvent ? lastEvent.index + 1 : 0;

    if (resumeIndex >= PIPELINE_SEQUENCE.length) {
      throw new Error("Job is already completed");
    }

    this.startOrchestrator(id, job as Job, true);
    return resumeIndex;
  }

  public async resumeJobForOwner(id: string, ownerId: string): Promise<number> {
    if (!this.getJobForOwner(id, ownerId)) {
      throw new Error("Job not found");
    }
    return this.resumeJob(id);
  }

  public deleteJob(id: string): boolean {
    if (this.jobStore.has(id)) {
      this.jobStore.delete(id);
      PersistenceService.deleteJob(id);
      return true;
    }
    return false;
  }

  public deleteJobForOwner(id: string, ownerId: string): boolean {
    if (!this.getJobForOwner(id, ownerId)) {
      return false;
    }
    return this.deleteJob(id);
  }

  private isOwnedBy(job: Job | AdviceJob, ownerId: string): boolean {
    return Boolean(ownerId) && job.ownerId === ownerId;
  }

  // --- Session Operations ---

  public createSession(input: CreateSessionRequest): string {
    const sessionId = uuidv4();
    const now = new Date().toISOString();
    const session = {
      id: sessionId,
      sessionType: "encounter",
      title: input.data.sessionName || "Untitled Mission",
      clientName: input.clientName,
      createdAt: now,
      updatedAt: now,
      status: "new",
      data: input.data
    } satisfies QueuedSession;
    this.sessionStore.set(sessionId, session);
    this.saveSessions();
    return sessionId;
  }

  public listSessions(filters?: { statuses?: QueuedSessionStatus[] }): QueuedSession[] {
    let sessions = Array.from(this.sessionStore.values());
    if (filters?.statuses?.length) {
      const allowedStatuses = new Set(filters.statuses);
      sessions = sessions.filter(session => allowedStatuses.has(session.status));
    }
    return sessions;
  }

  public getSession(id: string): QueuedSession | undefined {
    return this.sessionStore.get(id);
  }

  public deleteSession(id: string): boolean {
    if (this.sessionStore.delete(id)) {
      this.saveSessions();
      return true;
    }
    return false;
  }

  public markSessionReviewed(id: string): QueuedSession | undefined {
    return this.updateSessionStatus(id, "reviewed");
  }

  public attachJobToSession(id: string, jobId: string): QueuedSession | undefined {
    const session = this.sessionStore.get(id);
    if (!session) return undefined;

    const updatedSession: QueuedSession = {
      ...session,
      jobId,
      status: "processing",
      updatedAt: new Date().toISOString()
    };
    this.sessionStore.set(id, updatedSession);
    this.saveSessions();
    return updatedSession;
  }

  public updateSessionStatus(id: string, status: QueuedSessionStatus): QueuedSession | undefined {
    const session = this.sessionStore.get(id);
    if (!session) return undefined;

    const updatedSession: QueuedSession = {
      ...session,
      status,
      updatedAt: new Date().toISOString()
    };
    this.sessionStore.set(id, updatedSession);
    this.saveSessions();
    return updatedSession;
  }

  private completeEncounterSession(
    id: string,
    finalState: FullPipelineState
  ): QueuedSession | undefined {
    const session = this.sessionStore.get(id);
    if (!session) return undefined;

    const now = new Date().toISOString();
    const updatedSession: QueuedSession = {
      ...session,
      sessionType: "encounter",
      status: "completed",
      completedAt: now,
      updatedAt: now,
      finalState
    };
    this.sessionStore.set(id, updatedSession);
    this.saveSessions();
    return updatedSession;
  }

  private createCompletedAdviceSession(job: AdviceJob): string {
    const now = new Date().toISOString();
    const firstPcName = job.adviceRequest.pcs[0]?.name;
    const title = firstPcName
      ? `GM Advisor Report: ${firstPcName} Party`
      : `GM Advisor Report: Level ${job.adviceRequest.startLevel} Party`;
    const sessionId = uuidv4();
    const session: QueuedSession = {
      id: sessionId,
      sessionType: "advice",
      title,
      clientName: "Internal GM Advisor",
      createdAt: new Date(job.createdAt).toISOString(),
      updatedAt: now,
      completedAt: now,
      status: "completed",
      jobId: job.id,
      ownerId: job.ownerId,
      adviceRequest: job.adviceRequest,
      adviceReport: job.adviceReport
    };

    this.sessionStore.set(sessionId, session);
    this.saveSessions();
    return sessionId;
  }

  private saveSessions() {
    PersistenceService.saveSessions(Array.from(this.sessionStore.values()));
  }

  // --- Orchestration Logic ---

  private async startOrchestrator(
    jobId: string, 
    job: Job, 
    isResume: boolean, 
    startAtStep = 0, 
    currentState: FullPipelineState = {}, 
    sessionId?: string
  ) {
    // IDEMPOTENT CLAIM: Guard against duplicate orchestration threads
    if (this.activeClaims.has(jobId)) {
      console.warn(`[JobManager] Blocked duplicate orchestration claim for Job: ${jobId}`);
      return;
    }

    this.activeClaims.add(jobId);
    job.status = "running";
    job.updatedAt = Date.now();

    let resumeIndex = startAtStep;
    if (isResume) {
      const lastEvent = [...(job.events || [])].reverse().find(e => e.status === "completed");
      resumeIndex = lastEvent ? lastEvent.index + 1 : 0;
    }

    try {
      const finalState = await runOrchestrator(
        job.setup,
        resumeIndex,
        isResume ? (job.finalState || {}) : currentState,
        async (index, status, data) => {
          job.events.push({ index, status, data });
          job.updatedAt = Date.now();
          await PersistenceService.saveJob(jobId, job);
        },
        jobId,
        async (index, stateSnapshot) => {
          job.finalState = stateSnapshot;
          job.updatedAt = Date.now();
          await PersistenceService.saveJob(jobId, job);
        },
        () => this.isShuttingDown
      );

      job.status = "done";
      job.finalState = finalState;
      job.updatedAt = Date.now();
      await PersistenceService.saveJob(jobId, job);

      // Link session completion
      const linkedSessionId = sessionId ?? job.sessionId;
      if (linkedSessionId) {
        this.completeEncounterSession(linkedSessionId, finalState);
      }
    } catch (err: any) {
      if (err.message === "PIPELINE_INTERRUPTED") {
        console.log(`[JobManager] [Job ${jobId}] Interrupted for shutdown. Checkpoint saved.`);
        job.status = "interrupted";
      } else {
        console.error(`[JobManager] [Job ${jobId}] Failed:`, err);
        job.status = "error";
        job.error = err.message ?? "Pipeline Execution Failure";
      }
      job.updatedAt = Date.now();
      await PersistenceService.saveJob(jobId, job);
    } finally {
      this.activeClaims.delete(jobId);
    }
  }

  private async startAdviceOrchestrator(jobId: string, job: AdviceJob) {
    if (this.activeClaims.has(jobId)) {
      console.warn(`[JobManager] Blocked duplicate orchestration claim for Job: ${jobId}`);
      return;
    }

    this.activeClaims.add(jobId);
    job.status = "running";
    job.updatedAt = Date.now();

    try {
      const { GMAdviceHandler } = await import("./handlers/gmAdvisorHandler.js");

      // Update progress event
      job.events.push({ index: 0, status: "running" });
      job.updatedAt = Date.now();
      await PersistenceService.saveJob(jobId, job);

      const report = await GMAdviceHandler.generate(job.adviceRequest);

      job.status = "done";
      job.adviceReport = report;
      job.events.push({ index: 0, status: "completed", data: report });
      job.updatedAt = Date.now();
      await PersistenceService.saveJob(jobId, job);
      this.createCompletedAdviceSession(job);
    } catch (err: any) {
      console.error(`[JobManager] [Advice Job ${jobId}] Failed:`, err);
      job.status = "error";
      job.error = err.message ?? "Advice Report Generation Failure";
      job.events.push({ index: 0, status: "failed", data: job.error });
      job.updatedAt = Date.now();
      await PersistenceService.saveJob(jobId, job);
    } finally {
      this.activeClaims.delete(jobId);
    }
  }

  // --- Export Helpers ---

  public generateObsidianMarkdown(job: Job): string {
    const state = job.finalState!;
    const mcd = state.mcd!;
    const title = mcd.premise?.setting || "Encounter Module";
    
    let md = `---
type: encounter
difficulty: ${mcd.parameters?.target_difficulty || 'Unknown'}
location: "${title}"
tone: "${mcd.premise?.tone || 'Standard'}"
objective: "${mcd.parameters?.pc_objective || 'Combat'}"
tags: [encounter-factory, level-${mcd.party?.avg_level || '0'}, ${mcd.parameters?.target_difficulty || 'Hard'}]
---

# ${title}

> [!metadata] Encounter Stats
> **Difficulty:** ${mcd.parameters?.target_difficulty}
> **Party:** ${mcd.party?.size} PCs (Avg Level ${mcd.party?.avg_level})
> **Tone:** ${mcd.premise?.tone}
> **Objective:** ${mcd.parameters?.pc_objective || "Defeat the opposition"}

## 🎬 Narrative Shell
> [!quote] Cinematic Opening
> ${state.section_1_3_8_narrative?.section_1_cover || "The air grows heavy with anticipation..."}

> [!abstract] Sensory Profile
> - **Sight:** ${state.section_1_3_8_narrative?.sensory_details?.sight || "---"}
> - **Sound:** ${state.section_1_3_8_narrative?.sensory_details?.sound || "---"}
> - **Smell:** ${state.section_1_3_8_narrative?.sensory_details?.smell || "---"}
> - **Lighting:** ${state.section_1_3_8_narrative?.sensory_details?.lighting || "---"}

## ⚔️ Tactical Briefing
${state.section_1_3_8_narrative?.interactive_points?.map(ip => `> [!info] ${ip.point}\n> ${ip.gm_instruction}`).join('\n> \n') || "> [!abstract] No specific tactical points defined."}

## 🌋 Environmental Hazards
${state.section_4_zones_structured?.axes?.map(axis => `
> [!danger] ${axis.name} (${axis.type})
> **Telegraph:** ${axis.telegraph}
> **Automatic:** ${axis.automatic_trigger.details}
> **Lever:** ${axis.manual_lever.action_type} (DC ${axis.manual_lever.dc}) — ${axis.manual_lever.effect}
> **Fail Rider:** ${axis.failing_forward_rider}
`).join('') || "> [!abstract] No hazards defined."}

## 🕰️ Cinematic Timeline
| Round | Beat | Mechanical Trigger |
| :--- | :--- | :--- |
${state.section_1_3_8_narrative?.gm_cinematic_beats?.map(b => `| ${b.round} | ${b.beat} | ${b.mechanical_trigger} |`).join('\n') || "| -- | No timeline defined | -- |"}

## 📊 System Audit (Kill Clock)
> [!math] Mechanical Benchmarks
> - **Nova Risk:** ${state.mechanics?.mechanics?.nova_risk_flag ? "⚠️ HIGH" : "✅ STABLE"}
> - **Nova DPR Est:** ${state.mechanics?.mechanics?.nova_dpr_estimated || 0}
> - **Lethality Ratio:** ${state.mechanics?.mechanics?.damage_per_round_target ? (state.mechanics.mechanics.damage_per_round_target / (state.mechanics.mechanics.total_roster_hp || 1)).toFixed(2) : "0.00"} (Target: 0.4)
> - **XP Budget:** ${state.mechanics?.mechanics?.xp_budget_adjusted || 0}
> - **Lifespan:** ${state.mechanics?.mechanics?.estimated_lifespan_rounds || 3} Rounds

## 👥 Actors
`;

    state.section_5_actors_structured?.actors?.forEach(actor => {
      md += `
> [!statblock] ${actor.name} (${actor.type})
> **AC:** ${actor.ac} | **HP:** ${actor.hp} | **Speed:** ${actor.speed}ft
> **DPR:** ${actor.dpr} | **Init:** ${actor.initiative_bonus >= 0 ? '+' : ''}${actor.initiative_bonus}
> 
> **Tactical Script:**
> ${actor.behavior_script.split('\n').map(line => `> ${line}`).join('\n')}
`;
    });

    if (state.vtt_section) {
      md += `\n---\n\n## 🔮 VTT / Compendium Data\n\n${state.vtt_section}\n`;
    }

    return md;
  }
}
