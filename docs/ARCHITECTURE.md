# Encounter Factory Architecture

Durable architecture memory for Codex agents. Keep this file compact, factual, and searchable. Do not paste chat transcripts.

## Current Stack
- Last updated: 2026-09-14
- Language/runtime: TypeScript ESM on Node.js 22.
- Frontend: React 19, Vite, Tailwind CSS 4, `motion`, `lucide-react`.
- Backend: Express server in `server.ts` with services under `server/`.
- Validation: Zod schemas in `server/types.ts`.
- Tests: Vitest with jsdom, colocated `*.test.ts` / `*.test.tsx`.
- Package manager: npm with `package-lock.json`.
- Deployment: local Node defaults to `127.0.0.1:3000`; the container explicitly listens on `0.0.0.0:3000`, while the only supported container launch path, Docker Compose, publishes exactly `127.0.0.1:3000:3000`. Vite production builds use manual vendor chunks for React, Motion, Lucide, and shared UI utilities.

## Application Shell
- Last updated: 2026-07-04
- Responsibilities: Serve the React app, expose API routes, initialize math/audit settings, initialize pipeline handlers, hydrate/resume jobs, and own the active React shell for dashboard, generation polling, result mapping, and GM Advisor overlays.
- Key files: `server.ts`, `src/main.tsx`, `src/EncounterFactoryShell.tsx`, `src/components/AppRouter.tsx`, `src/index.css`.
- Inputs: HTTP requests, environment variables, local persisted job/session files.
- Outputs: API JSON, generated encounter exports, Vite-served frontend during development.
- External dependencies: Express, Vite, AI provider APIs when explicitly run.
- Invariants: `src/main.tsx` mounts `EncounterFactoryShell`. Its unauthenticated mode can submit a public briefing but retains the returned session UUID only in component memory. Operator access uses a runtime-entered token held only in browser `sessionStorage`; the server validates it against server-only `OPERATOR_TOKEN` and uses stable UUID `OPERATOR_ID` as the principal. Clear the browser token only on authentication 401. Protected exports compare that principal to persisted ownership; HTML export additionally requires reciprocal session/job binding, a completed encounter job, and exportable output. All marked or model-produced HTML passes through `src/utils/sanitizeHtml.ts`; HTML/VTT/Obsidian exports do not depend on Puppeteer/Chromium; avoid external network calls without user permission.

## Pipeline Orchestration
- Last updated: 2026-07-04
- Responsibilities: Register bot handlers, execute the encounter pipeline, skip completed step data during resumption, run simulation audits, and export final encounter content.
- Key files: `server/services/orchestrator.ts`, `server/services/botRegistry.ts`, `server/services/handlers/*`, `server/types.ts`.
- Inputs: `GMSetup`, current pipeline state, optional auditor feedback.
- Outputs: `FullPipelineState`, progress events, exported encounter artifacts.
- External dependencies: AI adapters from `server/services/aiProvider.ts`, Cheerio for HTML extraction.
- Invariants: Treat MathEngine outputs as authoritative; use Zod-validated structured outputs; keep bot output JSON clean and schema-aligned; schema-strict steps use Gemini Pro and are not overridden by DeepSeek routing.

## Jobs And Persistence
- Last updated: 2026-09-14
- Responsibilities: Manage background encounter/advice jobs, sessions, active-claim concurrency, TTL cleanup, shutdown checkpointing, and resume behavior.
- Key files: `server/services/jobManager.ts`, `server/services/persistenceService.ts`, `storage/`.
- Inputs: API job/session requests and persisted job/session JSON.
- Outputs: job events, resumed jobs, session exports, persisted state.
- External dependencies: local filesystem storage.
- Invariants: Do not run multiple orchestrators for the same job. Public intake creates an ownerless server UUID and never accepts client-supplied owner/client identity. Session-backed generation synchronously claims one reciprocal session/job binding for the authenticated principal before persistence and background execution; a competing owner receives 403, a same-owner duplicate receives 409, and persistence failure rolls back both sides. `QueuedSession` remains the source of truth for queue/history. Protected job and export routes fail closed on owner mismatch. Job-start envelopes are strict and contain no `ownerId` or legacy `clientId`. Persisted records remain Zod-validated and invalid hydration is quarantined.

## Public Release Boundary
- Last updated: 2026-09-14
- Responsibilities: assemble a source-visible preview without importing private history, metadata, generated/runtime files, reports, archives, secrets, or nonapproved assets.
- Key files: `release/public-release-manifest.json`, `scripts/public-release/`, `.github/workflows/ci.yml`, `docs/RIGHTS_REVIEW.md`.
- Invariants: a private RC commit is immutable input; assembly uses `git archive` of its exact 40-character SHA, verifies its tree SHA, selects only manifest-allowed paths, regenerates controlled ignore/package rules, creates one parentless public root, stages explicit files, and audits staged paths plus reachable blobs. The private manifest contains zero provenance sentinels to avoid an impossible self-referential commit hash; assembly replaces them in the public root with the exact RC commit/tree and rights-record digest before committing. `Base/template.html` is the only public `Base/` runtime asset. Build output stays untracked. A release requires Docker context/build verification and Alexander Morton's final rights approval.

## Math And Domain Rules
- Last updated: 2026-07-04
- Responsibilities: Calculate encounter math, HP/DPR targets, lethality, environmental modifiers, action budgets, and resilience scaling.
- Key files: `server/services/mathEngine.ts`, `server/services/math/`, and public tests that pin deterministic calculations.
- Inputs: party profile, encounter setup, actor statistics, tactical constraints.
- Outputs: deterministic math targets, summaries, warnings, and validation signals.
- External dependencies: none identified.
- Invariants: Do not propagate null mechanical driver values; use phase/wave design instead of spongy single HP pools; preserve the deterministic kill-clock benchmarks covered by tests.

## AI Provider Boundary
- Last updated: 2026-07-04
- Responsibilities: Select Gemini, DeepSeek, or OpenRouter adapters based on environment and pipeline step; map prompt/config formats; normalize SDK-compatible responses.
- Key files: `server/services/aiProvider.ts`, `server/constants/prompts.ts`, `server/services/handlers/*`.
- Inputs: prompt parameters, Zod schemas, environment keys.
- Outputs: raw model text in SDK-compatible response shape.
- External dependencies: `@google/genai`, OpenRouter API, DeepSeek API.
- Invariants: Ask before external network/API calls; include explicit JSON templates for structured outputs; strip or handle non-JSON model wrappers before parsing.

## Architecture Sources
- Last updated: 2026-09-14
- Public source, tests, this architecture record, and the security-boundary document are the only release-visible architecture sources.
- Public-preview CI runs generation drift, typecheck, scoped ESLint, tests, build, manifest/tree/object/package checks, and mandatory Docker checks.
