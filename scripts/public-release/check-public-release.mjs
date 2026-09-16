import { access, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditContent, listFiles, matchesAny, patternMatches, readManifest, run, sha256File } from "./public-release-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const publicTree = process.argv.includes("--public-tree");
const requireDocker = process.argv.includes("--require-docker");
const manifest = await readManifest(root);

const reserveLoopbackPort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      reject(new Error("Unable to reserve a loopback port for the Compose smoke test."));
      return;
    }
    server.close(error => error ? reject(error) : resolve(address.port));
  });
});

const waitForHealth = async url => {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The container may still be starting.
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Compose smoke endpoint did not become healthy: ${url}`);
};

run(process.execPath, [path.join(root, "scripts/public-release/generate-controlled-files.mjs"), "--check"]);
run(process.execPath, [path.join(root, "scripts/public-release/check-rights-review.mjs")]);
const files = await listFiles(root);
const candidateFiles = publicTree ? files : files.filter(file => matchesAny(manifest.publicTreeAllow, file));
const forbidden = candidateFiles.filter(file => matchesAny(manifest.deny, file) && file !== ".env.example");
const outsideAllow = publicTree ? files.filter(file => !matchesAny(manifest.publicTreeAllow, file)) : [];
if (forbidden.length) throw new Error(`Denylisted paths found:\n${forbidden.join("\n")}`);
if (outsideAllow.length) throw new Error(`Paths outside publicTreeAllow:\n${outsideAllow.join("\n")}`);
await auditContent(root, candidateFiles);

const productionRoot = path.join(root, "dist");
try {
  await access(productionRoot);
  const productionFiles = await listFiles(productionRoot);
  const sourceMaps = productionFiles.filter(file => file.endsWith(".map"));
  if (sourceMaps.length) throw new Error(`Production source maps are prohibited:\n${sourceMaps.join("\n")}`);
  await auditContent(productionRoot, productionFiles);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const rightsDigest = await sha256File(path.join(root, "docs/RIGHTS_REVIEW.md"));
if (!/^0{64}$/.test(manifest.rightsReviewRevision) && rightsDigest !== manifest.rightsReviewRevision) {
  throw new Error("rightsReviewRevision does not match docs/RIGHTS_REVIEW.md.");
}

if (publicTree) {
  if (!/^[0-9a-f]{40}$/.test(manifest.sourceRevision) || /^0{40}$/.test(manifest.sourceRevision)) throw new Error("Public sourceRevision is not an exact commit SHA.");
  if (!/^[0-9a-f]{40}$/.test(manifest.sourceTree) || /^0{40}$/.test(manifest.sourceTree)) throw new Error("Public sourceTree is not an exact tree SHA.");
  const staged = run("git", ["ls-files", "-z", "--stage"], { cwd: root, capture: true }).split("\0").filter(Boolean).map(line => line.slice(line.indexOf("\t") + 1)).sort();
  const expected = [...files].sort();
  if (JSON.stringify(staged) !== JSON.stringify(expected)) throw new Error("The staged Git tree differs from the assembled filesystem.");

  const objects = run("git", ["rev-list", "--objects", "--all"], { cwd: root, capture: true }).split(/\r?\n/).filter(Boolean);
  for (const row of objects) {
    const [objectId, ...nameParts] = row.split(" ");
    const type = run("git", ["cat-file", "-t", objectId], { cwd: root, capture: true });
    if (type === "blob") {
      const name = nameParts.join(" ");
      if (!name || !matchesAny(manifest.publicTreeAllow, name) || (matchesAny(manifest.deny, name) && name !== ".env.example")) throw new Error(`Prohibited reachable blob: ${name || objectId}`);
      run("git", ["cat-file", "blob", objectId], { cwd: root, capture: true });
      const workingObject = run("git", ["hash-object", "--", name], { cwd: root, capture: true });
      if (workingObject !== objectId) throw new Error(`Reachable blob differs from audited file: ${name}`);
    }
  }
  const parentRow = run("git", ["rev-list", "--parents", "HEAD"], { cwd: root, capture: true });
  if (parentRow.includes("\n") || parentRow.trim().split(/\s+/).length !== 1) throw new Error("Public history must contain one parentless root commit.");
  const unreachable = run("git", ["fsck", "--full", "--no-reflogs", "--unreachable"], { cwd: root, capture: true });
  if (unreachable) throw new Error(`Unreachable Git objects found:\n${unreachable}`);

  const npmArgs = ["pack", "--dry-run", "--json"];
  const packOutput = process.platform === "win32"
    ? run(process.execPath, [path.join(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"), ...npmArgs], { cwd: root, capture: true })
    : run("npm", npmArgs, { cwd: root, capture: true });
  const pack = JSON.parse(packOutput);
  const packed = pack[0].files.map(entry => entry.path);
  const badPacked = packed.filter(file => !matchesAny(manifest.npmPackAllow, file) || matchesAny(manifest.deny, file));
  if (badPacked.length) throw new Error(`Unexpected npm package paths:\n${badPacked.join("\n")}`);
  const missingPackRules = manifest.npmPackAllow.filter(pattern => !packed.some(file => patternMatches(pattern, file)));
  if (missingPackRules.length) throw new Error(`npm package rules matched no output:\n${missingPackRules.join("\n")}`);
}

let composeJson = "";
try {
  composeJson = run("docker", ["compose", "config", "--format", "json"], {
    cwd: root,
    capture: true,
    env: {
      ...process.env,
      OPERATOR_ID: "12345678-1234-4234-8234-1234567890ab",
      OPERATOR_TOKEN: "release-check-only-token-123456789012345"
    }
  });
} catch (error) {
  if (requireDocker) throw error;
  console.warn("Docker unavailable; Docker checks skipped outside the mandatory release gate.");
}
if (composeJson) {
  const compose = JSON.parse(composeJson);
  const ports = compose.services?.["encounter-factory"]?.ports ?? [];
  if (ports.length !== 1 || ports[0].host_ip !== "127.0.0.1" || Number(ports[0].published) !== 3000 || Number(ports[0].target) !== 3000) {
    throw new Error("Compose must publish exactly 127.0.0.1:3000:3000.");
  }
  const temporary = await mkdtemp(path.join(os.tmpdir(), "encounter-factory-context-"));
  try {
    const auditDockerfile = path.join(temporary, "Dockerfile.context-audit");
    const exported = path.join(temporary, "exported");
    await mkdir(exported);
    await writeFile(auditDockerfile, "FROM scratch\nCOPY . /context\n", "utf8");
    run("docker", ["build", "--no-cache", "--output", `type=local,dest=${exported}`, "-f", auditDockerfile, root], { cwd: root });
    const exportedFiles = await listFiles(path.join(exported, "context"));
    const expectedContext = files.filter(file => matchesAny(manifest.dockerContextAllow, file)).sort();
    if (JSON.stringify(exportedFiles) !== JSON.stringify(expectedContext)) {
      throw new Error(`Docker context differs from dockerContextAllow.\nActual: ${exportedFiles.join(", ")}\nExpected: ${expectedContext.join(", ")}`);
    }
    run("docker", ["build", "-t", "encounter-factory:release-check", "."], { cwd: root });

    const smokePort = await reserveLoopbackPort();
    const smokeProject = `encounter-factory-release-${process.pid}`;
    const smokeOverride = path.join(temporary, "compose-smoke.yml");
    await writeFile(smokeOverride, [
      "services:",
      "  encounter-factory:",
      "    image: encounter-factory:release-check",
      "    restart: \"no\"",
      "    ports: !override",
      `      - \"127.0.0.1:${smokePort}:3000\"`,
      ""
    ].join("\n"), "utf8");
    const composeArgs = ["compose", "-p", smokeProject, "-f", path.join(root, "docker-compose.yml"), "-f", smokeOverride];
    const smokeEnv = {
      ...process.env,
      OPERATOR_ID: "12345678-1234-4234-8234-1234567890ab",
      OPERATOR_TOKEN: "release-check-only-token-123456789012345"
    };
    try {
      run("docker", [...composeArgs, "up", "-d", "--no-build"], { cwd: root, env: smokeEnv });
      await waitForHealth(`http://127.0.0.1:${smokePort}/api/health`);
      const smokeConfig = JSON.parse(run("docker", [...composeArgs, "config", "--format", "json"], { cwd: root, capture: true, env: smokeEnv }));
      const smokePorts = smokeConfig.services?.["encounter-factory"]?.ports ?? [];
      if (smokePorts.length !== 1 || smokePorts[0].host_ip !== "127.0.0.1" || Number(smokePorts[0].published) !== smokePort) {
        throw new Error("Compose smoke service was not published on its isolated loopback port.");
      }
      const logs = run("docker", [...composeArgs, "logs", "--no-color", "encounter-factory"], { cwd: root, capture: true, env: smokeEnv });
      if (!logs.includes("listening=http://0.0.0.0:3000") || !logs.includes("environment=production") || !logs.includes("mode=local-preview")) {
        throw new Error("Compose startup log omits the effective bind address or preview mode.");
      }
    } finally {
      run("docker", [...composeArgs, "down", "--remove-orphans"], { cwd: root, env: smokeEnv });
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

const dockerDocs = await readFile(path.join(root, "README.md"), "utf8");
if (/^\s*(?:\$\s*)?docker run\b[^\n]*\s-p\b/im.test(dockerDocs)) throw new Error("README contains an unsupported standalone docker run -p example.");
if (!dockerDocs.includes("127.0.0.1:3000:3000")) throw new Error("README omits the required loopback mapping.");
console.log(`Public release checks passed for ${candidateFiles.length} files.`);
