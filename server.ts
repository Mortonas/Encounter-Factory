import "dotenv/config";
import express from "express";
import path from "path";
import { initializePipeline } from "./server/services/orchestrator.js";
import { MathEngine } from "./server/services/mathEngine.js";
import { JobManager } from "./server/services/jobManager.js";
import { buildObsidianMarkdown, buildVttMarkdown } from "./server/utils/exportBuilders.js";
import {
  ZodCreateSessionRequestSchema,
  ZodGenerateJobRequestSchema,
  ZodHtmlExportRequestSchema,
  ZodQueuedSessionStatusSchema,
  type Job,
  type FullPipelineState,
  type QueuedSessionStatus
} from "./server/types.js";
import {
  createOperatorAuthMiddleware,
  getPrincipal,
  loadOperatorAuthConfig,
  type OperatorAuthConfig
} from "./server/security/operatorAuth.js";
import { formatStartupLog, loadRuntimeConfig } from "./server/runtimeConfig.js";
import { JobContractError } from "./server/services/jobErrors.js";

// ─────────────────────────────────────────────────────────────────────────────
// Server Bootstrap
// ─────────────────────────────────────────────────────────────────────────────

const apiError = (res: express.Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

export function createApp(jobManager: JobManager, authConfig: OperatorAuthConfig) {
  const app = express();
  const requireOperator = createOperatorAuthMiddleware(authConfig);

  app.use(express.json({ limit: "2mb" }));

  // ── Validation Helpers ────────────────────────────────────────────────────────
  const ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isValidJobId = (id: string) => ID_REGEX.test(id);
  const getOwnedJob = (jobId: string, subject: string) => {
    const job = jobManager.getJob(jobId);
    if (!job) return { error: [404, "JOB_NOT_FOUND_OR_EXPIRED", "Job not found or expired."] as const };
    if (job.ownerId !== subject) return { error: [403, "OWNER_SCOPE_DENIED", "The job is outside the operator ownership scope."] as const };
    return { job };
  };
  const getOwnedSession = (sessionId: string, subject: string) => {
    const session = jobManager.getSession(sessionId);
    if (!session) return { error: [404, "SESSION_NOT_FOUND", "Session not found."] as const };
    if (session.ownerId !== subject) return { error: [403, "OWNER_SCOPE_DENIED", "The session is outside the operator ownership scope."] as const };
    return { session };
  };
  const replyContractError = (res: express.Response, error: readonly [number, string, string]) =>
    apiError(res, error[0], error[1], error[2]);
  const summarizeSession = (session: ReturnType<JobManager["listSessions"]>[number]) => {
    const { data, finalState, adviceRequest, adviceReport, ...summary } = session;
    return summary;
  };

  // ── Health Check ────────────────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "ok", 
      activeJobs: jobManager.listJobs().length, 
      queuedSessions: jobManager.listSessions().length 
    });
  });

  // ── GET /api/jobs ───────────────────────────────────────────────────────────
  app.get("/api/jobs", requireOperator, (req, res) => {
    const { subject } = getPrincipal(req);
    const allJobs = jobManager.listJobsForOwner(subject);
    const encounterJobs = allJobs.filter(j => !j.type || j.type === "encounter");
    res.json(encounterJobs);
  });

  // ── Session Management (Contractor Workflow) ───────────────────────────────

  app.post("/api/sessions", (req, res) => {
    const parsed = ZodCreateSessionRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const sessionId = jobManager.createSession(parsed.data);
    res.status(201).json({ sessionId, status: "new" });
  });

  app.get("/api/sessions", requireOperator, (req, res) => {
    const rawStatus = typeof req.query.status === "string" ? req.query.status : "";
    const statuses: QueuedSessionStatus[] = rawStatus
      ? rawStatus.split(",").map(status => status.trim()).filter(Boolean) as QueuedSessionStatus[]
      : [];

    for (const status of statuses) {
      if (!ZodQueuedSessionStatusSchema.safeParse(status).success) {
        return res.status(400).json({ error: `Invalid session status filter: ${status}` });
      }
    }

    const sessions = jobManager.listSessions(statuses.length ? { statuses } : undefined);
    res.json(sessions.map(summarizeSession));
  });

  app.get("/api/sessions/:id", requireOperator, (req, res) => {
    const session = jobManager.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  });

  app.delete("/api/sessions/:id", requireOperator, (req, res) => {
    if (jobManager.deleteSession(req.params.id)) {
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  });

  app.get("/api/export-logs", requireOperator, (req, res) => {
    const { subject } = getPrincipal(req);
    const sessions = jobManager.listSessions().filter(session => session.ownerId === subject).map(session => {
      const job = session.jobId ? jobManager.getJob(session.jobId) as Job | undefined : null;
      return {
        ...session,
        pipelineLogs: job ? {
          status: job.status,
          events: job.events,
          finalState: job.finalState,
          error: job.error
        } : null
      };
    });
    res.json(sessions);
  });

  app.get("/api/sessions/:id/export", requireOperator, (req, res) => {
    const { subject } = getPrincipal(req);
    const result = getOwnedSession(req.params.id, subject);
    if (result.error) return replyContractError(res, result.error);
    const { session } = result;

    const job = session.jobId ? jobManager.getJob(session.jobId) as Job | undefined : null;
    res.json({
      ...session,
      pipelineLogs: job ? {
        status: job.status,
        events: job.events,
        finalState: job.finalState,
        error: job.error
      } : null
    });
  });

  app.get("/api/sessions/:id/export/vtt", requireOperator, (req, res) => {
    const { subject } = getPrincipal(req);
    const result = getOwnedSession(req.params.id, subject);
    if (result.error) return replyContractError(res, result.error);
    const { session } = result;
    if (session.sessionType !== "encounter" || !session.finalState) return apiError(res, 422, "EXPORT_NOT_AVAILABLE", "Encounter session results are not available.");

    const filename = `Encounter-VTT-${session.id}.md`;
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buildVttMarkdown(session.finalState as FullPipelineState));
  });

  app.get("/api/sessions/:id/export/obsidian", requireOperator, (req, res) => {
    const { subject } = getPrincipal(req);
    const result = getOwnedSession(req.params.id, subject);
    if (result.error) return replyContractError(res, result.error);
    const { session } = result;
    if (session.sessionType !== "encounter" || !session.finalState) return apiError(res, 422, "EXPORT_NOT_AVAILABLE", "Encounter session results are not available.");

    const filename = `Encounter-Obsidian-${session.id}.md`;
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buildObsidianMarkdown(session.finalState as FullPipelineState));
  });

  // ── POST /api/generate-advice-report ────────────────────────────────────────
  app.post("/api/generate-advice-report", requireOperator, async (req, res) => {
    try {
      const { subject } = getPrincipal(req);
      const { ZodGMAdviceRequestSchema } = await import("./server/types.js");
      const validated = ZodGMAdviceRequestSchema.parse(req.body);
      const jobId = await jobManager.createAdviceJob({
        adviceRequest: validated,
        ownerId: subject
      });
      res.status(202).json({ jobId, status: "pending", type: "advice" });
    } catch (err: any) {
      console.error("[ERROR] Advice report generation initiation failed:", err);
      res.status(400).json({ error: err.message });
    }
  });

  // ── POST /api/generate ──────────────────────────────────────────────────────
  app.post("/api/generate", requireOperator, async (req, res) => {
    try {
      const { subject } = getPrincipal(req);
      const validated = ZodGenerateJobRequestSchema.parse(req.body);
      const jobId = await jobManager.createJob({
        setup: validated.setup as any,
        ownerId: subject,
        sessionId: validated.sessionId,
        startAtStep: validated.startAtStep,
        currentState: validated.currentState
      });
      res.status(202).json({ jobId });
    } catch (err: any) {
      if (err instanceof JobContractError) {
        return apiError(res, err.status, err.code, err.message);
      }
      apiError(res, 400, "INVALID_GENERATE_REQUEST", err.message);
    }
  });

  // ── GET /api/status/:jobId ──────────────────────────────────────────────────
  app.get("/api/status/:jobId", requireOperator, (req, res) => {
    const { jobId } = req.params;
    if (!isValidJobId(jobId)) {
      return res.status(400).json({ error: "Invalid Job ID format." });
    }
    
    const { subject } = getPrincipal(req);
    const job = jobManager.getJobForOwner(jobId, subject);
    if (!job) {
      return res.status(404).json({ error: "Job not found. It may have expired." });
    }

    const cursor = Math.max(0, parseInt((req.query.cursor as string) || "0", 10));
    const newEvents = job.events.slice(cursor);

    res.json({
      jobId: job.id,
      type: job.type || "encounter",
      status: job.status,
      updatedAt: job.updatedAt,
      events: newEvents,
      nextCursor: job.events.length,
      finalState: job.status === "done" && job.type !== "advice" ? (job as any).finalState : undefined,
      adviceReport: job.status === "done" && job.type === "advice" ? (job as any).adviceReport : undefined,
      error: job.status === "error" ? job.error : undefined,
    });
  });

  // ── POST /api/jobs/:id/resume ─────────────────────────────────────────────
  app.post("/api/jobs/:id/resume", requireOperator, async (req, res) => {
    const { id } = req.params;
    if (!isValidJobId(id)) {
      return res.status(400).json({ error: "Invalid Job ID format." });
    }

    try {
      const { subject } = getPrincipal(req);
      const resumeIndex = await jobManager.resumeJobForOwner(id, subject);
      res.json({ status: "resumed", jobId: id, resumeIndex });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── DELETE /api/jobs/:id ───────────────────────────────────────────────────
  app.delete("/api/jobs/:id", requireOperator, (req, res) => {
    const { id } = req.params;
    if (!isValidJobId(id)) {
      return res.status(400).json({ error: "Invalid Job ID format." });
    }
    
    const { subject } = getPrincipal(req);
    if (jobManager.deleteJobForOwner(id, subject)) {
      res.sendStatus(200);
    } else {
      res.status(404).json({ error: "Job not found" });
    }
  });

  // ── POST /api/export-html ───────────────────────────────────────────────────
  app.post("/api/export-html", requireOperator, async (req, res) => {
    const parsed = ZodHtmlExportRequestSchema.safeParse(req.body);
    if (!parsed.success) return apiError(res, 400, "INVALID_EXPORT_REQUEST", "jobId and sessionId must be UUIDs.");
    const { jobId, sessionId } = parsed.data;
    const { subject } = getPrincipal(req);
    const jobResult = getOwnedJob(jobId, subject);
    if (jobResult.error) return replyContractError(res, jobResult.error);
    const sessionResult = getOwnedSession(sessionId, subject);
    if (sessionResult.error) return replyContractError(res, sessionResult.error);
    const { job } = jobResult;
    const { session } = sessionResult;
    if (job.type === "advice") {
      return apiError(res, 409, "JOB_NOT_COMPLETE", "The encounter job is not complete.");
    }
    if (job.sessionId !== sessionId || session.jobId !== jobId) {
      return apiError(res, 409, "EXPORT_BINDING_MISMATCH", "Job and session bindings do not match.");
    }
    if (job.status !== "done") {
      return apiError(res, 409, "JOB_NOT_COMPLETE", "The encounter job is not complete.");
    }
    if (!job.finalState?.publisher_output && !job.finalState?.styled_output) {
      return apiError(res, 422, "EXPORT_NOT_AVAILABLE", "The completed job has no exportable HTML output.");
    }

    try {
      const exportContent = job.finalState.styled_output || job.finalState.publisher_output!;
      const obsidianMd = jobManager.generateObsidianMarkdown(job);
      
      const { generateStandaloneHtml } = await import("./server/services/htmlEngine.js");
      const htmlContent = await generateStandaloneHtml(exportContent, jobId, obsidianMd, job.finalState);
      
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="Encounter-Grimoire-${jobId}.html"`);
      res.send(htmlContent);
    } catch (err: any) {
      console.error("HTML Export failed:", err);
      apiError(res, 500, "EXPORT_FAILED", "Failed to generate HTML export.");
    }
  });

  // ── GET /api/export-vtt/:jobId ─────────────────────────────────────────────
  app.get("/api/export-vtt/:jobId", requireOperator, (req, res) => {
    const { jobId } = req.params;
    const { subject } = getPrincipal(req);
    const result = getOwnedJob(jobId, subject);
    if (result.error) return replyContractError(res, result.error);
    const { job } = result;
    if (job.type === "advice" || job.status !== "done") return apiError(res, 409, "JOB_NOT_COMPLETE", "The encounter job is not complete.");
    if (!job.finalState) return apiError(res, 422, "EXPORT_NOT_AVAILABLE", "VTT output is not available.");

    const filename = `Encounter-VTT-${jobId}.md`;
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buildVttMarkdown(job.finalState));
  });

  // ── GET /api/export-obsidian/:jobId ────────────────────────────────────────
  app.get("/api/export-obsidian/:jobId", requireOperator, (req, res) => {
    const { jobId } = req.params;
    const { subject } = getPrincipal(req);
    const result = getOwnedJob(jobId, subject);
    if (result.error) return replyContractError(res, result.error);
    const { job } = result;
    if (job.type === "advice" || job.status !== "done") return apiError(res, 409, "JOB_NOT_COMPLETE", "The encounter job is not complete.");
    if (!job.finalState) return apiError(res, 422, "EXPORT_NOT_AVAILABLE", "Obsidian output is not available.");

    const filename = `Encounter-Obsidian-${jobId}.md`;
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buildObsidianMarkdown(job.finalState));
  });

  // ── Vite / Static ───────────────────────────────────────────────────────────
  return app;
}

async function startServer() {
  const authConfig = loadOperatorAuthConfig();
  const { host, port } = loadRuntimeConfig();
  // 1. Configure MathEngine (Enable/Disable Audit via Env)
  MathEngine.configure({
    enableAudit: process.env.ENABLE_MATH_AUDIT !== "false"
  });

  // 2. Initialize the pipeline handlers (Readiness Barrier 1)
  initializePipeline();

  // 3. Initialize JobManager (Readiness Barrier 2 - Hydrates state and resumes jobs)
  const jobManager = JobManager.getInstance();
  await jobManager.initialize();

  const app = createApp(jobManager, authConfig);

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(port, host, () => {
    console.log(formatStartupLog({ host, port }, process.env.NODE_ENV ?? "development"));
    console.log("[Encounter Factory] Architecture: Standalone JobManager Service");
  });

  // --- GRACEFUL SHUTDOWN HANDLERS ---
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
    await jobManager.shutdown();
    process.exit(0);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}
