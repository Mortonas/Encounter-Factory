
import fs from 'fs';
import path from 'path';
import writeFileAtomic from 'write-file-atomic';

const STORAGE_ROOT = path.join(process.cwd(), 'storage');
const JOBS_DIR = path.join(STORAGE_ROOT, 'jobs');

export type MigrationFn = (data: any) => any;

export class SchemaMigration {
  private static migrations: Record<string, MigrationFn> = {
    "20260514_add_mastery_fields": (data: any) => {
      if (data.finalState?.section_4_zones_structured?.axes) {
        data.finalState.section_4_zones_structured.axes = data.finalState.section_4_zones_structured.axes.map((axis: any) => ({
          ...axis,
          mastery_synergies: axis.mastery_synergies ?? [],
          size_constraint: axis.size_constraint ?? "Large",
          activation_distance: axis.activation_distance ?? 5,
          virtual_value_weight: axis.virtual_value_weight ?? 1.0
        }));
      }
      return data;
    }
  };

  /**
   * Runs all pending migrations on the job store.
   */
  static async run() {
    console.log("[MIGRATION] Starting schema synchronization...");
    if (!fs.existsSync(JOBS_DIR)) return;

    const files = fs.readdirSync(JOBS_DIR).filter(f => f.endsWith('.json'));
    let migrationCount = 0;

    for (const file of files) {
      const filePath = path.join(JOBS_DIR, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        let job = JSON.parse(content);
        const original = JSON.stringify(job);

        // Apply all migrations sequentially
        for (const [id, migrate] of Object.entries(this.migrations)) {
          job = migrate(job);
        }

        // Only write back if data actually changed
        if (JSON.stringify(job) !== original) {
          await writeFileAtomic(filePath, JSON.stringify(job, null, 2));
          migrationCount++;
        }
      } catch (err) {
        console.error(`[MIGRATION] Failed to migrate ${file}:`, err);
      }
    }

    console.log(`[MIGRATION] Schema synchronization complete. Updated ${migrationCount} files.`);
  }
}
