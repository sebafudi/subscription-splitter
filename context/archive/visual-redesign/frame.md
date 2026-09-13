# Frame Brief: Visual redesign

> Framing step before the design specification and /10x-plan. This document captures what is
> *actually* at issue, separated from what was initially assumed. It contains no design decisions:
> the questions it raises are listed for the designer to answer, not answered here.

## Reported Observation

From `context/foundation/visual-redesign-brief.md` and roadmap S-06: the shipped product works and
has been certified end to end, but its interface is unstyled. It is to become "a cohesive, polished
responsive app with fully specified interactions and motion, preserving the verified product flow."

The literal observable: every screen renders browser-default typography and browser-default colours
over one 244-line stylesheet with no palette, no type scale, no spacing system, no motion and no
media queries. Nothing is broken. Nothing is designed.

## Initial Framing (preserved)

- **Stated cause or approach**: the app never had a design pass; the fix is to add one. Fable 5.1 is
  the sole designer and will write a complete specification, which explicitly selected Opus and
  Sonnet subagents then implement without reinterpreting it.
- **Proposed direction**: run the full change flow on this existing app - `10x-new`, `10x-research`,
  `10x-frame`, the `frontend-design` specification, `10x-plan`, independent plan review, phased
  implementation, implementation review, Fable visual acceptance, archive.
- **Pre-dispatch narrowing**: no user round was available for this change, so the narrowing was taken
  from the brief itself, which is unusually specific. It fixes the scope as *visual and interaction
  design across every shipped screen*, and fixes as out of scope any change to accounting,
  authentication, ownership or persistence. The one thing the brief leaves genuinely open is how much
  of the *information architecture* a visual redesign may move, and that is recorded below as the
  leading design question rather than resolved here.

## Dimension Map

If the current interface falls short, the shortfall could originate at any of these. Research read
the code and drove the running app at both widths to test each.

1. **Visual language** - there is no palette, no type scale, no spacing scale, no elevation, no
   motion. Everything is `currentColor`, `opacity` and two hard-coded reds.
2. **Information architecture** - the detail screen is one ~4200px column of six sections with no
   navigation; the densest section sits last.  ← the dimension the brief leaves open
3. **Feedback and state** - server-only validation after a round trip, raw wire field names shown to
   users in two of seven forms, no success feedback anywhere, two different error-placement
   conventions.
4. **Responsive behaviour** - no media queries at all; layout adapts only through three `flex-wrap`
   rules and one `auto-fit` grid.
5. **Accessibility beyond the basics** - labels, roles and focus outlines are present and correct;
   focus management, `aria-describedby`, `aria-invalid`, landmarks and reduced-motion are absent.
6. **Test and contract coupling** - whether markup can move at all without breaking something.

## Hypothesis Investigation

| Hypothesis | Evidence | Verdict |
| --- | --- | --- |
| 1. No visual language exists to redesign; one must be created from nothing | `src/client/index.css` is 244 lines, zero custom properties, zero media queries, two colour literals (`#b00020` twice); `color-scheme: light dark` at `index.css:2` delegates every other colour to the browser; `font-family: system-ui` at `index.css:3` | STRONG |
| 2. The information architecture, not only the styling, carries part of the problem | The detail screen renders six sections in one column, measured at 4168 CSS px at 390 wide; `RecurringSection`, the section a reviewer most wants, is last (`SubscriptionDetail.tsx:248`); there is no router, so navigation cannot currently split it (`App.tsx:12`) | STRONG |
| 3. Feedback is inconsistent enough to be a design problem, not only a styling one | `SubscriptionForm.tsx:82` and `MemberForm.tsx:108` render `` `${field}: ${message}` ``, surfacing `effective_from` and `start_month` to users; `PaymentForm.tsx:101` and `ScheduleForm.tsx:103` instead place messages under the matching field; no component renders any success state; every form sets `noValidate` so nothing is checked before the round trip | STRONG |
| 4. Responsive behaviour is missing | Contradicted as stated: intrinsic wrapping already works at 390 wide, verified in a browser and recorded in three explanatory comments (`index.css:122`, `:152`, `:216`). What is absent is *declared* responsive design: no breakpoint, no width-aware layout change, no touch-target sizing | WEAK |
| 5. Accessibility is broadly missing | Contradicted. Labels, `role="alert"`, `role="status"`, `:focus-visible` outlines, a real `fieldset`/`legend`, descending heading levels and `autoComplete` are all present. The gaps are specific: no focus management on inline edit or confirmation, no `aria-describedby`/`aria-invalid`, one `<main>` and no other landmark, no `prefers-reduced-motion` | WEAK |
| 6. Markup is pinned by tests | NONE. No `.test.tsx` exists; `vitest.unit.config.ts:7` includes only `src/**/*.test.ts` and `vitest.integration.config.ts:31` only `tests/integration/**/*.test.ts`. Neither reads DOM. A client-only redesign breaks zero tests | NONE |

## Narrowing Signals

- **The two "the current UI is deficient" hypotheses that failed are the useful ones.** Responsive
  behaviour and accessibility are not broken; they are undesigned but correct. That reframes both
  from "fix" to "do not regress", and makes them acceptance criteria rather than work items.
- **The absence of any markup test is decisive in the opposite direction.** It removes the largest
  expected constraint on a redesign and replaces it with a risk: the suite stays green through a
  redesign that renders nothing, so browser inspection is the only gate that can fail.
- **The one-URL architecture bounds hypothesis 2.** There is no router, so any information-architecture
  change that needs addressable screens is a functional change, not a visual one. This is the single
  place where the design's ambition can silently exceed the change's stated scope.

## Cross-System Convention

A visual redesign of a small React app normally replaces an existing design system. Here there is
none, so the usual risk - fighting inherited styles - is absent, and the usual safeguard - visual
regression snapshots - is absent too. The conventional handling of the second gap is either a
snapshot test or a documented manual browser pass; this repository's convention, set by every prior
slice in `evidence/screenshots/` and by decision D-010, is the manual pass with captured evidence,
which is also what the brief asks for.

## Reframed (or Confirmed) Problem Statement

> **The actual problem to plan around is**: the product has correct, accessible, intrinsically
> responsive markup with no visual language over it and no consistent feedback model inside it, and
> nothing in the test suite can tell whether a redesign of it renders correctly.

The initial framing was substantially correct and is confirmed: this is a design problem and Fable
5.1 owns it. Two adjustments to how it is planned, both drawn from evidence rather than opinion.
First, responsiveness and accessibility are *preservation* obligations, not deficits to repair;
treating them as work items would invent work and risk regressing what already holds. Second,
because no test reads the client, every claim that the redesign works has to come from a browser,
which makes the design specification's state coverage load-bearing: an unspecified state is a state
nobody will discover is missing until visual acceptance.

## What Must Stay Stable

Not the markup. Specifically:

- **Wire field names** the forms submit: `member_id`, `date`, `amount`, `note`, `kind`,
  `effective_from`, `start_month`, `end_month`, `joined_month`, `left_month`, `active_ranges`,
  `time_zone`, `owner_name`, `currency`, `locale`, `name`. The Zod schemas name them and 400
  responses carry them back in a `field` key.
- **Routes**: every `/api/...` path, untouched.
- **Domain calls**: `formatMoney` (`src/domain/money.ts:19`), `scheduleMonthStatuses`
  (`src/domain/recurring.ts`) and the `MemberMonthInputs` shape assembled at
  `SubscriptionDetail.tsx:152`. The client must keep deriving nothing itself.
- **The recorded-versus-assumed distinction** between the payments and standing-order sections, and
  the one-phrase-per-exclusion mapping in `RecurringSection.tsx:42-50`, which is typed total over the
  domain union. Wording may change; the distinction and the totality may not.
- **Accounting, authentication, ownership and persistence behaviour**, per `AGENTS.md` and
  `change.md`.

Element `id` values, class names, DOM structure, headings, copy and component boundaries are all free
to move. Nothing asserts them.

## Risks

- **A green suite proves nothing.** Typecheck plus tests will pass on a client that renders a blank
  page. Every phase needs a browser check, not a test run, as its gate.
- **Scope creep through navigation.** Splitting the detail screen requires a router, which is a
  functional change. If the design calls for it, it must be planned as such and not absorbed as
  styling.
- **Reintroducing derived figures.** A card, badge or chip that computes a share, a balance or a
  counted month in the component would violate the frozen accounting rules while looking like
  presentation.
- **Silent accessibility regression.** Replacing native `<button>`, `<select>` and `<fieldset>`
  elements with styled divs would lose keyboard behaviour that currently works and that no test
  covers.
- **Bundle growth.** 252 KB of JavaScript today, no recorded budget, exact-pinning required for any
  new dependency.
- **Live certification drift.** Decision D-010 governs how demo data exists on the deployed instance;
  refreshed certification screenshots must come from the identifiable deployed release, not from
  local captures or mockups.

## Design decisions for Fable

Every question below is a design decision. Research deliberately left them open.

1. **How far may the information architecture move?** The detail screen is one ~4200px column of six
   sections. Does the redesign keep one continuous page, introduce in-page navigation or a section
   index, collapse sections, or split them across addressable screens? The last option requires a
   router and therefore a functional change; the others do not.
2. **What is the visual language?** Palette in light and dark, type scale, spacing scale, border and
   radius treatment, elevation, iconography if any. The app currently delegates all colour to
   `color-scheme: light dark`; whether to keep that delegation or define both themes explicitly is
   itself a decision.
3. **How is money displayed?** Five summary cards currently carry equal visual weight
   (`SubscriptionDetail.tsx:166-189`), and per-participant balances are verbal (`owes X`, `ahead by
   X`, `settled up`). Which figure leads, whether owed and ahead are distinguished visually, and how
   negative or zero is treated are open.
4. **How are recorded and assumed money distinguished visually?** Today only two subtitle sentences
   and chip border treatment carry a distinction the accounting depends on.
5. **What do the month chips become?** Three observed states (counted, excluded by rule, marked not
   received), seven possible reasons, each currently a phrase beside a dashed or solid chip, with a
   toggle button on two of them.
6. **How is validation feedback presented?** Two conventions coexist: `field: message` prefixed
   inline, and a message placed under its own field. One must win, and the raw wire names currently
   shown to users (`effective_from`, `start_month`) need a display treatment or a mapping.
7. **What does success look like?** There is currently no success state anywhere. Whether a create,
   edit or delete confirms itself, and how, is unspecified.
8. **What is the destructive-confirmation pattern?** Inline panels today, non-blocking by deliberate
   choice, but participant deletion has no confirmation at all while price, payment and schedule
   deletion do. Whether to unify, and what the confirmed pattern looks like, is open.
9. **How do the seven forms look and behave?** They are currently label-above-input stacks with no
   grouping, no inline hints beyond a placeholder, and month fields typed as free text with a
   `YYYY-MM` hint. Field grouping, input affordances, and whether forms stay inline or become
   disclosures or panels are open.
10. **What is the empty-state treatment?** Six distinct empties exist (`No subscriptions yet.`, `No
    participants yet.`, `No price recorded yet, so every month currently costs nothing.`, `No months
    skipped.`, `No payments recorded yet.`, `No standing orders yet.`), plus two refusals (`Add a
    participant before recording a payment.` and its standing-order twin).
11. **What is the loading treatment?** The detail screen currently shows five placeholder cards with
    `-` plus a `role="status"` line, and a reload after an edit deliberately keeps the current
    figures on screen rather than collapsing back to loading (`SubscriptionDetail.tsx:53`). Whether
    to keep that behaviour and what it should look like are open.
12. **What is the mobile layout?** Intrinsic wrapping already works. Whether the redesign declares
    breakpoints, changes layout by width, sizes touch targets, or keeps the intrinsic approach is a
    decision, not a given.
13. **What motion exists, and what replaces it under `prefers-reduced-motion`?** There is none today,
    so both the motion and its reduced alternative are wholly new.
14. **What is the header, identity and sign-out treatment?** Today: a sentence reading `Signed in as
    <email>` beside a bare `Sign out` button on Home, and a `Back to subscriptions` button above the
    title on detail. There is no persistent chrome, no app identity beyond the login `h1`, and no
    current-location indicator.
15. **Does the product get an identity?** No logo, no wordmark treatment, no favicon beyond the
    default, and the login screen's `h1` is the only place the product names itself.
16. **What copy changes?** The voice is plain and carries real accounting distinctions. Which labels,
    headings, empty states and error phrasings are rewritten, and which are load-bearing and must
    keep their meaning, is a design call within the constraint that the recorded-versus-assumed
    distinction and the seven exclusion reasons stay distinct.

## Confidence

**HIGH** - every hypothesis was tested against code read in this repository and against the running
app driven in a browser at both target widths. Two hypotheses were disconfirmed on evidence and are
recorded as disconfirmed rather than quietly dropped. The one dimension left unresolved
(information architecture) is unresolved deliberately, because it is a design decision and this
document does not make those.

## What Changes for the Design Specification and /10x-plan

The specification covers a visual language built from nothing, a feedback model that unifies two
conventions and adds a success state that does not exist, and explicit treatment for every state
listed in the research inventory. The plan treats responsiveness and accessibility as regression
checks rather than features, gates every phase on a browser check rather than a test run, and, if the
design calls for addressable screens, plans the router as a functional change with its own phase.

## References

- Source files: `src/client/index.css:1-244`, `src/client/App.tsx:12`,
  `src/client/screens/SubscriptionDetail.tsx:98-259`, `src/client/components/RecurringSection.tsx:42-160`,
  `src/client/components/PriceHistory.tsx:46-66`, `src/client/components/MemberList.tsx:94`,
  `src/client/api.ts:46-77`, `vitest.unit.config.ts:7`, `vitest.integration.config.ts:31`
- Research: `context/archive/visual-redesign/research.md`
- Reference captures: `context/archive/visual-redesign/reference/`
- Prior evidence: `evidence/screenshots/`, catalogued in `evidence/index.md`
- Decisions: `context/decisions/D-006`, `D-007`, `D-008`, `D-009`, `D-010`
- Investigation: carried out in this session without sub-agents; the surface was small enough to read
  directly, and the running app was driven in a browser rather than inferred from code.
