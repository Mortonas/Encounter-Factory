import "dotenv/config";
import fs from "fs";
import path from "path";
import { initializePipeline } from "./services/orchestrator.js";
import { MathEngine } from "./services/mathEngine.js";
import { JobManager } from "./services/jobManager.js";
import { generateStandaloneHtml } from "./services/htmlEngine.js";
import { Job } from "./types.js";

// Enable Math Engine Auditing
MathEngine.configure({ 
  enableAudit: process.env.ENABLE_MATH_AUDIT !== "false" 
});

// Help usage text
function printHelp() {
  console.log(`
Encounter Factory Command Line Tool
===================================
Run the entire context-sharded D&D 5.5e encounter generation pipeline headlessly.

Usage:
  npx tsx server/cli.ts [options]

Options:
  -s, --setup <path>         Path to GM Setup JSON file (defaults to ./setup.json)
  -o, --output-prefix <name> Output filename prefix (defaults to ./Generated/cli_encounter)
  -h, --help                 Show this help message
`);
}

// Minimal GMSetup default template
const DEFAULT_SETUP = {
  sessionName: "CLI Test Session",
  setting: "Dread Tomb of the Lich",
  tone: "Dark fantasy, high stakes, cinematic tension",
  targetExperience: "Heroic",
  partyArchetype: "Balanced Group",
  difficulty: "Hard",
  encounterStructure: "Boss",
  objective: "Defeat the Lich Commander before he completes the ritual",
  oneFightDay: true,
  pcs: [
    {
      id: "1",
      name: "Valen",
      className: "Fighter",
      level: 5,
      weaponMasteries: "Topple",
      hp: { current: 45, max: 45 },
      ac: 18,
      avgDpr: 20,
      reactionDensity: "low",
      majorMagicItemsCount: 0,
      role: "Frontline"
    },
    {
      id: "2",
      name: "Elara",
      className: "Wizard",
      level: 5,
      weaponMasteries: "",
      hp: { current: 32, max: 32 },
      ac: 12,
      avgDpr: 22,
      reactionDensity: "high",
      majorMagicItemsCount: 0,
      role: "Controller"
    }
  ],
  allies: [],
  enemies: [
    {
      id: "e1",
      name: "Lich Commander",
      type: "Boss",
      description: "Powerful undead commander",
      quantity: 1,
      isStatLocked: false,
      isFragile: false
    }
  ],
  socialOut: false,
  targetRounds: 4,
  encounterCount: 1,
  entryCondition: "fresh",
  targetOutcome: "heavy_tax",
  letDiceFall: true,
  allowExtraMinions: true,
  combatStyle: "Standard Brawl",
  failureConsequence: "tpk_risk",
  inspirationVelocity: "low",
  toyList: ["High Ground", "Pillar"],
  primaryMaterial: "Stone",
  licensingMode: "ORC",
  exportPriority: "Standard"
};

async function main() {
  const args = process.argv.slice(2);
  let setupPath = "./setup.json";
  let outputPrefix = "./Generated/cli_encounter";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-h" || args[i] === "--help") {
      printHelp();
      process.exit(0);
    }
    if (args[i] === "-s" || args[i] === "--setup") {
      setupPath = args[i + 1];
      i++;
    }
    if (args[i] === "-o" || args[i] === "--output-prefix") {
      outputPrefix = args[i + 1];
      i++;
    }
  }

  // Ensure setup file exists, create a default template if not
  const absoluteSetupPath = path.resolve(process.cwd(), setupPath);
  if (!fs.existsSync(absoluteSetupPath)) {
    console.log(`[CLI] Setup file not found at: ${setupPath}`);
    console.log(`[CLI] Generating a default setup template for you at ${setupPath}...`);
    
    fs.writeFileSync(absoluteSetupPath, JSON.stringify(DEFAULT_SETUP, null, 2), "utf-8");
    
    console.log(`[CLI] Default setup created successfully!`);
    console.log(`[CLI] Please inspect/edit ${setupPath} and re-run the CLI script.`);
    process.exit(0);
  }

  let setup;
  try {
    const rawContent = fs.readFileSync(absoluteSetupPath, "utf-8");
    setup = JSON.parse(rawContent);
  } catch (err: any) {
    console.error(`[CLI ERROR] Failed to parse setup JSON: ${err.message}`);
    process.exit(1);
  }

  console.log(`[CLI] Loaded setup session: "${setup.sessionName}"`);
  console.log(`[CLI] Initializing background pipeline and JobManager...`);
  
  initializePipeline();
  
  const jobManager = JobManager.getInstance();
  await jobManager.initialize();

  console.log(`[CLI] Starting pipeline execution for encounter...`);
  
  const jobId = await jobManager.createJob({ setup });
  console.log(`[CLI] Job created with ID: ${jobId}`);

  // Poll progress and state in real-time
  let cursor = 0;
  let job = jobManager.getJob(jobId) as Job | undefined;
  const printedEvents = new Set<string>();

  while (job && (job.status === "pending" || job.status === "running")) {
    const newEvents = job.events.slice(cursor);
    cursor = job.events.length;

    for (const event of newEvents) {
      const eventKey = `${event.index}_${event.status}`;
      if (!printedEvents.has(eventKey)) {
        printedEvents.add(eventKey);
        const dataStr = event.data ? ` | ${JSON.stringify(event.data)}` : "";
        console.log(`[PROGRESS] Step ${event.index}: ${event.status}${dataStr}`);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
    job = jobManager.getJob(jobId) as Job | undefined;
  }

  if (!job) {
    console.error("[CLI ERROR] Job was lost or deleted during execution.");
    process.exit(1);
  }

  if (job.status === "error") {
    console.error(`[CLI ERROR] Pipeline failed with error: ${job.error}`);
    process.exit(1);
  }

  console.log(`[CLI] Pipeline completed successfully!`);

  // Generate artifacts
  const finalState = job.finalState;
  const obsidianMd = jobManager.generateObsidianMarkdown(job);
  const publisherOutput = finalState?.styled_output || finalState?.publisher_output || "";
  const vttOutput = finalState?.vtt_section || "";

  // Make sure output directory exists
  const outputDir = path.dirname(path.resolve(process.cwd(), outputPrefix));
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. Obsidian MD Handout
  const mdPath = `${outputPrefix}.md`;
  fs.writeFileSync(mdPath, obsidianMd, "utf-8");
  console.log(`[CLI] Exported Obsidian Markdown: ${mdPath}`);

  // 2. VTT Tactics File
  if (vttOutput) {
    const vttPath = `${outputPrefix}_vtt.md`;
    fs.writeFileSync(vttPath, vttOutput, "utf-8");
    console.log(`[CLI] Exported VTT Strategy Notes: ${vttPath}`);
  }

  // 3. Standalone Prestige HTML Grimoire
  if (publisherOutput) {
    const htmlContent = await generateStandaloneHtml(publisherOutput, jobId, obsidianMd, finalState);
    const htmlPath = `${outputPrefix}.html`;
    fs.writeFileSync(htmlPath, htmlContent, "utf-8");
    console.log(`[CLI] Exported Handout HTML Grimoire: ${htmlPath}`);
  }

  console.log(`[CLI] All files exported successfully! Headless generation finished.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`[CLI CRITICAL] Unhandled exception: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
