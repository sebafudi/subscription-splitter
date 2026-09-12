# Evidence index

Maps goal IDs to artifacts, commits, run IDs, commands with results and screenshots.

| Goal | Artifact(s) | Commit / run | Notes |
|---|---|---|---|
| W01 | `context/`, `evidence/`, `.gitignore` | (baseline commit) | Fresh repository; no private prototype data or course material |
| A01 | `context/map/repo-map.md`, `context/decisions/D-002-architect-analysis-repository.md` | `2b8cdf3` | Analysis target: `honojs/hono` commit `edd138ee3049749190de3dcd7e32d7bcbf224e41` (`git describe --tags`: `v4.13.7-7-gedd138ee`), scope `src/` core; kept as a separate analysis repository from this application |
| A02 | `context/map/artifact-1-territory.md` | `2b8cdf3` | Git history territory: top active directories/files over 12 months, quarterly trend, co-change pairs, noise exclusions |
| A03 | `context/map/artifact-2-structure.md` | `2b8cdf3` | dependency-cruiser graph over `src/`: 188 modules, 568 dependencies; fan-in/fan-out, cycles, layer-boundary checks |
| A04 | `context/map/artifact-3-contributors.md` | `2b8cdf3` | Contributor analysis of the core spine (`context.ts`/`types.ts`/`hono-base.ts`/`request.ts`/`compose.ts`) via `git shortlog` |
| A05 | `context/map/repo-map.md` | `2b8cdf3` | Final synthesis of A02-A04 with Mermaid diagram, risk zones, first-day reading list |
| W02 | `AGENTS.md`, `context/foundation/` | `8de6d37` | AGENTS.md rewritten via the `10x-agents-md` procedure, 396 words, hard rules first; all five original rules preserved |
| W03 | `context/foundation/shape-notes.md`, `context/foundation/prd.md` | `8de6d37` | Shape notes with checkpoint frontmatter and the full interview record; requirements document with the 10 greenfield sections in schema order, 26 FRs, 5 user stories, passes the no-implementation-leak lint |
| W05 | `context/foundation/roadmap.md`, `context/foundation/test-plan.md` | `8de6d37` | Roadmap M-1 with F-01 and S-01 to S-05, every must-have FR and user story covered; risk-based test plan, 6 risks mapped to 4 rollout phases, unit / integration on local D1 / one browser smoke |
| A06 | `context/changes/hono-request-dispatch-analysis/research.md` | `9cf8fc5` | Feature overview (e2e trace + Mermaid sequence diagram) and Technical debt (test gaps, blast radius) for the request dispatch flow on `honojs/hono` commit `edd138ee3049749190de3dcd7e32d7bcbf224e41`; evidence/inference/unknown separated throughout |
| A07 | `context/changes/hono-request-dispatch-analysis/ast-grep-verification.md` | `9cf8fc5` | 15 structural claims from research.md checked with `ast-grep 0.45.3`: 12 confirmed, 3 refined; every zero-result corroborated with `rg`; corrections folded back into research.md |
