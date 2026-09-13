# Checkpoint: m05-phase5-browser

- **Task:** phase 5 of change `subscription-management-and-date-inputs` (roadmap S-08): real-browser
  verification, measurements and the designer's acceptance captures
- **Model:** Opus
- **Status:** complete except three rows that a browser on this machine cannot settle, each left open
  with its reason and what would close it

## Actions

1. Read `AGENTS.md`, `plan.md` phase 5 with the manual rows of phases 2, 3 and 4 it closes,
   `design-delta.md` in full, and the browser precedent in `evidence/runs/google-sign-in-manual-rows.md`
   and `evidence/runs/release-4.md`.
2. Started `npm run dev` against the local D1, seeded the two local accounts, signed in as the owner
   through the real password form.
3. Created a disposable subscription through the product's own screens and routes, with one
   participant, two prices, two skipped months, two payments and one standing order, all synthetic.
4. Chrome `152.0.7977.84` on a throwaway profile over the DevTools protocol, at 1280 and 390, light and
   dark, and again relaunched with `--force-prefers-reduced-motion`. Every reading is a property read
   from the live page, never inferred from a capture.
5. Safari `26.6.2` driven by keystroke only. `safaridriver` refuses to start without an
   administrator-authenticated `--enable`, and neither Apple-Events JavaScript nor Remote Automation is
   switched on, so nothing was enabled and the gaps are recorded instead.
6. Deleted the disposable subscription for real, confirmed the id answers 404 on its root and all six
   child routes, and confirmed the two pre-existing subscriptions survive untouched.
7. Ran `npm run typecheck`, `npm test` and `npm run build` on the captured tree.

## What the run settled

- **The fallback gate passes.** Safari renders the native select of named months, not a bare
  month-typed box, for both a required and an optional month field, with "Choose a month" and "Still
  active" as their leading options and labels in the subscription locale. The detection function needs
  no third condition, so this phase produced no source edit at all.
- **Seven `month` and one `date`** on the detail screen, every `min` matching the delta's Bounds
  paragraph, no `max`, no `step`, and `inputMode`, `pattern` and `placeholder` absent everywhere.
- **Heights are 40px at 1280 and 44px at 390** on every calendar and text control measured. The
  `min-height` exception the delta allows is not needed and no CSS change is called for.
- **The keyboard contract of section 7 holds in both browsers.** Enter inside a closed control submits
  the panel's form; Escape with the picker open is consumed by the browser; Escape with it closed acts
  as Cancel. Neither browser differs.
- **Reduced motion:** `transition-duration` falls from `0.18s` to `0s` and `getAnimations()` from one
  running animation to none, with the panel already at final height 60ms after opening.
- **No JavaScript error** in any flow. The only console entries are network status lines from refusals
  this run caused deliberately.

## Files

- `evidence/runs/s08-browser-verification.md`, the run record: environment, a table per check with its
  evidence path, measured heights, the keyboard matrix, the unverified list and the console result.
- `evidence/runs/s08-gates.txt`, the three gate commands and their output.
- 33 captures under `evidence/screenshots/`, prefixed `s08-`, each well under 1 MB.

The plan names the run file `s08-manual-rows.md`; it is written as `s08-browser-verification.md`, the
name the phase brief gave. The gate file keeps the planned name.

## Left open

- **2.8**, the phase 2 row that the rendered app was unchanged, because no call site referenced the new
  controls yet. Only checkable on `e47b427`, which also carried 3 lines of `Field.tsx` and 16 of
  `index.css`; on the current tree every call site uses the controls, so a browser now cannot answer it.
- **4.17, second half.** The `error` state is verified: with the detail load stubbed to 500 both header
  buttons read `aria-disabled="true"`. The `no-owner` state is not, because a subscription whose owner
  participant is absent cannot be produced through the product's own routes, which refuse to delete an
  owner. A D1 fixture or an integration test would settle it, not a browser.
- **5.4's Safari half is met, but Safari's computed measurements are not.** Heights there are pixel
  measurements off a 1:1 screen capture. Safari at 390, Safari in light appearance, and a full Safari
  Tab traversal are unverified for the same reason.

## For the lead

- Phase 6 landed before phase 5 (`890a50a`, `5f4433a`, `31398ab`). `AGENTS.md` on disk already reads
  "No roadmap item is open" and has lost the S-08 paragraph and the calendar-control convention. That
  was left untouched here, but it means the repository describes S-08 as finished while phase 5's rows
  were still open.
- `COOKIE_SECURE=true` in the ignored `.dev.vars` blocks Safari sign-in silently: the form returns to
  the login screen with no error rather than reporting anything. The README already prescribes
  `false` for this case; the value was flipped for the Safari pass and restored byte-identical.
