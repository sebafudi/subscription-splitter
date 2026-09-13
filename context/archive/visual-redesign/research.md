---
git_commit: ad73f55
branch: main
repository: subscription-splitter
topic: "What the visual redesign inherits: every screen and state the shipped client renders, how its HTML and CSS are produced, what markup a change may move without breaking a test, and which constraints the Worker, the release flow and the shipped accounting place on a redesign"
tags: [research, ui, client, react, css, accessibility, responsive, release]
status: complete
---

# Research: visual-redesign

Date and researcher fields the schema lists are omitted; this repository records provenance by commit
and change ID, per `AGENTS.md`. Findings are separated into **Evidence** (read from this repository
or observed in a browser against a local dev server), **Inference** (a conclusion drawn from
evidence, stated as such) and **Unknown** (must be settled during design or implementation).

This research describes the interface as it exists. It names no colour, type scale, spacing value or
layout decision, and it recommends no visual direction. Those belong to the designer
(`context/foundation/visual-redesign-brief.md`); the design questions this research surfaced are
listed in `frame.md` under "Design decisions for Fable".

## Research Question

What does a complete visual redesign of this app have to work with and work around: which screens,
routes and states exist; how HTML and CSS are produced and served; what the current copy, forms,
validation feedback and accessibility affordances are; which tests and which release steps a markup
change touches; and what the Worker, the bundle and the shipped accounting rules constrain.

## Summary

The interface is four screens and nine components of hand-written React, styled by one 244-line
plain CSS file with no framework, no preprocessor, no design tokens and no JavaScript styling of any
kind. There is no router: `src/client/App.tsx:12` holds the selected subscription in a `useState`, so
the whole app is one URL and navigation is a state change. Every screen is a `<main className="screen">`
capped at `40rem`, with a `screen-narrow` variant at `24rem` for login. Responsiveness is already
handled, but only by intrinsic means: three `flex-wrap` rules and one `grid-template-columns:
repeat(auto-fit, minmax(11rem, 1fr))` at `src/client/index.css:123`. There is not one media query in
the repository, and `color-scheme: light dark` at `src/client/index.css:2` means every colour on
screen is the browser's own default, flipped by the operating system. The app has no palette to
replace, which makes this a redesign that adds a visual language rather than one that changes it.

The single most consequential finding for planning: **no test anywhere in this repository reads the
client's markup.** There is no `.test.tsx` file, no React Testing Library, no jsdom, no snapshot
test. `vitest.unit.config.ts:7` includes only `src/**/*.test.ts`, which resolves to the domain
calculation and the Zod schemas; `vitest.integration.config.ts:31` includes only
`tests/integration/**/*.test.ts`, which drive the Hono app over HTTP and assert JSON. A redesign may
rewrite every element, class and `id` in `src/client/` and the full suite still passes. The coupling
that does exist runs the other way: the client imports three domain modules directly
(`formatMoney` from `src/domain/money.ts:19`, `scheduleMonthStatuses` from `src/domain/recurring.ts`,
and `MemberMonthInputs`/`MonthExclusion` types from `src/domain/month-status.ts`), and those modules
are unit-tested. The redesign must keep calling them and must not reimplement what they decide.

What genuinely must stay stable is therefore not the markup but the contract underneath it: the
wire-level field names the forms submit (`member_id`, `start_month`, `effective_from`, `joined_month`,
`left_month`, `active_ranges`, `time_zone`, `owner_name`, and the rest), because the server's Zod
schemas name them and answer 400 with a `field` key that the client displays verbatim; and the
routes, which the redesign does not touch at all.

The release flow imposes one real constraint and one soft one. The real one: `npm run deploy` is
`npm run build && wrangler deploy`, a deliberate manual step never wired to merges, so a redesign
ships only when someone runs it. The soft one: the client bundle is currently 252 KB of JavaScript
and 3.0 KB of CSS in `dist/client/assets/`, essentially all of it React; there is no budget recorded
anywhere and no CI check on size, so a CSS-only redesign is invisible against that baseline, and a
component library would not be. There are no security headers of any kind, no Content Security
Policy, so no inline-style or inline-script restriction applies. There is no build step to add: Vite
already compiles the client, and `@cloudflare/vite-plugin` fills in `assets.directory` at build time.

## Detailed Findings

### Screens, routes and states

There are no routes in the client sense. One URL (`/`) serves the app shell; `wrangler.jsonc:12` sets
`not_found_handling: "single-page-application"` so any non-API path returns that shell. Screen choice
is made by three conditionals in `src/client/App.tsx:18-45`.

| Screen | Rendered by | Reached when | States present |
| --- | --- | --- | --- |
| Session loading | `src/client/App.tsx:18-24` | `getMe()` has not resolved | one: the word `Loading…` in a `screen-narrow` main |
| Login | `src/client/screens/Login.tsx` | no session | idle, submitting (`Signing in…`, button disabled), error (`role="alert"`, `.field-error`) |
| Home / subscription list | `src/client/screens/Home.tsx` | session, nothing selected | empty (`No subscriptions yet.`), populated list, load error (`Could not load subscriptions.`) |
| New subscription form | `src/client/screens/SubscriptionForm.tsx` (inside Home) | always, below the list | idle, submitting (`Creating…`), field error, generic error |
| Subscription detail | `src/client/screens/SubscriptionDetail.tsx` | a subscription is selected | loading (five placeholder cards with `-`, plus `role="status"`), ready, error with a `Try again` button, `no-owner` (409, no retry offered) |
| Participants | `src/client/components/MemberList.tsx` | inside detail | empty, populated, per-row `archived` and `not active this month` tags, a settled-archived disclosure toggle, action error |
| Participant form | `src/client/components/MemberForm.tsx` | inside detail | add mode, edit mode (heading becomes `Edit <name>`, a Cancel button appears), multi-range editor with add/remove, submitting, field error |
| Price history | `src/client/components/PriceHistory.tsx` | inside detail | empty, populated, inline destructive confirmation driven by a server 409 carrying the months that would lose their price, field error |
| Skipped months | `src/client/components/BreakMonths.tsx` | inside detail | empty, populated, field error |
| Payments received | `src/client/components/PaymentList.tsx` | inside detail | empty, populated, per-participant server-side filter, inline edit form, inline delete confirmation, error |
| Payment form | `src/client/components/PaymentForm.tsx` | inside detail, twice | create and edit variants sharing one component, a refusal state when there are no participants, per-field errors |
| Standing orders | `src/client/components/RecurringSection.tsx` | inside detail | empty, populated, a month chip grid with counted and not-counted variants, inline edit, inline delete confirmation, error |
| Standing order form | `src/client/components/ScheduleForm.tsx` | inside detail, twice | create and edit variants, no-participants refusal, per-field errors |
| Logout | `src/client/screens/Home.tsx:45` and the detail header | both signed-in screens | a plain `Sign out` button; no confirmation, no menu |

The detail screen is one continuous column of six sections with no tabs, no accordion and no
in-page navigation. Captured at 390 CSS pixels it is 4168 CSS pixels tall, close to five phone
screens of scrolling, and the "Standing orders" section a reviewer is most likely to want sits at the
very bottom. That length is a fact about the current information architecture, not a judgement about
it.

### How HTML and CSS are produced

- **Templating**: React 19.3.0 function components returning JSX. No server-side rendering, no
  template engine, no HTML files beyond the 13-line shell at `index.html:1`. `src/client/main.tsx:6`
  mounts `<App />` into `#root` inside `StrictMode`.
- **CSS**: exactly one file, `src/client/index.css`, 244 lines, imported once at
  `src/client/main.tsx:4`. Plain CSS with flat class names. No CSS modules, no Tailwind, no
  styled-components, no `<style>` blocks, no `style={{}}` props anywhere in `src/client/` (grepped:
  zero occurrences). No custom properties, no `@media`, no `@supports`, no `:has`, no container
  queries. The whole visual system is `currentColor` borders, `opacity` for de-emphasis, one hard
  colour `#b00020` used for errors and destructive confirmations (`index.css:71`, `index.css:172`),
  and `color-scheme: light dark` handing the rest to the browser.
- **Fonts**: `font-family: system-ui, sans-serif` at `index.css:3`. No web font, no font loading
  strategy, nothing to serve.
- **JavaScript in the page**: React only. No animation library, no charting, no icon set, no
  clipboard or dialog helper. The only motion in the product is whatever the browser does natively.
  `prefers-reduced-motion` is not referenced anywhere, because there is nothing yet to reduce.
- **Build**: `vite.config.ts` is five lines, `react()` plus `cloudflare()`. `npm run build` emits
  `dist/client/assets/index-*.js` (251,933 bytes) and `index-*.css` (3,012 bytes) plus the Worker
  bundle. The Vite plugin fills in `assets.directory` at build time, which is why `wrangler dev`
  needs a prior `npm run build` but `npm run dev` does not.
- **Serving on Workers**: `wrangler.jsonc:9-13` declares an `assets` binding. `src/server/index.ts:27`
  makes any unmatched `/api/*` path a JSON 404 and lets every other path fall through to that assets
  binding. No middleware sets a single response header: grepping for `Content-Security-Policy`,
  `secureHeaders`, `X-Frame` and `helmet` across `src/` returns nothing. Inference: a redesign may use
  inline styles, `<style>` blocks or data URIs without tripping a policy, because no policy exists.

### Copy and labels as they stand

The product's voice is plain, declarative and unusually careful about the difference between recorded
and assumed money, which is a shipped accounting distinction (FR-026, decision D-007), not a
stylistic choice. Two section subtitles carry it explicitly: `Money you saw arrive. Every amount here
is recorded, not assumed.` (`PaymentList.tsx:89`) and `Money assumed received each month, without
further entry. Nothing here is a recorded receipt.` (`RecurringSection.tsx:83`). The seven exclusion
phrases in `RecurringSection.tsx:42-50` (`the plan was paused that month`, `the participant was not
on the plan that month`, `marked as not received`, and four more) are a `Record<MonthExclusion,
string>` typed over the domain union, so the compiler enforces one phrase per condition; a redesign
may rewrite the wording but must keep the mapping total and must not collapse two conditions into one
phrase.

Headings run `h1` (login only), `h2` (screen titles and `New subscription`), `h3` (detail sections)
and `h4` (the participant form). Field labels are sentence case with the expected format in
parentheses: `Start month (YYYY-MM)`, `Date received (YYYY-MM-DD)`, `Last month (optional, leave
empty while it is still running)`. Placeholders repeat the format as an example (`2026-01`,
`100.00`, `2026-01-15`). Balance wording is verbal rather than signed: `owes X`, `ahead by X`,
`settled up` (`MemberList.tsx:70-74`).

### Forms, validation and feedback

Every form is uncontrolled-free React with `noValidate` set, so browser-native validation never
fires and the server is the only validator. The pattern is identical in all seven forms:

1. `onSubmit` calls `preventDefault`, clears the error, sets a submitting flag.
2. The API helper at `src/client/api.ts:46` throws `SignedOutError` on 401 or `ApiError` carrying
   `status`, `message`, an optional `field` and, for the price-delete refusal only, `months`.
3. `SignedOutError` calls `onSignedOut()` and the app drops to login. Everything else becomes a
   `<p role="alert" className="field-error">`.
4. Field errors render as `` `${field}: ${message}` `` in the subscription and participant forms
   (`SubscriptionForm.tsx:82`, `MemberForm.tsx:108`), which is why a user sees raw wire names such
   as `effective_from: month must be in YYYY-MM format with a valid month`. The payment and schedule
   forms instead place the message under its own field by comparing `error.field` to a literal
   (`PaymentForm.tsx:101`, `ScheduleForm.tsx:103`). Two feedback conventions coexist.
5. There is no success feedback of any kind. A create clears its fields and the list re-renders;
   nothing is announced, nothing is highlighted, nothing scrolls.

Only two validations happen in the browser, both the same guard: a non-finite parse of the amount
field in `PriceHistory.tsx:29` and `PaymentForm.tsx:57`. Money conversion from major to minor units
happens in `toMinor` inside the three components that take an amount, and each carries the comment
that the conversion happens there and nowhere else.

Destructive actions are confirmed inline, never with `window.confirm` and never in a modal. Price
deletion is the strongest case: the first attempt is sent to the server without confirmation, the
server refuses with 409 and the affected months, and that refusal is rendered as an inline panel
offering `Delete anyway` and `Keep it` (`PriceHistory.tsx:46-66`). Payment and schedule deletion use
a purely client-side pending flag with the same two-button shape. Participant deletion has **no**
confirmation at all (`MemberList.tsx:94`), and relies on the server's 409 for a participant who has
payments or schedules. That asymmetry is a fact, not a recommendation.

### Accessibility as it exists

Present and working: every input has a `<label htmlFor>` pointing at a real `id`; the participant
range editor is a `<fieldset>` with a `<legend>` (`MemberForm.tsx:69`); every error is
`role="alert"` and therefore announced; the detail loading state is `role="status"`
(`SubscriptionDetail.tsx:112`); `:focus-visible` gets a 2px `currentColor` outline with 2px offset
on both inputs and buttons (`index.css:37`); the login fields carry `autoComplete="username"` and
`current-password`; heading levels descend without skipping; the subscription list is a real `<ul>`
of `<button>` elements rather than clickable divs, so keyboard traversal works; disabled buttons get
`opacity` and `cursor: not-allowed` rather than being removed.

Absent: no skip link, no landmark beyond the single `<main>` (no `<nav>`, and the two `<header>`
elements are inside `main`), no `aria-live` on anything except the alert and status roles, no
`aria-describedby` tying a field error to its input, no `aria-invalid`, no focus management when an
inline edit form opens or a confirmation appears, no `prefers-reduced-motion` handling, no visible
current-page or current-section indicator. The month chips encode counted versus not-counted with
border weight and a dashed border plus reduced opacity (`index.css:224-232`), with the reason spelled
out in words beside the chip; the comment above that rule records the deliberate choice not to let
colour or amount carry the meaning alone.

### Existing screenshots

Twenty-four screenshots from earlier slices live in `evidence/screenshots/`, catalogued in
`evidence/index.md`. They are evidence of shipped behaviour, not design references, and several show
states this research could not reproduce on demand. File paths, not embedded:

- `evidence/screenshots/release-01-login.png` through `release-10-narrow-phone.png` (the release
  certification set, ten files)
- `evidence/screenshots/detail-worked-example.png`, `detail-error-state.png`,
  `detail-no-owner-state.png`, `detail-price-delete-confirm.png`, `detail-narrow-phone.png`
- `evidence/screenshots/payments-balance-after-payment.png`,
  `payments-before-start-month-refused.png`, `payments-delete-confirm.png`,
  `payments-member-delete-refused.png`, `payments-narrow-phone.png`,
  `payments-reviewer-sees-nothing.png`
- `evidence/screenshots/recurring-assumed-received-months.png`,
  `recurring-break-and-departure-not-counted.png`, `recurring-narrow-phone.png`

Two of them, `detail-error-state.png` and `detail-no-owner-state.png`, are the only captures of the
detail screen's error and 409 states; this research did not reproduce those, so the designer should
read them from `evidence/` rather than from the fresh reference set.

### Fresh reference captures for the designer

Eleven captures of the current interface, taken against `npm run dev` on a local D1 holding synthetic
data only, at 1280 CSS pixels and at 390 CSS pixels with a 2x device pixel ratio. All paths are relative to
`context/archive/visual-redesign/reference/`:

| File | What it shows |
| --- | --- |
| `current-login-desktop.png` | login, idle, 1280 |
| `current-login-mobile.png` | login, idle, 390 |
| `current-login-error-desktop.png` | login after a refused sign-in, the `role="alert"` message visible |
| `current-home-empty-desktop.png` | an account owning nothing: `No subscriptions yet.` above the create form |
| `current-home-empty-mobile.png` | the same at 390 |
| `current-home-populated-desktop.png` | two subscriptions as full-width link rows, create form below |
| `current-home-populated-mobile.png` | the same at 390 |
| `current-detail-desktop.png` | the whole detail screen, all six sections, every state populated |
| `current-detail-mobile.png` | the same at 390, the full 4168 CSS pixels of it |
| `current-detail-destructive-confirm-desktop.png` | the price-delete 409 confirmation and a payment-delete confirmation open together |
| `current-detail-validation-and-edit-desktop.png` | a server field error rendered as `effective_from: ...` beside an open participant edit form |

The local database already held two synthetic subscriptions from earlier slices. To make the standing
-order section show all three chip states in one capture, this research added, **through the
product's own routes on the local database only**, one standing order, one month marked not received,
one payment and one later price entry. Nothing remote was touched and nothing was written by SQL.

### Tests, and what a markup change costs

| Suite | Config | Includes | Reads client markup |
| --- | --- | --- | --- |
| unit | `vitest.unit.config.ts:7` | `src/**/*.test.ts` | no |
| integration | `vitest.integration.config.ts:31` | `tests/integration/**/*.test.ts` | no |
| reviewer package | `tools/reviewer/` | its own suite, run from that directory | no |

There is no `.test.tsx` file in the repository and no DOM testing dependency in `package.json`. The
practical consequence, stated plainly: **a redesign that changes only `src/client/**` and
`src/client/index.css` breaks zero tests.** That is a risk as much as a convenience, because the
suite will stay green through a redesign that renders nothing at all, which is why the brief asks for
browser inspection and visual acceptance rather than a test gate.

Three real coupling points survive:

- `src/domain/money.ts:19` `formatMoney` is called by five client files; `src/domain/money.test.ts`
  covers it. Display formatting must keep going through it.
- `src/domain/recurring.ts` `scheduleMonthStatuses` is called once, at `RecurringSection.tsx:104`,
  and decides every chip. `src/domain/recurring.test.ts` and `month-status.test.ts` cover it. The
  screen applies none of the six exclusion conditions itself and must not start.
- The wire field names the forms submit are named in `src/server/validation/*.ts` and asserted in
  `src/server/validation/*.test.ts` and across `tests/integration/`. Renaming a form input's `name`
  or the key it sends breaks the request; renaming its `id`, class or label does not.

`npm run typecheck` covers the client through `tsconfig.app.json`, so a redesign that breaks a prop
type is caught. Nothing else is.

### Release flow

Deployment is manual and deliberate. `npm run deploy` runs `npm run build && wrangler deploy`; CI runs
typecheck and tests and does not deploy (`AGENTS.md`, "Commits and pull requests"). The live instance
is `https://subscription-splitter.sebastianfudalej.workers.dev` against remote D1
`subscription-splitter-db`, which shares no data with the local database. The redesign adds no
migration and no secret, so the release step is exactly `npm run deploy` followed by a live check.

Demo data on the live instance was created through the product's own screens under decision D-010,
which also records that the reviewer account is deliberately empty and that a reviewer who needs to
see data is given the owner account's credentials through a private channel. Refreshing the
certification screenshots after this redesign therefore means repeating a browser walkthrough against
the live deployment with the owner account, not re-running a seed.

### Constraints the redesign inherits

- **Accounting, auth, ownership and persistence are frozen.** The brief and `change.md` state it, and
  `AGENTS.md` gives the specific invariants: integer minor units end to end, `round(price /
  activeCount)` with the owner absorbing the residual, ownership enforced server-side on every read
  and mutation, the current month derived from the subscription's time zone via `Intl`. A redesign
  changes none of them and must not recompute any of them in the client.
- **No calendar metadata in authored files.** `AGENTS.md` forbids dates, timestamps, deadlines and
  duration estimates in authored files; change IDs, migration IDs and commit SHAs are the currency.
  This applies to the design specification too.
- **Exact dependency pinning.** Every dependency in `package.json` is an exact version. Any library
  the design needs must be pinned the same way, and it lands in a 252 KB baseline bundle.
- **Synthetic fixtures only**, in screenshots as in tests.
- **No CSP, no security headers, no build step to add.** Nothing blocks a styling approach
  technically. The constraint is that the app currently has no styling infrastructure at all, so
  whatever is introduced is introduced from nothing.

## Code References

- `src/client/App.tsx:12` - the whole navigation model: one `useState` holding the selected subscription
- `src/client/index.css:1-244` - the entire visual system, including the only two hard-coded colours
- `src/client/index.css:123` - the one grid rule, `auto-fit` at `minmax(11rem, 1fr)`
- `src/client/index.css:224-232` - counted versus not-counted month chips, with the rationale comment
- `src/client/api.ts:46-77` - the single request helper, and the only place an API error becomes a shape the UI reads
- `src/client/screens/SubscriptionDetail.tsx:98-140` - the loading, error and no-owner states
- `src/client/screens/SubscriptionDetail.tsx:166-195` - the five summary cards and the sentence beneath them
- `src/client/components/PriceHistory.tsx:46-66` - the server-409-driven inline confirmation
- `src/client/components/MemberList.tsx:94` - participant delete, with no client confirmation
- `src/client/components/RecurringSection.tsx:42-50` - the seven exclusion phrases, typed total over the domain union
- `src/client/components/RecurringSection.tsx:104` - the single domain call that decides every month chip
- `src/server/index.ts:27` - API 404 versus asset fallthrough
- `wrangler.jsonc:9-13` - the assets binding and the single-page-application fallback
- `vitest.unit.config.ts:7`, `vitest.integration.config.ts:31` - the two include globs that exclude all client markup

## Architecture Insights

- **The client is a thin, honest view over the domain.** It imports the calculation rather than
  duplicating it, and the two places where it could have cheated (month chip status, money
  formatting) both call domain functions with comments saying why. A redesign that keeps this
  property is a pure presentation change; one that starts deriving figures in a component is not.
- **Server errors are the UI's validation layer.** `noValidate` on every form is deliberate, and the
  Zod schemas are described in `AGENTS.md` as "the one validation contract, shared by routes and
  client forms, applied at the entry point". The redesign inherits the consequence: feedback arrives
  after a round trip, never before, and the raw field name is sometimes shown to the user.
- **Destructive confirmation is inline and non-blocking by design.** The comment at
  `PriceHistory.tsx:46` records that the refusal becomes an inline confirmation "rather than a
  browser dialogue, and nothing else on the screen stops working while it is open."
- **Responsiveness is intrinsic, not declared.** Three comments in `index.css` explain the wrapping
  choices in terms of what happens on a phone. There is no breakpoint to inherit and none to honour.

## Historical Context (from prior changes)

- `context/decisions/D-006-owner-member-and-zero-active-invariant.md` - why the owner is not a row in
  the participants list and appears instead as a share of the month
- `context/decisions/D-007-recurring-and-payment-semantics.md` and
  `D-008-one-source-for-a-counted-month.md` - the recorded-versus-assumed split the two section
  subtitles carry, and why one function decides a counted month
- `context/decisions/D-009-one-rule-for-a-member-month.md` - the single rule behind the chip states
- `context/decisions/D-010-live-demo-data-and-reviewer-access.md` - how live demo data exists at all,
  and why the reviewer account is empty; governs how certification screenshots are refreshed
- `context/archive/verification-and-release/research.md` - the format this document follows, and the
  account of how the deployed instance reached its current state

## Related Research

- `context/archive/payments-and-recurring/` - the slice that produced the standing-order section and
  its month chips
- `context/archive/members-and-price-history/` - the slice that produced the participants, prices and
  skipped-months sections

## Open Questions

Engineering questions only; the design questions are in `frame.md`.

- **Unknown**: whether the live deployment currently serves the same client build as `main`. The
  release slice closed against a deploy, but `main` has moved since. A `curl` of the live asset
  hashes against a local `npm run build` would settle it before the redesign is deployed.
- **Unknown**: whether any styling approach heavier than plain CSS is acceptable against the 252 KB
  baseline, since no bundle budget is recorded anywhere. This is a plan-level question, not a design
  one, but the answer constrains the design.
- **Inference, unverified**: the detail screen's `no-owner` 409 state is reachable only for a
  subscription created before the owner became part of every create (`SubscriptionDetail.tsx:45`).
  It cannot be produced locally through the product, so its redesign must be driven from
  `evidence/screenshots/detail-no-owner-state.png` and the code, not from a fresh capture.
