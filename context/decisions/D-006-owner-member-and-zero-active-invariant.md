# D-006: The owner member and the zero-active-member invariant

- **Decision:** Three rules that together keep a month balancing exactly, whoever is on the plan.
  First, every subscription has exactly one owner member, created in the same atomic write as the
  subscription itself: the create route accepts an optional `owner_name` defaulting to `Me`, and the
  repository writes the subscription row, the owner member and the owner's opening active range
  starting at the subscription's first month in one D1 `batch`. A partial unique index,
  `members_one_owner_idx` on `members(subscription_id) WHERE is_owner = 1`, makes a second owner
  impossible from any path afterwards, and an attempt to add one is translated into 409 rather than
  being allowed to become a 500. This lands in the same phase as the members table, not later, so no
  phase is written against a precondition a later phase removes. The owner counts toward the active
  count for a month, so their seat lowers everyone else's share, and their own share is always zero.
  Second, a charged month in which nobody is active is a defined state rather than an error or a
  special case: the per-person share for that month is zero, no member owes anything for it, the
  month's full price still accrues to the plan total and therefore to the owner's net cost, and
  nothing throws or divides by zero. The owner's share of a month is produced once, as a named field
  on the summary, computed as what the month costs less what the charged members carry; that single
  value is what the interface renders and what the tests assert, so no second expression can disagree
  with it. Third, a subscription's first month is fixed at creation: `start_month` is not accepted in
  a patch body, and a patch carrying it is refused with 400 naming the field, in the same shape as the
  existing refusal of `id` and `user_id`. A subscription created before this decision has no owner
  member; nothing backfills one, and the summary route answers 409 naming the missing owner rather
  than computing a share over an incomplete plan.
- **Rationale:** The requirements make the owner a participant who occupies a seat, which is what makes
  the per-person share correct, and they make the organizer absorb whatever the split leaves over so
  that no month loses or invents money. Both properties depend on the owner member existing, so
  creating it with the subscription removes the only window in which a subscription could exist without
  a defined share. Putting the one-owner rule in a partial unique index rather than in a route check
  means it holds for every path, including any later import or repair script. The read-only prototype
  this project takes its monthly accounting semantics from returns the whole undivided price as the
  per-person share when the active count is zero and the price is not, and no test in its suite pins
  that value; its own zero-active test asserts only that no aggregate is `NaN`. That return is a
  defensive answer to a division by zero rather than a modelled outcome, and it reads as though one
  person owes the entire subscription. Zero plus full owner absorption is the answer the requirements
  already give for open question 4, it keeps the month-balances invariant true by construction, and it
  is what `shareForMonth` in this repository already does. The first month is fixed because every
  member range, price entry and break month is validated against it on the way in, the owner's opening
  range is pinned to it at creation, and the summary enumerates from it. Moving it later would leave
  every earlier stored record in violation of a rule the write path still enforces, so a member would
  become uneditable through the API while the totals quietly lost the truncated months.
- **Rejected alternative:** Treating a month with nobody active as invalid input and refusing to
  compute it was rejected because it is a state the organizer can reach legitimately, by recording that
  everyone including themselves left, and refusing it would make the product unusable at exactly the
  moment the ledger matters. Carrying the prototype's undivided-price return forward was rejected
  because it is a number that cannot be shown to anyone without being wrong. Leaving the owner as a
  concept rather than a member row was rejected by the requirements, which need the owner to occupy a
  seat. Creating the owner lazily, on the first read of the summary, was rejected because it makes a
  read perform a write and hides the moment of creation from the organizer. Backfilling an owner member
  into subscriptions created before this decision was rejected because the backfill would have to
  invent both a name and a joined month for a member nobody entered, and the affected rows are a
  developer's local database rather than real records. Widening the existing residual helper to take
  the number of charged members was rejected after review: the arithmetic was right, but nothing in
  the shipped path would have called it, so the suite would have proved one expression while the
  interface computed another. Guarding the start-month patch, by refusing it with 409 whenever a
  member range, price entry or break month precedes the new value, was rejected in favour of removing
  the field: the guard is a rule that every child table added after this one would have to be kept in
  step with, and nothing in the requirements asks for the first month to be editable.
- **Review objection + Resolution:** Independent plan review raised three objections against this
  decision as first written. First, scheduling the owner-on-create after the phase that tests the
  summary would turn those tests red the moment it landed, because they created the owner explicitly
  and would then collide with the unique index, and because the no-owner case they asserted would have
  become unreachable through the API. Resolution: the owner-on-create moves into the same phase as the
  members table, the summary tests never create an owner, and the no-owner case builds its precondition
  by inserting a subscription row directly through the test database, with a helper that says in one
  line why it exists. Second, a patchable first month would wedge every member whose ranges precede a
  moved value, making them uneditable through the API and silently dropping months from the totals.
  Resolution: the first month leaves the patch schema entirely, which is now part of this decision.
  Third, the widened residual helper had no producer for its new input and no call site, which also
  made the month-balances test near-vacuous, since the residual and the expectation were defined as
  each other's complement. Resolution: the helper is left as S-01 shipped it, the summary carries the
  owner's share of the month as its own field, and the balancing tests assert each figure against a
  hand-computed value before they assert that the figures sum to the price. An earlier objection, that
  a 409 from the summary is an error surfaced to a user who did nothing wrong, stands answered as
  before: the message names the missing owner and the route that creates one, the interface renders
  that message rather than a generic failure, and the state is unreachable for anything created after
  this decision. So does the objection that a partial unique index moves a product rule somewhere the
  application cannot see: the alternative is a check every future write path has to remember, and the
  application keeps the rule visible by catching the unique-constraint failure explicitly and answering
  409 with a message naming it.
- **Affected tests:** Unit tests in `src/domain/`: a priced month with nobody active returns a share of
  zero, leaves nobody owing, still adds its full price to the plan total and the owner's net cost,
  reports the whole price as the owner's share for that month, and throws nothing; the owner's own
  share is zero whatever their ranges say; the owner counts toward the active count; and across a table
  of prices and active counts, including a month the owner sits out, each of the month's figures
  matches a hand-computed value and only then sums to the price. Integration tests: a created
  subscription comes back with exactly one owner member, named from `owner_name` or `Me`, whose single
  range starts at the subscription's first month; a request to add a second owner returns 409; deleting
  the owner returns 409; a subscription patch carrying `start_month` returns 400 and changes nothing;
  and a subscription row inserted directly into the test database without an owner returns 409 from the
  summary route.
- **Commit:** recorded when the members-and-price-history slice lands.
