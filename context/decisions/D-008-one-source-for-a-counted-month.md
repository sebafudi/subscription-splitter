# D-008: One source for whether a month of a standing order counted

- **Decision:** The six conditions that decide whether a month of a standing order counted resolve
  through exactly one place, and everything that needs the answer reads it from there.
  `scheduleMonthStatuses(inputs, member, schedule, exceptionMonths, current)` in
  `src/domain/recurring.ts` returns one row per elapsed month of an arrangement, each carrying the
  month, whether it counts, and the `MonthExclusion` that failed. It is built over D-009's
  `memberMonthStatus` rather than beside it: the row set applies the arrangement's own three
  conditions, its start month, its end month and the current month, each row is then
  `memberMonthStatus`, and the one condition that module does not own, the exception, is applied last.
  `MonthExclusion` gains `'excepted'`, which is additive and which no caller of `memberMonthStatus` can
  produce. Three of the union's values cannot reach this helper at all, `not-yet-elapsed` because the
  row set stops at the current month, `before-start-month` because a schedule's start month is refused
  below the subscription's first month, and `owner-member` because a schedule naming the owner is
  refused at both write paths, so the reasons a row can carry are exactly the three the screen renders.
  `recurringReceived` keeps its signature and its meaning and is re-expressed over the helper, which
  removes the last conditions still written inline in its loop. The standing-order section on the
  subscription screen draws its toggle grid and its per-month labels from the same call, supplied with
  the members' active ranges and with the subscription's settings and break months, which the summary
  response does not carry, and with the current month taken from that response rather than from the
  browser. A toggle appears only on a month that counts or that is excluded as an exception, because
  that is the one condition the organizer owns. `MemberSummary` keeps its single `paid` field; no
  recorded-versus-assumed split is added to the summary route's shape.
- **Rationale:** FR-026 says assumed money must never read as confirmed money, and the screen is where
  that can be lost. The plan first specified a `scheduleMonths` list carrying no status: the client
  would have applied the start month, the end month and the current month, and could have applied the
  exceptions, since the API view attaches them to the schedule, but nothing would have given it break
  months or the member's active ranges. A standing order running across a break month, or across a
  month after the participant left, would then have been drawn as a counted month labelled assumed
  received, visually identical to a month that counted, while the server's `paid` excluded it. The
  organizer would read five assumed months against a balance reflecting three, with no way to tell
  which two were dropped or why, and no test would have seen it: the phase-4 criterion about telling a
  recorded receipt from an assumed one passes in that state, because the two sections are visually
  distinct and it is the per-month labels inside the assumed section that are wrong. A rule copied into
  a second place is a rule that can disagree with itself; a rule read from one place cannot. The six
  conditions were already written once, and D-009 had already moved three of them into
  `memberMonthStatus`, so the helper completes that move rather than starting a parallel one; the
  equality of the two answers is asserted as a set of months rather than as a total, so a condition
  quietly dropped or added fails the test instead of netting out.
- **Rejected alternative:** Adding `paidRecorded` and `paidAssumed` to `MemberSummary`, filled in
  `balanceForMember` and `computeSummary`, was rejected. It is the server's own answer and it would
  have been asserted through the summary route, but it changes the summary shape, which this slice's
  scope excludes, and it fixes the wrong thing: it splits the total while leaving the per-month labels
  in the toggle grid exactly as wrong as before, so the organizer still could not tell which month was
  dropped or why. Leaving `scheduleMonths` as specified and adding a manual browser criterion for the
  labels was rejected because it makes correctness depend on someone looking at the right month, and
  the failure is invisible unless a break month or a departure happens to overlap an arrangement in
  whatever state the checker has in front of them. Typing the helper over the whole
  `SubscriptionState`, which is the shape `memberMonthStatus` was first written with, was rejected
  because the browser has no `SubscriptionState` and would have had to synthesise one with fabricated
  empty price history and payments; the fabrication would keep compiling on the day someone adds a
  condition that reads one of them. Instead `memberMonthStatus`'s first parameter is narrowed to
  `Pick<SubscriptionState, 'settings' | 'breakMonths'>`, which is all it reads and which
  `SubscriptionState` satisfies structurally, so every caller in the calculation compiles unchanged and
  the browser passes exactly what it has. Inventing a second reason vocabulary for the helper, with
  values like `break` and `inactive` beside D-009's `break-month` and `outside-active-range`, was
  rejected for the same reason the helper exists: two names for one condition is the duplication in
  another form.
- **Review objection + Resolution:** Independent plan review raised this as the slice's one critical
  finding: the plan opened with "the slice adds no new kind of problem", and that assumption is what
  let phase 4 ship with three automated criteria that are a typecheck, a build and the existing suite,
  for the section the plan itself calls the one way this product can mislead its user. The objection is
  accepted in full. The plan no longer claims the slice adds no new kind of problem; it names what is
  new, which is that the screen shows a number the domain derives rather than one the server hands it.
  The reviewer's recommended fix is taken with two changes. The helper takes values rather than a
  `SubscriptionState`, for the reason above. And `recurringReceived` consumes it too, rather than only
  the screen, so there is one implementation of the six conditions rather than two that happen to
  agree. Between the review and this record, D-009 landed `memberMonthStatus` and moved three of the
  six there, which makes the fix smaller than the review specified: this slice adds one condition and
  one reason on top of a module that already exists. A second objection, that the screen must then have break months and the member's ranges in
  hand, is answered by phase 4's first act: S-02's detail screen already has a members section and a
  break-months section, so both reads exist, and if either is missing phase 4 adds it through the
  client module.
- **Affected tests:** Unit tests in `src/domain/`: `scheduleMonthStatuses` returns rows for the elapsed
  months only, stopping at the current month for an open-ended arrangement and at the end month when
  that is earlier, empty when the arrangement starts next month and one row long when it starts and
  ends in the current month; it reports `outside-active-range`, `break-month` and `excepted`, one case
  per reachable reason against the same arrangement so the difference is the condition alone; a month
  that is both outside the member's ranges and a break month reports `outside-active-range`, which is
  `memberMonthStatus`'s own order rather than a second one; an excepted month that is also a break
  month reports `break-month`, because a month already excluded is never re-labelled; and the months
  `recurringReceived` counts equal the months the helper reports as counted, for a state carrying a
  break month, a departure and an exception, asserted as two sets of months rather than as a total.
  Automated criteria: exactly one export in `src/domain/` classifies a standing order's months, and
  `recurringReceived` calls it rather than repeating any condition inline. Manual: a break month and a
  participant departure inside a standing order are drawn as not counted with the reason named,
  neither is labelled assumed received, and the assumed total on the screen matches the balance the
  summary returns.
- **Commit:** recorded when the payments-and-recurring slice lands.
