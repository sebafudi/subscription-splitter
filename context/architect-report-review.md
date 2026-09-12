# Architect report - independent accuracy review

Scope: `context/architect-report.md`, `context/architect-companion.md`, and the rendered `evidence/architect/architect-report.{pdf,html}`. Checked against the four source artifact sets, the two decision records, the plan review, the organizer prompt in `/Users/sebastian.f/Projects/10xDevs/offline/lessons/20-tasks.md`, and directly against the analyzed clone at `/Users/sebastian.f/Projects/10xDevs/analysis/hono`, confirmed at `edd138ee3049749190de3dcd7e32d7bcbf224e41` via `git rev-parse HEAD`.

Reviewer note: fresh context, no subagents. No file other than this one was created or modified.

## Verdict

**Accurate with corrections.**

Twenty claims were traced to artifacts and re-verified in the clone. Eighteen are confirmed, one is unsourced and wrong, one is artifact-faithful but contradicted by the clone. Neither error changes any conclusion the report draws, and no fabricated narrative was found: the substance, the deferrals, the rejections and the decision reasoning all hold up against the sources. The report is structurally compliant with the organizer prompt on the points that carry weight (six sections in order, source repository stated per artifact, Builder application identified as separate, deferred and rejected items and unknowns present) and has three smaller gaps against the prompt's sub-bullets.

The two numeric errors must be fixed before submission, because the prompt's explicit rule is that every structural claim rests on an artifact rather than on memory, and one of the two rests on neither an artifact nor the code.

## Checked claims

Verification method key: `rg` / `ast-grep 0.45.3` / `git` run in the clone; `depcruise` means `dependency-cruiser 18.2.0` re-run with the exact command recorded in `context/map/artifact-2-structure.md`.

| # | Claim in the report | Source artifact | Clone verification | Result |
|---|---|---|---|---|
| 1 | Pinned commit `edd138ee3049749190de3dcd7e32d7bcbf224e41` | header line of every artifact | `git rev-parse HEAD` returns that hash | Confirmed |
| 2 | `git describe --tags`: `v4.13.7-7-gedd138ee` | same | `git describe --tags` returns `v4.13.7-7-gedd138ee` | Confirmed |
| 3 | 2815 total commits | `artifact-1-territory.md:9` | `git rev-list --count HEAD` = 2815 | Confirmed |
| 4 | 76 public export subpaths | `artifact-2-structure.md:34`, `repo-map.md:9` | `package.json` `exports` has 76 keys | Confirmed |
| 5 | Zero runtime dependencies | `01-domain-distillation.md:25` | `package.json` has no `dependencies` field at all | Confirmed |
| 6 | "~289 `src/` files" | **none** - this figure appears in no artifact | `src/` holds 312 files, 311 of them `.ts`/`.tsx`, 188 non-test modules. 289 matches nothing | **Wrong and unsourced** |
| 7 | 188 `src/` modules | `artifact-2-structure.md:29` | `depcruise` re-run: `totalCruised` = 188 | Confirmed |
| 8 | 568 dependency edges | `artifact-2-structure.md:29,86` | `depcruise` re-run: `totalDependenciesCruised` = 568 | Confirmed |
| 9 | `types.ts` fan-in 53 | `artifact-2-structure.md:39` | `depcruise` re-run: 53 dependents, re-counted from raw edges = 53 | Confirmed |
| 10 | `context.ts` fan-in 46 | `artifact-2-structure.md:40` | `depcruise` re-run: **40** dependents, re-counted from raw edges = 40. The artifact's own instability figure for the same file (0.167 = 8/(40+8)) also implies 40, so the artifact is internally inconsistent | **Wrong** (faithful to the artifact, contradicted by the clone) |
| 11 | Layer boundaries clean, zero violations across 568 edges | `artifact-2-structure.md:80-86` | All five forbidden-import rules re-evaluated against the raw edge list from the `depcruise` re-run: 0 violations each | Confirmed |
| 12 | Core is the top risk zone by three independent signals (co-change, fan-in, cycle membership) | `repo-map.md:54`, `artifact-2-structure.md:70`, `artifact-3-contributors.md:11` | Fan-in and edge data re-derived above; co-change and cycle clustering taken from the artifacts | Confirmed |
| 13 | Core-spine knowledge concentrated in one contributor, with a documented revert there | `artifact-3-contributors.md:25,39,47` | `git shortlog -sn --since="12 months ago"` over the seven spine files: Yusuke Wada 19, next highest 3. Reverts present: `212c64f2` ("revert PR #4707"), and the `3fbbd96a` (#5174) / `5fc8aadf` (#5186) drop-then-restore pair | Confirmed |
| 14 | Unknown: graph scoped to `src/`; `runtime-tests/`, `perf-measures/`, `benchmarks/` have no import graph | `repo-map.md:92` | The re-run command is scoped `--include-only '^src'`, so those trees are genuinely absent from the graph | Confirmed |
| 15 | Zero `matchResult` references in `compose.test.ts` against 30 `Context` constructions | `hono-refactor-opportunities/research.md:48`, `plan.md:15` | `rg -c "new Context\(" src/compose.test.ts` = 30; `rg -c "matchResult" src/compose.test.ts` = no match; `routeIndex` also absent | Confirmed |
| 16 | The fast dispatch path lacks a guard the general path has, that guard being its only occurrence in `src/` | `ast-grep-verification.md` section 9, `hono-refactor-opportunities/research.md:76` | `ast-grep run --pattern 'if ($I <= $INDEX) { throw $ERR }' --lang ts src` returns exactly one hit, `src/compose.ts:33-35`; `rg -n "called multiple times\|i <= index" src/hono-base.ts` returns nothing; `rg -n "matchResult\[0\]\.length" src` returns only `src/hono-base.ts:432` | Confirmed |
| 17 | Cookie-header-merge logic implemented twice with opposite behavior | `hono-refactor-opportunities/research.md:92-98`, `02-invariant-aggregate-refactor.md:35-39` | Both blocks read in full. The `res` setter deletes `set-cookie` on the incoming response and re-appends only the old cookies, so new cookies are dropped. `#newResponse` appends, so both survive. Opposite, exactly as described | Confirmed |
| 18 | README lists Node.js and Fastly Compute, which this repository's adapters do not ship | `01-domain-distillation.md:57,72` | `README.md:22` and `:45` name both runtimes; `ls src/adapter` returns 9 directories, none of them `node` or `fastly` | Confirmed |
| 19 | The refuted K1 claims: the field is documented for user reads, the precedent does not match, the historical bug was caused elsewhere | `plan-review.md:36-40`, `D-004`, `hono-refactor-opportunities/research.md:36-44` | `src/request.ts:419` carries `i === c.req.routeIndex` inside a public `@example` block; `routeIndex` is a plain public field at `src/request.ts:53`; `GET_MATCH_RESULT` is getter-only at `src/request.ts:394` over the private `#matchResult`, with one internal consumer at `src/helper/route/index.ts:34` behind a `@ts-expect-error` | Confirmed |
| 20 | Builder application is Hono on Cloudflare Workers and D1 | project files | `package.json` depends on `hono@4.13.7`; `wrangler.jsonc` declares `d1_databases` | Confirmed |

### Note on the upstream artifact

Claim 10 is a defect in `context/map/artifact-2-structure.md`, not something the report invented. The re-run shows further rows of that artifact's fan-in table are also inflated: `router.ts` 23 (actual 15), `jsx/base.ts` 22 (actual 17), `utils/html.ts` 18 (actual 12), `jsx/context.ts` 16 (actual 11). `types.ts` 53, `hono.ts` 17 and `http-exception.ts` 12 are exact. Only the `context.ts` figure reaches the report, so only that one is a required report correction, but the source table is worth fixing so the two documents do not disagree if a reviewer opens both.

## Structural findings

Against the organizer prompt in `20-tasks.md` lines 29-58.

**Compliant.** Exactly six sections, in the prescribed order, with the prescribed titles. The analyzed repository is stated once in the header and again as a `Source:` line under each of sections 2 through 5, so each artifact's provenance is unambiguous. The Builder application is named in the header and given its own table row marked "Not analyzed here", which satisfies the prompt's instruction that artifacts may come from different projects and each must say which. No artifact is missing, so the "BRAK artefaktu" annotation is correctly not used. Deferred items (the accessor, the cookie-merge consolidation), rejected items (the router result-shape normalization, the full fast-path merge) and unknowns (section 2's graph-scope limitation) are all present. Nothing in the report asserts a fact I could not trace, apart from claim 6.

**Three gaps against the prompt's sub-bullets.**

1. Section 2 is asked for risk zones, local centers, entry points and the most important unknowns. Risk zones, centers and unknowns are covered; entry points are not. The report mentions the 76 export subpaths as a surface but never names `src/index.ts`, which `repo-map.md:79` and `artifact-2-structure.md:33` both identify as the thin public barrel.
2. Section 4 is asked for the plan's phases, one line each, plus how each is verified. The report compresses both phases into a single closing sentence, so neither phase is individually stated.
3. Section 5 is asked for invariant #1 **and the aggregate it belongs to**. The invariant is stated well; the aggregate is not named. `02-invariant-aggregate-refactor.md:45` names `Context` as the aggregate root.

A fourth, softer point: section 3's feature overview is asked for in three to four sentences and is delivered as one long sentence. The content is all there, so this is a readability observation rather than a missing requirement.

## Section 6 assessment

Section 6 reads as real decisions with rationale, not as a summary of generated output. Each of the four decisions names a choice, an alternative that was available, and a reason grounded in evidence rather than preference.

- Choosing Hono over the Builder application matches `D-002`'s decision and rationale, including the specific reason given there (a fresh build has no commit history to mine, and presenting it as established would be dishonest).
- Choosing the request-dispatch flow because two artifacts converged on it matches `hono-request-dispatch-analysis/research.md:5`, which cites the map's risk zones and first-day reading list by name.
- Deferring the top-ranked candidate after the review rather than defending it matches `D-004`'s Review objection and Resolution and the plan review's F7 and Resolution table. The report's framing, that the corrected evidence changed what was worth doing, is exactly the reasoning `D-004`'s Resolution records: a small blast radius is a reason a fix is safe to attempt, not a reason it is worth attempting.
- Deferring the cookie-merge consolidation behind a characterization step matches `D-004`'s rejected-alternative paragraph and `plan.md:41`.
- The anti-corruption-layer decision to recommend prevention rather than remediation matches `03-anti-corruption-layer.md:68`.

The "three of its four supporting claims" count matches `D-004` and `hono-refactor-opportunities/research.md:30`. The plan review's own counter-question section phrases it as three claims of which two are contradicted and one does not support the remedy, while its F7 entry says three of four axes are affected. The report follows the decision record's wording, which is the right document to follow.

## Rendering findings

Measured with `pdfinfo` and `pdftoppm` against `evidence/architect/architect-report.pdf`.

| Property | Value |
|---|---|
| Pages | 2 |
| Page size | A4, 594.96 x 841.92 pts |
| Smallest font declared | 9.3pt |
| Page 2 fill | roughly 55 percent |

Within the two-page limit. Page images saved for inspection at `/Users/sebastian.f/Projects/10xDevs/subscription-splitter/evidence/architect/pages/page-1.png` and `page-2.png`, rendered at 110 dpi.

Legibility is good. Body text sits at 9.5pt to 11pt with the 9.3pt size used only for the monospace inline code spans, which stay readable at print size. Nothing is cut off, the single table fits inside the text block with no overflow, and no line runs past the margin. Page 2 has roughly a page-third of free space, so the three structural gaps above can be filled without pushing past two pages.

One divergence between the markdown and the rendered artifact: three places where the markdown uses " - " as a clause separator render as ", " in the HTML and therefore in the PDF. The rendered sentences read as comma splices:

- "the deferred accessor (blocked, it would be a breaking change to a documented public property)"
- "response cookies must be preserved when headers are merged, found not merely weakly tested but actively violated today"
- "rather than defending or patching the original justification, the corrected evidence changed what was actually worth doing"

Since the PDF is the submitted deliverable, these should be repaired in whatever step produces the HTML, not left as a markdown-only difference.

## Hygiene

Clean on every point checked. No em dashes in the report, the companion or the rendered HTML. No en dashes. No authored calendar dates and no time or effort estimates anywhere in either document; the only dates present are Git-reported metadata inside the PDF's own creation timestamp, which is tooling output rather than authored text. Both documents are pure ASCII and written in English, which the organizer thread explicitly permits ("Raport architektoniczny - w jezyku polskim, angielskim, czy dowolnie?" answered "dowolnie").

## Required corrections

Exact text to change in `context/architect-report.md`, with the rendered HTML and PDF regenerated afterwards.

**1. Section 1 table, scale cell for honojs/hono.** The "~289" figure is in no artifact and matches nothing in the clone.

- Replace: `~289 \`src/\` files, 2815 total commits, 76 public export subpaths`
- With: `188 \`src/\` modules (311 TypeScript files including tests), 2815 total commits, 76 public export subpaths`

**2. Section 2, fan-in figure.** The clone gives 40, and the source artifact's own instability figure for the same file implies 40.

- Replace: `\`context.ts\` fan-in 46`
- With: `\`context.ts\` fan-in 40`

**3. Section 3, source attribution for the cookie finding.** The cited L3 research states at line 105 that the two copies "currently agree"; the disagreement is an L4 and L5 finding. The sentence is true but its declared source contradicts it.

- Replace: `the response's cookie-header-merge logic is implemented twice with opposite behavior, not in agreement as first assumed;`
- With: `the response's cookie-header-merge logic is implemented twice with opposite behavior, a correction made in L4 and independently in L5, not in agreement as this artifact first assumed;`

**4. Section 4, verification claim.** Phase 1's manual verification is reading the new test to confirm it dispatches through the real composer, not a benchmark comparison; only Phase 2 carries the benchmark step. The current sentence attributes the benchmark to both phases, and does not give the phases one line each as the prompt asks.

- Replace: `Each phase is a separately reversible commit with automated (typecheck, test, lint, format, and a bundle-size check where relevant) and manual (benchmark comparison against the pinned commit) verification.`
- With: `Two phases, each a separately reversible commit. Phase 1, the characterization test: verified automatically by typecheck, test, lint and format, and manually by reading the test to confirm it dispatches through the real composer rather than setting the index by hand. Phase 2, the fast-path guard: the same four automated checks plus build and a bundle-size check, and manually by running the project's HTTP benchmark against the pinned commit as baseline.`

**5. Section 5, name the aggregate.** The prompt asks for invariant #1 and the aggregate it belongs to.

- Replace: `Invariant #1: response cookies must be preserved when headers are merged`
- With: `Invariant #1, on the \`Context\` aggregate: response cookies must be preserved when headers are merged`

**6. Section 2, name the entry point.** The prompt lists entry points among the map takeaways. Suggested insertion after the first sentence:

- Add: `The entry point is a thin barrel, \`src/index.ts\`, which re-exports the core and carries no logic of its own.`

**7. Rendered artifact only.** Repair the three " - " to ", " substitutions listed under Rendering findings so the PDF does not carry comma splices.

### Recommended, not required

Fix the fan-in table in `context/map/artifact-2-structure.md` so it does not contradict the corrected report: `context.ts` 46 to 40, `router.ts` 23 to 15, `jsx/base.ts` 22 to 17, `utils/html.ts` 18 to 12, `jsx/context.ts` 16 to 11. `types.ts` 53, `hono.ts` 17 and `http-exception.ts` 12 are correct as written.

## Companion findings

`context/architect-companion.md` does its job. It is understandable end to end without opening any artifact, it names the analyzed repository and commit in its first line, and it covers all five things it is meant to cover: what was analyzed and why, three findings, what was selected and why, what was rejected and why, and limitations. It does not contradict the report on any substantive point, and its account of the plan review, the deferral and the unimplemented status all match the decision records. The limitations paragraph is honest in the right places, in particular that the performance cost must be measured rather than assumed, that the domain notes surface a product decision without making it, and that nothing was implemented.

Four imprecisions worth tightening.

1. **Finding 1 overstates the fan-in reach.** "Out of 76 things a developer can import from Hono, almost all of them ultimately depend on two files" is stronger than the source. `artifact-2-structure.md:48` says those two files are imported directly by roughly a quarter to a third of `src/` modules, and the corrected `context.ts` figure of 40 makes its share closer to a fifth. The "funnels into a small, stable core" claim in `repo-map.md:9` is about six files, not two. Suggested: "almost all of them reach a small core of about six files, two of which, `types.ts` and `context.ts`, are imported directly by a large share of the codebase."

2. **Finding 2 misattributes where the disagreement was found.** "This was found twice, independently, once while researching test coverage and once while researching the domain rules" is not what happened. The test-coverage pass found the duplication and concluded the two copies agreed. The disagreement was found in the refactor exploration and then independently in the domain notes. That is still two independent discoveries, so the point survives, but the pairing named is wrong.

3. **"The project's own automated tests specifically measure the speed of that fast path on every code change."** It is a pull-request-gated benchmark job, not a test. A reader who checks will not find a test asserting on speed. Suggested: "the project runs a benchmark on every pull request that measures exactly that fast path."

4. **"Close a small gap where the 'fast path' for simple requests can be triggered twice by mistake with no error."** What can be called twice is the continuation callback handed to the handler, not the fast path itself. As written it suggests double dispatch of the whole request.

None of these four changes a conclusion, and none is a fabricated fact. They are paraphrase drift of the kind that matters only if someone questions the report and the companion is the document used to answer.
