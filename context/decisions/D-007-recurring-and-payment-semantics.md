# D-007: Recurring and payment semantics

- **Decision:** Five rules that together decide what counts as money received and when a balance
  changes. First, a standing order is **assumed received**: once the organizer records that a
  participant sends a fixed amount every month from a given month, optionally until a given month,
  every month of that arrangement counts automatically, and a month stops counting only when one of
  five conditions fails. The month must be at or after the arrangement's start month, at or before its
  end month when it has one, not a break month, covered by one of the participant's active ranges, and
  not listed as an exception for that arrangement and that month. A sixth condition, that the month
  has elapsed, is not inside the rule: it holds because the summary enumerates only from the
  subscription's first month to the current month in the subscription's own time zone and never asks
  the rule about a later one. That bound is asserted by its own test at the summary level, because it
  is correct and invisible. The exception is the whole correction mechanism: it records one month of
  one arrangement, leaves every other month and every other arrangement untouched, and is written and
  removed by the two ends of one idempotent toggle. Second, a payment dated in the future is accepted
  and counts as credit immediately, while a payment whose month precedes the subscription's first
  month is refused with 400 naming the date and nothing is stored; there is no upper bound on a
  payment date. A yearly lump sum is an ordinary payment that happens to be large, distinguished only
  by a label. Third, **nothing derived is stored**: there is no balance column, no collected total and
  no paid-through month anywhere in the schema, so editing or deleting a payment moves the balance
  back correspondingly by construction rather than by a recomputation step that could be forgotten or
  half-applied. Fourth, two standing orders for one participant may not overlap in any month, where
  two arrangements that touch, one starting in the month the other ended, are an overlap rather than a
  continuation; the refusal is 409 naming the rule and the conflicting arrangement. Fifth, no payment
  and no standing order may name the owner member, refused with 400 naming the member field.
- **Rationale:** The requirements ask for a standing order that is recorded once and stops needing
  monthly data entry while remaining visibly labelled as assumed rather than confirmed (§Success
  Criteria secondary, FR-019, FR-026). Assumed receipt with per-month exceptions delivers exactly
  that: zero clicks in the common case, which is a payer who is reliable, and one click on the one
  month that went wrong. The alternative shape, confirming each month before it counts, would put the
  monthly data entry back and would leave a balance that is wrong by default until the organizer
  catches up. Drift between the fixed amount and the computed share is not hidden by the choice, since
  the balance is paid less owed and a participant sending more than their share accumulates visible
  credit. The five conditions are all in the rule because dropping any one of them overstates what has
  been collected, which is exactly the failure test-plan risk 4 names, and its stated anti-pattern is
  testing a single mid-range month and never the boundaries. Refusing a payment dated before the
  plan's first month is US-02's own acceptance criterion, and it needs the subscription's start month,
  so it is a route-level rule running after the schema rather than a schema rule; accepting a
  future-dated one is FR-018, which records and answers the counter-argument that future dates are
  usually typos. Not storing derived numbers is what makes US-02's third acceptance criterion true
  without code of its own, and it is affordable because the requirements record the expected scale as
  small. The overlap rule exists because two arrangements covering the same month would each count
  that month and silently double the assumed receipt, and the touching case is an overlap for the same
  reason D-006's active ranges treat it as one: the month is the unit of account and an arrangement
  cannot stop and restart inside one. Refusing money against the owner follows from the owner never
  being owed from and never appearing in the per-participant list, so a payment recorded against them
  would be counted nowhere and visible nowhere.
- **Rejected alternative:** A confirm-each-month model, in which a standing order creates an expected
  receipt that counts only once the organizer marks it as arrived, was rejected because it reintroduces
  the monthly data entry the requirement exists to remove, and because a balance that is wrong until
  someone confirms it is a worse default than one that is right until someone corrects it. Deleting and
  re-creating an arrangement around a missed month was rejected by FR-020 itself: it would lose the
  arrangement's own history. Clamping a standing order's amount to the participant's computed share was
  rejected because the drift is real money and hiding it would make the balance disagree with the bank.
  Spreading a yearly lump sum across the months it covers was rejected by FR-016, which records the
  counter-argument and answers it: the running balance already handles a large payment. Storing a
  running balance or a collected total per participant was rejected because every edit and delete path
  would then have to maintain it, and a missed path is a wrong number that nothing detects. Expressing
  the overlap rule as a database constraint was rejected as impossible rather than unwanted: SQLite has
  no exclusion constraint, so unlike D-006's one-owner partial unique index this invariant has to be a
  read-then-check in the route. Refusing an overlapping arrangement with 400 rather than 409 was
  rejected because the body is well formed and the conflict is with rows already stored, which is the
  same shape as the second-owner and duplicate-price-month refusals this project already answers with
  409. Leaving an exception in place when its arrangement's range is narrowed was rejected because the
  row would be inert until someone widened the arrangement again, at which point a correction made
  against a different set of months would silently return.
- **Review objection + Resolution:** Objection: assumed money is invented money, and a balance built
  on it can be confidently wrong for months before anyone notices. Resolution: the assumption is
  bounded by five conditions, every one of which is tested at its boundary, and it is never presented
  as confirmed: the recorded and assumed halves of a participant's paid total are separate terms in
  the calculation and separate labelled groups on the screen, which is FR-026 and the one way this
  product could mislead its user. The organizer corrects a month in one click and the correction is
  the smallest possible one. A second objection, that an overlap rule enforced in a route can be lost
  to a race between two concurrent writes, is accepted rather than solved: at one organizer acting on
  one subscription the race is not worth engineering against, and losing it produces a visible double
  count the organizer can delete rather than a corrupted ledger. A third objection, that refusing a
  payment against the owner is a rule the requirements never wrote, is answered by where the money
  would otherwise go: the owner is absent from the per-participant list by design, so the amount would
  be stored, counted nowhere and shown nowhere. The refusal is reversible in one route if the
  organizer ever wants to record money they paid themselves.
- **Affected tests:** Unit tests in `src/domain/`: the assumed-receipt rule counts a month inside the
  range and stops counting it for each of the four disqualifying conditions, each written as a pair
  against the same state so the difference is the condition alone; the end month itself counts and the
  month after it does not; through `computeSummary`, an open-ended arrangement and one ending after
  the current month both contribute for elapsed months only; a standing order larger than the
  participant's share accumulates credit and is never clamped; a future-dated payment counts now while
  a payment dated before the plan's first month is refused by the date rule; a payment with the yearly
  label counts exactly as an ordinary one; `collectedThisMonth` adds a manual payment in the current
  month to the assumed receipt for the same month; the same state with a payment's amount changed and
  with the payment removed produces the balance the inputs imply; and the acceptance example gives a
  balance of -13.33 against a share of 33.33. Schedule overlap is tested for a contained range, a
  straddling range, two ranges touching in one month and an open-ended range swallowing a later one,
  and for the three cases that are not overlaps. Integration tests: an overlapping arrangement returns
  409 and the first is unchanged; two arrangements separated by a month are accepted; a payment or a
  schedule naming the owner returns 400 naming the member field; a payment before the plan's first
  month returns 400 with nothing stored; both ends of the exception toggle are idempotent; an
  exception outside its arrangement's range returns 400; narrowing an arrangement drops the exceptions
  its new range no longer contains; and the summary read through the API reflects a stored
  arrangement, its exception, a break month and a month outside the participant's active range.
- **Commit:** recorded when the payments-and-recurring slice lands.
