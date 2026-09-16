# Local Preview Security Boundary

## Supported execution

The preview supports local Node.js execution and `docker compose up --build` only. Local Node defaults to `HOST=127.0.0.1` and `PORT=3000`. The container listens on `0.0.0.0:3000` internally, while Compose publishes exactly `127.0.0.1:3000:3000` on the host.

Blank, malformed, URL-like, path-like, remote-interface, and unsupported wildcard `HOST` values fail startup. `PORT` must be an integer from 1 through 65535. Startup reports only the effective host, port, environment, and `local-preview` mode.

This is not a public-hosting architecture. Do not use an all-interface mapping such as `3000:3000`, a reverse proxy, a tunnel, a cloud service, or standalone `docker run -p`.

## Operator authentication

The server requires `OPERATOR_ID` (a stable UUID) and `OPERATOR_TOKEN` (32–512 UTF-8 bytes without whitespace or control characters). Missing, blank, whitespace-surrounded, malformed, or known-placeholder values stop startup before listening. Tokens and digests are never logged.

Protected routes require one `Authorization: Bearer <token>` value. Missing credentials return `401 AUTH_REQUIRED`; malformed or incorrect credentials return `401 AUTH_INVALID`. Both include `WWW-Authenticate: Bearer`. The browser keeps the entered token only in `sessionStorage`, reads it for each request, and clears it only after an authentication 401.

## Intake, ownership, and export

`POST /api/sessions` remains unauthenticated so a visitor at the same local preview can submit `{clientName, data}`. The server creates the session UUID. The submission browser holds it only in page memory for confirmation and receives no owner or export authority.

An authenticated generation request atomically binds the operator subject, session, and one reserved job UUID before background work begins. A different owner is denied with 403; a duplicate by the winning owner receives 409. Persistence failure rolls back both sides.

Exports fail closed. A valid operator token does not authorize a cross-owner job or session. HTML export additionally requires matching reciprocal job/session IDs, a completed encounter job, and exportable output. VTT, Obsidian, job-scoped, and session-scoped exports use the same owner comparison.

## Data handling

Queued submissions and generated jobs are local files under `storage/`, which is excluded from the public release. This preview provides no encryption-at-rest, retention guarantee, tenant isolation, abuse prevention, or public rate limiting. Do not submit secrets or regulated data.
