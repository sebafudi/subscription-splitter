# Visual redesign - plan brief

> Full plan: `context/changes/visual-redesign/plan.md`
> Design authority: `context/changes/visual-redesign/design-spec.md`
> Frame: `context/changes/visual-redesign/frame.md`
> Research: `context/changes/visual-redesign/research.md`

## What and why

Give the shipped product the visual language it has never had. The framing puts it precisely: the
product has correct, accessible, intrinsically responsive markup with no visual language over it and
no consistent feedback model inside it, and nothing in the test suite can tell whether a redesign of
it renders correctly. `design-spec.md` answers all sixteen design questions the frame raised and is
the authority this plan implements. Roadmap item S-06.

## Starting point

Four screens and nine components of hand-written React over one 279-line stylesheet with zero custom
properties, zero media queries and two colour literals. `color-scheme: light dark` hands every colour
to the browser and `font-family: system-ui` hands it the typeface, so there is no palette to replace.
Navigation is one `useState`; there is no router. The detail screen is one column roughly 4200px tall
at 390 with six sections and no in-page navigation. Two validation conventions coexist and two forms
show raw wire names to users. No success feedback exists anywhere. Participant deletion has no
confirmation while price, payment and schedule deletion each have a different one. No test in the
repository reads the client's markup, so the suite stays green through a redesign that renders
nothing.

## Desired end state

Every screen carries the ledger language: pale ledger ground, dark ink, hairline rules between
entries, tabular figures, and red ink only where money is owed. The detail screen leads with one
figure and a three cell ledger line instead of five equal cards, and a sticky section index reaches
any of its five sections. Every form opens as a disclosure, every field error is one sentence under
its own field with no wire name in it, every action confirms itself with a status line, and every
destructive action is confirmed in place without blocking the page. All of it holds at 1280 and 390,
in light and dark, with reduced motion honoured. The accounting, the routes, the wire names and the
three domain calls are untouched, and the designer accepts the result from captured evidence.

## Key decisions made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Information architecture | One page with a sticky section index, no router | A router would be a functional change outside this change's scope | Design spec 4.4 |
| Visual language | Ledger paper: green ground, ink text, hairline rules, red only for owed money | Borrows the object people used for this job before software | Design spec 1 |
| Typeface | Self-hosted IBM Plex Sans through `@fontsource/ibm-plex-sans@5.3.0`, weights 400 and 600, latin and latin-ext, declared as four hand-written `@font-face` blocks | The package's CSS entry points would ship a woff fallback beside each woff2, doubling the payload to 154,380 bytes against a 160 KB budget | Design spec 2.2, Plan |
| Money display | One leading figure plus a four cell ledger line; recorded is ink, assumed is pencil | Principle 1 of the design, and the recorded-versus-assumed split is shipped accounting | Design spec 3.12, 4.4 |
| Participants heading | No count; "Active participants" stays a ledger cell with the API value | The API count includes the organizer, who is never a row, so a heading count could not agree with the list | Design spec 4.4, 5.1 |
| Control boundaries | A second token, `--border`, separate from the hairline `--rule` | A 1px `--rule` box reaches 1.5:1 and fails non-text contrast on a screen whose whole model is filling in fields | Design spec 2.1 |
| Focus | Every close path has a named destination, down to the section `h2` after a delete | Otherwise Keep and a completed delete drop focus to the body, in a column roughly 4200px tall | Design spec 3.7, 3.10, 7 |
| Validation | One convention: a sentence under its own field, with a per-form wire-name display map | Two conventions coexist today and two forms leak wire names | Design spec 3.8 |
| Destructive confirmation | One in-place strip across all four flows, non-blocking, focus on Keep | Participant delete gains the confirmation it lacks; the other three converge | Design spec 3.10 |
| Phase gate | A browser check, not a test run | A green suite proves nothing for a client-only change | Frame |
| Phase order | Bottom up: tokens, shared layer, Login, Home, then the detail screen in two halves | The design is a small set of shared parts reused everywhere | Plan |
| Test strategy | No new test and no DOM testing dependency | Adding a client test layer is its own change; the suites stay regression guards | Plan |
| Gaps in the spec | Recorded as checkpoints under `## Design questions` and returned to the designer | The spec forbids improvising appearance, hierarchy, copy, interaction or motion | Design spec 1, Plan |
| Out-of-panel errors | A second permanent alert per section, under the heading row, with Dismiss | A refused delete, archive, unskip or toggle fires outside every panel | Design spec 3.5 |
| Price delete | One strip in two steps, the second carrying the server's months and "Delete anyway" | The refusal is server-driven and names the months that would lose their price | Design spec 5.2 |

## Scope

**In scope:** `src/client/**`, `index.html`, `public/favicon.svg`, one pinned font dependency, and
evidence files under `evidence/runs/` and `evidence/screenshots/`.

**Out of scope:** any router or addressable screen; any component library, icon set, animation library
or CSS framework; any client-side arithmetic on money, shares, counted months or active counts; any
change to a Zod schema, a route, a repository, `src/domain/` or `src/server/`; any new test; the
deployment and the refreshed certification screenshots, which belong to a release step after the
designer accepts.

## Approach

Bottom up in six phases. Phase 1 lays the token layer, the self-hosted typeface, the base element
styling, the reduced-motion block, the product's glyph and wordmark, and the app bar. Phase 2 builds
the shared parts the design describes once, and adopts them on Login and session loading so the first
adoption is small enough to inspect completely. Phase 3 takes Home, the first screen to exercise the
section opening, the ledger entry, the disclosure panel and the status line together. Phases 4 and 5
take the detail screen in two halves. Phase 6 walks every screen and state at both widths, in both
themes, with reduced motion on and off, measures contrast and bundle, and captures the evidence the
designer reviews.

Every phase ends with a browser check at 1280 and 390 in both themes. The automated rows in each phase
are regression guards on the contract underneath the markup, not evidence of appearance.

## Phases at a glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Tokens, typeface and app bar | Both themes as custom properties, self-hosted Plex, button and input styling, focus, reduced motion, glyph, favicon, app bar | The stylesheet is replaced wholesale, so a missed base rule is invisible until a later phase renders over it |
| 2. Shared layer on Login | Section opening, ledger entry, disclosure panel, field and its error, status line, confirmation strip, money treatments, month formatter, all proven on Login and session loading | Parts Login does not exercise are only inspected at their first use in phase 3 |
| 3. Home | The list as ledger rows, the create form as a disclosure, the first status line and entry highlight | First contact with the wire-name display maps, which is where a leaked field name would show |
| 4. Detail top, index, Participants, Price history | Leading figure and four cell line replacing five cards, sticky section index at a 116px offset, participant form moved inside its section, the two-step price delete, the Archive toggle | The participant form changes ownership, and the price delete runs two steps inside one strip against a server-driven refusal |
| 5. Skipped months, Payments, Standing orders | The three remaining sections and the three tile states | Assumed money must never render in the recorded treatment, and the tile state must keep coming from one domain call |
| 6. Responsive, accessibility and acceptance | Full pass at both widths in both themes with motion on and off, text and non-text contrast and the bundle recorded, sixty-two captures for the designer | Findings here are design questions rather than fixes whenever they would change a specified appearance |

**Prerequisites:** none beyond what is on main. S-04 is done, the app is deployed and certified, and
the design specification and its mockups are committed. No phase waits on anything outside this
change.

**Size:** six phases, each landing on its own commit behind a browser check.

## Open risks and assumptions

- **The specification gaps are closed twice over.** Design questions D1 to D6 from planning, and the
  nine design findings the independent plan review raised, were all answered by the designer and folded
  into the specification, which records both sets in design-spec 12. The eleven engineering findings
  F1 to F11 are resolved in the plan and recorded in `reviews/plan-review.md` under `## Resolution`.
  The checkpoint protocol stays in the plan for anything implementation turns up: record it, stop that
  item, continue the rest, never improvise.
- **The suite cannot fail on appearance.** Every phase depends on a human walking its manual rows in a
  browser. A phase reported complete on its automated rows alone is not complete.
- **Two states cannot be produced locally through the product**: the detail screen's 409 no-owner
  state, and, without setup through the product's own routes, a participant delete the server refuses.
  Both are checked against the code path and the existing captures in `evidence/screenshots/`.
- **The bundle has no recorded budget and no CI check**, so the font package and the larger stylesheet
  are recorded rather than enforced. The font's four woff2 files total 79,268 bytes against the
  specification's 160 KB budget, measured from the package; the shipped total is measured from the
  build.
- **Assumes `@fontsource/ibm-plex-sans@5.3.0` stays available at that exact version.** If it does not,
  the version is a plan-level correction and the four faces and the budget are unchanged. The four
  `@font-face` blocks are hand-written against the package's published `./files/*.woff2` export, so a
  version bump needs a glance at the package's aggregate CSS for the `unicode-range` values.
- **The shipped client already derives four figures** that design-spec 5.5 and the forms require on
  screen: the assumed total and elapsed-month counts at `RecurringSection.tsx:111-112` and the
  major-to-minor conversions in three forms. They are preserved verbatim. The boundary this change
  holds is that no component starts deriving a share, a balance, an owed amount or an active count it
  does not derive today.

## Success criteria

- Every screen and state in the designer's acceptance checklist matches the specification at 1280 and
  390, in light and dark, with reduced motion on and off, and the designer says so.
- The organizer can do everything they can do today, with the same figures, through native controls
  and a keyboard, with no accounting rule, route, wire field name or stored value changed.
- Every action confirms itself, every error names a field in words the user recognises, and nothing on
  the screen was computed by the screen.
