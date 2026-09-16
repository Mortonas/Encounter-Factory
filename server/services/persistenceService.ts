import fs from 'fs';
import path from 'path';
import writeFileAtomic from 'write-file-atomic';
import { ResourceQueue } from '../utils/resourceQueue.js';
import { SchemaMigration } from '../db/schemaMigration.js';
import { ZodPersistedJobSchema, ZodQueuedSessionSchema, type QueuedSession } from '../types.js';

const STORAGE_ROOT = path.join(process.cwd(), 'storage');
const JOBS_DIR = path.join(STORAGE_ROOT, 'jobs');
const SESSIONS_FILE = path.join(STORAGE_ROOT, 'sessions.json');

// Ensure storage directories exist
if (!fs.existsSync(JOBS_DIR)) {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
}

export class PersistenceService {
  private static writeQueue = new ResourceQueue();

  /**
   * Strictly validates that a jobId is a valid UUID v4.
   * Throws an error if invalid to prevent path traversal and malformed requests.
   */
  private static validateJobId(jobId: string): void {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(jobId)) {
      throw new Error(`[PERSISTENCE] Security Violation: Invalid Job ID "${jobId}".`);
    }
  }

  /**
   * Deletes a job state file from disk.
   */
  static deleteJob(jobId: string): void {
    this.validateJobId(jobId);
    const filePath = path.join(JOBS_DIR, `${jobId}.json`);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(`[PERSISTENCE] Failed to delete job ${jobId}:`, err);
    }
  }

  /**
   * Saves a job state atomically with write-serialization.
   */
  static async saveJob(jobId: string, jobData: any): Promise<void> {
    this.validateJobId(jobId);
    const filePath = path.join(JOBS_DIR, `${jobId}.json`);
    
    return this.writeQueue.enqueue(jobId, async () => {
      try {
        const data = JSON.stringify(jobData, null, 2);
        await writeFileAtomic(filePath, data);
      } catch (err) {
        console.error(`[PERSISTENCE] Atomic save failed for job ${jobId}:`, err);
        throw err;
      }
    });
  }

  /**
   * Loads all jobs from disk, deleting those older than 24 hours.
   */
  static loadAllJobs(): Map<string, any> {
    const store = new Map<string, any>();
    const now = Date.now();
    const EXPIRATION_MS = 24 * 60 * 60 * 1000;

    try {
      if (!fs.existsSync(JOBS_DIR)) return store;
      
      // Run virtual migrations before hydration
      // Note: In a real production app, this would be a separate CLI step or gated by version checks
      // but for this systems-design tool, we ensure consistency on every hydrate.
      SchemaMigration.run().catch(err => console.error("[PERSISTENCE] Migration failed:", err));

      const files = fs.readdirSync(JOBS_DIR);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(JOBS_DIR, file);
        try {
          const stats = fs.statSync(filePath);
          
          // Cleanup: Delete jobs older than 24 hours
          if (now - stats.mtimeMs > EXPIRATION_MS) {
            fs.unlinkSync(filePath);
            console.log(`[PERSISTENCE] Purged expired job file: ${file}`);
            continue;
          }

          const content = fs.readFileSync(filePath, 'utf-8');
          const rawJob = JSON.parse(content);
          const parsedJob = ZodPersistedJobSchema.safeParse(rawJob);
          if (!parsedJob.success) {
            console.error(`[PERSISTENCE] Quarantined invalid job file ${file}:`, parsedJob.error.message);
            continue;
          }

          const job = parsedJob.data;
          store.set(job.id, job);
        } catch (err) {
          console.error(`[PERSISTENCE] Failed to process file ${file}:`, err);
        }
      }
      console.log(`[PERSISTENCE] Hydrated ${store.size} active jobs from storage.`);
    } catch (err) {
      console.error('[PERSISTENCE] Failed to hydrate jobs:', err);
    }
    return store;
  }

  /**
   * Saves the session registry (kept as a single file for now due to low churn).
   */
  static saveSessions(sessions: QueuedSession[]): void {
    try {
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
    } catch (err) {
      console.error('[PERSISTENCE] Failed to save sessions:', err);
    }
  }

  /**
   * Loads the session registry.
   */
  static loadSessions(): QueuedSession[] {
    try {
      if (fs.existsSync(SESSIONS_FILE)) {
        const content = fs.readFileSync(SESSIONS_FILE, 'utf-8');
        const rawSessions = JSON.parse(content);
        if (!Array.isArray(rawSessions)) {
          console.error('[PERSISTENCE] Quarantined invalid sessions registry: expected an array.');
          return [];
        }

        const sessions: QueuedSession[] = [];
        rawSessions.forEach((rawSession, index) => {
          const parsedSession = ZodQueuedSessionSchema.safeParse(rawSession);
          if (!parsedSession.success) {
            const id = typeof rawSession?.id === 'string' ? rawSession.id : `index-${index}`;
            console.error(`[PERSISTENCE] Quarantined invalid session ${id}:`, parsedSession.error.message);
            return;
          }
          sessions.push(parsedSession.data);
        });

        return sessions;
      }
    } catch (err) {
      console.error('[PERSISTENCE] Failed to load sessions:', err);
    }
    return [];
  }

  /**
   * Saves the generated encounter content to the Generated folder.
   */
  static async exportEncounter(jobId: string, content: string, isRaw: boolean = false): Promise<void> {
    this.validateJobId(jobId);
    try {
      const generatedDir = path.join(process.cwd(), 'Generated');
      if (!fs.existsSync(generatedDir)) {
        fs.mkdirSync(generatedDir, { recursive: true });
      }
      const filename = isRaw ? `Encounter_${jobId}_raw.md` : `Encounter_${jobId}.md`;
      const filePath = path.join(generatedDir, filename);
      await fs.promises.writeFile(filePath, content);
      console.log(`[PERSISTENCE] Exported encounter to ${filename}`);
    } catch (err) {
      console.error(`[PERSISTENCE] Failed to export encounter ${jobId}:`, err);
    }
  }

  /**
   * Updates a job's status and persists it.
   */
  static async updateJobStatus(jobId: string, status: 'completed' | 'error' | 'running'): Promise<void> {
    this.validateJobId(jobId);
    const filePath = path.join(JOBS_DIR, `${jobId}.json`);
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const job = JSON.parse(content);
        job.status = status === 'completed' ? 'done' : status;
        job.updatedAt = Date.now();
        await this.saveJob(jobId, job);
      }
    } catch (err) {
      console.error(`[PERSISTENCE] Failed to update status for ${jobId}:`, err);
    }
  }
}
