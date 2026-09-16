# Public Preview Rights Review

Release: `v0.1.0-preview`

Reviewer: Alexander Morton

Approval date: 2026-09-15
Approved rules baseline: original material or the official SRD 5.2.1 at <https://www.dndbeyond.com/srd>, under CC BY 4.0.

Prohibited source boundary: non-SRD rulebooks, non-SRD D&D Beyond pages, commercial supplements, third-party reports, private conversations, client submissions, and model output without verified provenance. Uncertain material is replaced with original generic material or excluded. This record intentionally contains no private conversation, client, or machine-path evidence.

| Artifact class | Public paths | Source basis | Prohibited-source check and disposition | SHA-256 |
| --- | --- | --- | --- | --- |
| Application and UI text | `src/**` | Original product interface; ordinary rules terms checked against SRD 5.2.1 | No non-SRD expressive passage retained; `retain-SRD-with-attribution` | `a45871d919909b00c0ef1c464a23033b55703f7835b0f4df3bacefc7e34f286c` |
| Prompts and schemas | `server/constants/prompts.ts`, `server/types.ts`, provider/handler code | Original structured instructions plus SRD-compatible terminology | Private planning/report language excluded; uncertain phrasing replaced; `retain-SRD-with-attribution` | `9c1912e09ea8d75e331edf4d338b827393ddaef1f7bf244d545a11455cf60b86` |
| Tests and fixtures | `src/**/*.test.*`, `server/**/*.test.ts` | Original synthetic fixtures and behavioral tests | Names and scenarios checked as fictional; no client fixture retained; `retain-original` | `d50301202dcde8b9c88ce6987946fa3da2eb095fcb78d1e31c7300dcf87191a4` |
| Runtime template | `Base/template.html` | Original export layout and styling | Only the runtime template retained from `Base/`; `retain-original` | `2afb51e86eb04690944255c407cb2205e1bb5dcf8471da361538dbc87763ee32` |
| Fictional example | `examples/fictional-encounter/**` | Original fictional setting, actors, and encounter text | No client or model-derived material; `retain-original` | `cbf2152916da854b38efe3fa66dc3c479317e801277d042377c9d6c67e748be6` |
| Screenshots | `docs/assets/briefing-intake.png`, `docs/assets/encounter-builder.png`, `docs/assets/gm-advisor.png` | Captured from the sanitized local preview using fictional synthetic/empty state | Reviewed for paths, secrets, submissions, and third-party expressive content; `retain-original` | `8ba5b7deb4ef01cf9212225b1556d20ff2bb95c421cff0b208ac4b534fc614ff` |
| Public documentation | `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE.md`, `NOTICE.md`, `docs/*.md` | Original documentation; official two-sentence SRD attribution in `NOTICE.md` | Private plans/reports excluded; `retain-SRD-with-attribution` | `ab04e5e54927cec395ebb8ecf2147120164f59661b00f6bab6296c8bfb1d616c` |

The two sentences in `NOTICE.md` reproduce Wizards’ recommended SRD attribution and link structure. CC BY 4.0 governs retained SRD material; the Encounter Factory evaluation terms do not restrict that material.

## Final assertion

Alexander Morton confirms that “The Bell Beneath Ashfall” briefing and encounter are fictional and original, contain no client material, and are distributed under the same Encounter Factory source-available evaluation terms as the other original portions of this preview.
