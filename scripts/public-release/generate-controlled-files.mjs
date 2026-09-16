import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listFiles, matchesAny, readManifest } from "./public-release-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const check = process.argv.includes("--check");
const manifest = await readManifest(root);

const dockerLines = ["# Generated from release/public-release-manifest.json. Do not edit by hand.", "**"];
const dockerFiles = (await listFiles(root)).filter(file => matchesAny(manifest.dockerContextAllow, file));
const dockerDirectories = new Set();
for (const file of dockerFiles) {
  const parts = file.split("/");
  for (let index = 1; index < parts.length; index += 1) dockerDirectories.add(parts.slice(0, index).join("/"));
}
for (const directory of [...dockerDirectories].sort((left, right) => left.split("/").length - right.split("/").length || left.localeCompare(right))) {
  dockerLines.push(`!${directory}`, `${directory}/*`);
}
for (const file of dockerFiles) dockerLines.push(`!${file}`);
const dockerignore = [...new Set(dockerLines)].join("\n") + "\n";

const gitStart = "# BEGIN GENERATED PUBLIC RELEASE DENYLIST";
const gitEnd = "# END GENERATED PUBLIC RELEASE DENYLIST";
const gitignorePath = path.join(root, ".gitignore");
const existingGitignore = await readFile(gitignorePath, "utf8");
const startIndex = existingGitignore.indexOf(gitStart);
const endIndex = existingGitignore.indexOf(gitEnd);
if (startIndex < 0 || endIndex < startIndex) throw new Error("Missing generated .gitignore boundaries.");
const generatedGit = [gitStart, ...manifest.deny.filter(item => !item.startsWith(".git/")), "!.env.example", gitEnd].join("\n");
const gitignore = existingGitignore.slice(0, startIndex) + generatedGit + existingGitignore.slice(endIndex + gitEnd.length);

const packagePath = path.join(root, "package.json");
const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
packageJson.files = manifest.npmPackAllow.filter(item => item !== "package.json").map(item => item.replace(/\/\*\*$/, "/"));
const packageText = JSON.stringify(packageJson, null, 2) + "\n";

const outputs = [[path.join(root, ".dockerignore"), dockerignore], [gitignorePath, gitignore], [packagePath, packageText]];
for (const [file, content] of outputs) {
  const current = await readFile(file, "utf8").catch(() => "");
  if (check && current !== content) throw new Error(`Generated file drift: ${path.relative(root, file)}`);
  if (!check) await writeFile(file, content, "utf8");
}
console.log(check ? "Generated release files are current." : "Generated release files updated.");
