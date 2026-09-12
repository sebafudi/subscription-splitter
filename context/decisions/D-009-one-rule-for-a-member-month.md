# D-009: One rule for whether a month counts for a member

- **Decision:** The conditions that decide whether a month counts for a member live in one module,
  `src/domain/month-status.ts`, and everything that needs the answer reads it from there.
  `memberMonthStatus(state, member, month, current)` returns `{ counts, reason }`, applying, in order
  from the widest condition to the narrowest: the month is at or after the subscription's first month,
  it has elapsed at `current`, the member is not the owner, one of the member's ranges covers it, and
  it is not a break month. The reason is a named value, one per condition, so a caller can branch on it
  or render it rather than re-deriving why. `chargedMonthStatus` adds the one further condition that
  belongs to liability alone, an effective-dated price, and reports it as `unpriced`. `shareForMember`
  is defined as `chargedMonthStatus` plus the rounded share, and `recurringReceived` applies the
  schedule's own three conditions and defers the rest to `memberMonthStatus`, so neither repeats a
  condition inline. The price is deliberately absent from `memberMonthStatus`: a month with no entry
  effective yet charges nobody, but D-007 lists six conditions for a standing order and a price is not
  among them, so the two questions are kept apart by name rather than by a flag.
- **Rationale:** The same month-by-month conditions decide two different numbers, what a participant
  owes and what a standing order is assumed to have covered, and they were already written twice, once
  in `shareForMember` and once inline in `recurringReceived`'s loop. A rule copied into a second place
  is a rule that can disagree with itself, and a disagreement here is money: a break month or a
  departure dropped from one expression and kept in the other produces a balance that is confidently
  wrong with nothing failing. Naming each condition also gives S-03 what it needs to say why a month
  did not count, which is what D-008's toggle grid renders; that helper can be built over this one
  rather than re-deriving `break` and `inactive` for itself, which keeps both decisions' "one place"
  claim true at the same time. Making `current` an explicit argument on both functions follows the rule
  D-007 already sets for the received side: the not-yet-elapsed boundary is a failure mode in its own
  right and must not ride on whatever month list a caller happens to pass.
- **Rejected alternative:** One function with a boolean parameter deciding whether the price counts was
  rejected: the two questions differ in meaning, not in configuration, and a caller passing the wrong
  flag would be a silent money error rather than a type error. Returning only a boolean was rejected
  because the reason is what S-03's screen has to show, and a caller that has to recover the reason
  re-derives the conditions, which is the duplication this decision removes. Adding the helper without
  a caller in the shipped path was rejected on the members plan review's own finding F4, which is why
  `shareForMember` was re-expressed over it and given the `current` argument that makes that possible,
  rather than the helper being left beside the code it describes. Putting the price condition into
  `memberMonthStatus` and letting the received rule inherit it was rejected because it contradicts
  D-007: an unpriced month still counts toward a standing order.
- **Review objection + Resolution:** The objection this record answers is the one the members plan
  review raised as F4 and the payments plan review raised again as its critical finding: a rule written
  in a second place, whether in a helper nothing calls or in a screen that re-derives it, proves one
  expression while the product computes another. Resolution: the helper has three call sites in the
  shipped path from the moment it lands, `shareForMember`, `recurringReceived` and, through the first
  of those, every total `computeSummary` returns, and the phase-1 suite was re-run unchanged against it
  so the refactor is asserted to preserve behaviour rather than assumed to. A second objection, that
  `src/domain/` now holds two month-classification helpers once S-03 lands `scheduleMonthStatuses` per
  D-008, is answered by composition rather than by a merge: that helper is schedule-shaped and takes
  loose values because the browser has no `SubscriptionState`, and it can apply this one for the
  member-month half instead of repeating `break` and `inactive`. If it does not, the two will be
  reconciled in that slice rather than left to disagree.
- **Affected tests:** Unit tests in `src/domain/month-status.test.ts`: one case per condition for
  `memberMonthStatus`, covering a counted month, a month before the first month, a month after the
  current one, the current month itself as the boundary that counts, the owner, a month outside every
  range, both ends of a range as inclusive, a break month, and an unpriced month counting; plus a case
  pinning that the outermost failing condition is the one reported when several fail. For
  `chargedMonthStatus`: a charged month, an unpriced month, the month an entry becomes effective
  against the one before it, a break month reported as a break rather than as unpriced, and every
  inherited exclusion passing through. The phase-1 calculation suite is unchanged apart from the added
  `current` argument, so it doubles as the regression test for the refactor.
- **Commit:** recorded with phase 3 of the members-and-price-history slice.
