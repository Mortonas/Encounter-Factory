import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const normalize = value => value.replaceAll("\\", "/").replace(/^\.\//, "");

export function patternMatches(pattern, candidate) {
  const source = normalize(pattern);
  let expression = "";
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === "*" && source[index + 1] === "*") {
      if (source[index + 2] === "/") {
        expression += "(?:.*/)?";
        index += 2;
      } else {
        expression += ".*";
        index += 1;
      }
    } else if (character === "*") expression += "[^/]*";
    else expression += character.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${expression}$`).test(normalize(candidate));
}

export const matchesAny = (patterns, candidate) => patterns.some(pattern => patternMatches(pattern, candidate));

export async function listFiles(root, relative = "") {
  const output = [];
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const name = normalize(path.join(relative, entry.name));
    if (name === ".git" || name.startsWith(".git/")) continue;
    if (entry.isSymbolicLink()) throw new Error(`Symlink is prohibited: ${name}`);
    if (entry.isDirectory()) output.push(...await listFiles(root, name));
    else if (entry.isFile()) output.push(name);
  }
  return output.sort();
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: options.capture ? "pipe" : "inherit", ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed${result.stderr ? `: ${result.stderr.trim()}` : ""}`);
  return options.capture ? result.stdout.trim() : "";
}

export async function readManifest(root) {
  return JSON.parse(await readFile(path.join(root, "release/public-release-manifest.json"), "utf8"));
}

export const sha256File = async file => createHash("sha256").update(await readFile(file)).digest("hex");

export async function auditContent(root, files) {
  const findings = [];
  const textExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".ts", ".tsx", ".txt", ".yml", ".yaml"]);
  const checks = [
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key"],
    [/\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/, "GitHub token"],
    [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key"],
    [/[A-Za-z]:\\Users\\[^\\\s]+/i, "absolute Windows user path"],
    [/\/Users\/[^/\s]+|\/home\/[^/\s]+/, "absolute user path"],
    [/\b[\w.+-]+@(?!example\.(?:com|org)\b)[\w.-]+\.[A-Za-z]{2,}\b/, "email address"]
  ];
  for (const file of files) {
    if (!textExtensions.has(path.extname(file).toLowerCase())) continue;
    const content = await readFile(path.join(root, file), "utf8");
    if (path.extname(file) === ".json" && /"sourcesContent"\s*:/.test(content)) findings.push(`${file}: sourcesContent`);
    for (const [regex, label] of checks) if (regex.test(content)) findings.push(`${file}: ${label}`);
  }
  if (findings.length) throw new Error(`Prohibited content found:\n${findings.join("\n")}`);
}

export async function assertRegularFile(file) {
  if (!(await stat(file)).isFile()) throw new Error(`Expected regular file: ${file}`);
}
