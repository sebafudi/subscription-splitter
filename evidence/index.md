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
