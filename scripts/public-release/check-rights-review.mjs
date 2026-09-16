import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listFiles, matchesAny, readManifest } from "./public-release-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = await readManifest(root);
const files = (await listFiles(root)).filter(file => matchesAny(manifest.publicTreeAllow, file));
const isTest = file => /(?:^|\/)[^/]+\.test\.tsx?$/.test(file);
const groups = {
  "Application and UI text": files.filter(file => file.startsWith("src/") && !isTest(file)),
  "Prompts and schemas": files.filter(file => file.startsWith("server/") && file.endsWith(".ts") && !isTest(file)),
  "Tests and fixtures": files.filter(isTest),
  "Runtime template": ["Base/template.html"],
  "Fictional example": files.filter(file => file.startsWith("examples/fictional-encounter/")),
  "Screenshots": ["docs/assets/briefing-intake.png", "docs/assets/encounter-builder.png", "docs/assets/gm-advisor.png"],
  "Public documentation": ["README.md", "CONTRIBUTING.md", "SECURITY.md", "LICENSE.md", "NOTICE.md", "docs/ARCHITECTURE.md", "docs/SECURITY_BOUNDARY.md"]
};

async function groupDigest(groupFiles) {
  const hash = createHash("sha256");
  for (const file of [...groupFiles].sort()) {
    const bytes = await readFile(path.join(root, file));
    const normalized = /\.(?:css|html|json|md|mjs|ts|tsx|txt|ya?ml)$/.test(file)
      ? Buffer.from(bytes.toString("utf8").replaceAll("\r\n", "\n"), "utf8")
      : bytes;
    hash.update(file).update("\0").update(normalized).update("\0");
  }
  return hash.digest("hex");
}

const review = await readFile(path.join(root, "docs/RIGHTS_REVIEW.md"), "utf8");
for (const [label, groupFiles] of Object.entries(groups)) {
  const digest = await groupDigest(groupFiles);
  if (process.argv.includes("--print")) console.log(`${label}\t${digest}`);
  else {
    const row = review.split(/\r?\n/).find(line => line.startsWith(`| ${label} |`));
    if (!row || !row.includes(`\`${digest}\``)) throw new Error(`Rights digest drift for ${label}.`);
  }
}
if (!process.argv.includes("--print")) console.log("Rights review digests are current.");
