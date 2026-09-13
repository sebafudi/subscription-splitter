# Checkpoint: m01-plan

- **Task id:** m01-plan (S-08 frame and plan)
- **Model:** Opus
- **Change:** `subscription-management-and-date-inputs`, roadmap S-08, parent goal M01
- **Status:** complete

## Actions

1. Committed the designer's `design-delta.md`, which was untracked on arrival.
2. Read `AGENTS.md`, the change folder in full, the `10x-frame` and `10x-plan` skills with the
   `progress-format` reference, and the `google-sign-in` and `visual-redesign` precedents.
3. Ran two read-only investigations to test the frame's load-bearing hypotheses against the tree:
   one on batch atomicity, ownership scoping, cascade interaction and the owner opening range; one on
   the client navigation, field wrapper, form validation attributes, control CSS and confirmation
   component. Verified the two decisive results directly afterwards.
4. Wrote `frame.md`: dimension map, six hypotheses with verdicts, narrowing signals, a confirmed
   problem statement sharpened at two seams, an explicit agreement section, and two designer questions.
5. Wrote `plan.md` with six phases and a canonical `## Progress` section, and `plan-brief.md`.
6. Moved `change.md` status to `planned` and the roadmap S-08 item to `planning`.

## Changed paths

- `context/changes/subscription-management-and-date-inputs/design-delta.md` (committed, not authored here)
- `context/changes/subscription-management-and-date-inputs/frame.md` (new)
- `context/changes/subscription-management-and-date-inputs/plan.md` (new)
- `context/changes/subscription-management-and-date-inputs/plan-brief.md` (new)
- `context/changes/subscription-management-and-date-inputs/change.md` (status)
- `context/foundation/roadmap.md` (S-08 status only)
- `context/checkpoints/m01-plan.md` (this file)

## Commits

- `41dba96` docs(s-08): add design delta for subscription management
- the frame, plan, brief, change status, roadmap status and this checkpoint in one further commit

## Verification

No code was written and no gate was run, which is correct for a framing and planning task. Every
factual claim in `frame.md` and in the plan's Key findings carries a file reference read in this tree
during this task. Four claims were checked directly rather than taken from research:

- All seven forms in `src/client/` carry `noValidate`, so `min` can never raise a browser bubble. This
  closes the item the delta left open in its amended 3.4.
- `SectionHeader` already sets `tabIndex={-1}` on every heading including Home's `h1`
  (`src/client/components/ui/SectionHeader.tsx:49`), so the delta's requirement is already met.
- `Home` refetches on mount through `useEffect(() => load(), [load])` and already holds a heading-row
  status line through `useSectionStatus()`, so the deletion return needs only a one-shot signal from
  `App`.
- `ConfirmStrip` renders exactly one sentence and four props, so the delta's amended 3.10 second
  sentence is one optional prop with no existing call site touched.

## Unresolved designer questions

1. **The owner's opening range may not be where the shift rule expects, and shifting it can break the
   range set.** `PATCH /members/:memberId` accepts `active_ranges` for the owner too
   (`src/server/routes/members.ts:79-104`, applied at `src/server/db/members.ts:201-208`); only
   `is_owner` is unpatchable, and `validateActiveRanges` rejects only `joined_month < startMonth`
   (`src/domain/members.ts:38-40`). So the owner may already hold several ranges and the first may
   carry a `left_month`. Moving the first month later and shifting the owner's first range with it can
   push that range past the owner's *second* range, producing an out-of-order or overlapping set that
   `validateActiveRanges` rejects on the participant route but that no database constraint catches
   inside `db.batch()`. **Recommended and planned on:** revalidate the prospective owner range set
   before the batch and refuse with a sixth kind, ordered last,
   `start_month cannot be later than YYYY-MM because your own next active range starts then`. The
   delta's existing `left_month` refusal stays exactly as written.
2. **The month select's option range on an unbounded field is 144 options.** First month takes no
   `min` and no `max` on both the create and the edit form, so the fallback select spans January ten
   years back through December of next year. **Recommended and planned on:** keep it as the delta
   specifies. It is a native select with the browser's own type-ahead, and narrowing it would hide the
   "move the first month earlier" case the delta deliberately allows.

Both are answered in the plan by the recommendation above and are marked `[frame Q1]` and `[frame Q2]`
where they land. A different designer ruling changes a sentence and its test and moves no phase
boundary.

## One risk the plan carries rather than resolves

The detection probes test the month value sanitisation algorithm, not picker rendering. The two are
correlated by browser rather than by specification, and the browser that decides it is Safari, which is
installed on the verification machine. Row 5.4 is the gate. If Safari passes both probes and still
renders no picker, the fix is a third condition in the injectable detection function plus one unit
case, and the plan names that as the only source edit phase 5 may produce.

## Next action

Independent plan review of `context/changes/subscription-management-and-date-inputs/plan.md` against
`design-delta.md`, `research.md` and `frame.md`, with the two designer questions above put to the
designer in the same pass.
