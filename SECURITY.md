# Security Policy

## Preview boundary

Encounter Factory v0.1.0-preview is designed only for local evaluation. It has not been hardened for public-network deployment, multi-user operation, or untrusted hosting. Use the supported local Node workflow or `docker compose up --build`; do not expose port 3000 beyond loopback.

Operator credentials belong only in the server-side `.env` file. The browser stores a runtime-entered operator token in `sessionStorage` and clears it when that browser session closes or authentication returns 401.

## Reporting

Do not open a public issue containing a secret, submitted briefing, generated encounter, machine path, or vulnerability exploit. Use GitHub’s private security-advisory reporting for the repository. No response-time commitment is offered for this evaluation preview.
