import { access, cp, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listFiles, matchesAny, readManifest, run, sha256File } from "./public-release-lib.mjs";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const revisionArg = process.argv.find(arg => arg.startsWith("--revision="))?.slice("--revision=".length);
const outputArg = process.argv.find(arg => arg.startsWith("--output="))?.slice("--output=".length);
if (!revisionArg || !outputArg) throw new Error("Usage: assemble-public.mjs --revision=<40-char SHA> --output=<empty directory>");
if (!/^[0-9a-f]{40}$/.test(revisionArg)) throw new Error("--revision must be an exact lowercase 40-character commit SHA.");
if (run("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: sourceRoot, capture: true })) throw new Error("Source repository must be clean before assembly.");

const sourceRevision = run("git", ["rev-parse", `${revisionArg}^{commit}`], { cwd: sourceRoot, capture: true });
if (sourceRevision !== revisionArg) throw new Error("Source revision did not resolve exactly.");
const sourceTree = run("git", ["rev-parse", `${sourceRevision}^{tree}`], { cwd: sourceRoot, capture: true });
const treeRows = run("git", ["ls-tree", "-r", "-z", sourceRevision], { cwd: sourceRoot, capture: true }).split("\0").filter(Boolean);
for (const row of treeRows) {
  const mode = row.slice(0, 6);
  if (mode === "120000") throw new Error(`Symlink prohibited in source revision: ${row}`);
  if (mode === "160000") throw new Error(`Submodule prohibited in source revision: ${row}`);
}

const output = path.resolve(outputArg);
const parent = path.dirname(output);
if (output === sourceRoot || output === parent || output.length < parent.length + 2) throw new Error("Unsafe output path.");
await mkdir(parent, { recursive: true });
try {
  await access(output);
  if ((await readdir(output)).length) throw new Error("--output must name a new or empty directory.");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
await mkdir(output, { recursive: true });
const temporary = await mkdtemp(path.join(os.tmpdir(), "encounter-factory-release-"));
try {
  const archive = path.join(temporary, "source.tar");
  const extracted = path.join(temporary, "source");
  await mkdir(extracted);
  run("git", ["archive", "--format=tar", `--output=${archive}`, sourceRevision], { cwd: sourceRoot });
  run("tar", ["-xf", archive, "-C", extracted]);
  const manifest = await readManifest(extracted);
  const sourceFiles = await listFiles(extracted);
  const selected = sourceFiles.filter(file => matchesAny(manifest.publicTreeAllow, file));
  for (const file of selected) {
    const destination = path.join(output, file);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(extracted, file), destination);
  }

  const publicManifestPath = path.join(output, "release/public-release-manifest.json");
  const publicManifest = JSON.parse(await readFile(publicManifestPath, "utf8"));
  publicManifest.sourceRevision = sourceRevision;
  publicManifest.sourceTree = sourceTree;
  publicManifest.rightsReviewRevision = await sha256File(path.join(output, "docs/RIGHTS_REVIEW.md"));
  await writeFile(publicManifestPath, JSON.stringify(publicManifest, null, 2) + "\n");
  run(process.execPath, [path.join(output, "scripts/public-release/generate-controlled-files.mjs")], { cwd: output });

  run("git", ["init", "--initial-branch=main"], { cwd: output });
  const publicFiles = await listFiles(output);
  for (const file of publicFiles) run("git", ["add", "--", file], { cwd: output });
  run("git", ["-c", "user.name=Alexander Morton", "-c", "user.email=preview@example.com", "commit", "--no-gpg-sign", "-m", "Encounter Factory v0.1.0 preview"], { cwd: output });
  run(process.execPath, [path.join(output, "scripts/public-release/check-public-release.mjs"), "--public-tree", "--require-docker"], { cwd: output });
  console.log(`Public root created at ${output}\nsourceRevision=${sourceRevision}\nsourceTree=${sourceTree}`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
