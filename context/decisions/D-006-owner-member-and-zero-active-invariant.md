# D-006: The owner member and the zero-active-member invariant

- **Decision:** Two rules that together keep a month balancing exactly, whoever is on the plan. First,
  every subscription has exactly one owner member, created in the same atomic write as the
  subscription itself: the create route accepts an optional `owner_name` defaulting to `Me`, and the
  repository writes the subscription row, the owner member and the owner's opening active range
  starting at the subscription's first month in one D1 `batch`. A partial unique index,
  `members_one_owner_idx` on `members(subscription_id) WHERE is_owner = 1`, makes a second owner
  impossible from any path afterwards, and an attempt to add one is translated into 409 rather than
  being allowed to become a 500. The owner counts toward the active count for a month, so their seat
  lowers everyone else's share, and their own share is always zero. Second, a charged month in which
  nobody is active is a defined state rather than an error or a special case: the per-person share for
  that month is zero, no member owes anything for it, the month's full price still accrues to the plan
  total and therefore to the owner's net cost, and nothing throws or divides by zero. The owner's
  residual for a month is computed from the number of members actually charged rather than from the
  active count less one, because the owner holds active ranges like any other member and may sit a
  month out, in which case every active member is charged. A subscription created before this decision
  has no owner member; nothing backfills one, and the summary route answers 409 naming the missing
  owner rather than computing a share over an incomplete plan.
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
  is what `shareForMonth` in this repository already does.
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
  developer's local database rather than real records.
- **Review objection + Resolution:** Objection: a 409 from the summary for a subscription with no owner
  is an error surfaced to a user who did nothing wrong, and a partial unique index moves a product rule
  into a place the application code cannot see. Resolution: the 409 names the missing owner and the
  route that creates one, so the remedy is one call rather than a mystery, and the state it reports is
  unreachable for anything created after this decision. The index stays, because the alternative is a
  check that every future write path has to remember; the application keeps the rule visible by
  catching the unique-constraint failure explicitly and answering 409 with a message naming the rule,
  rather than letting a database error escape as a 500. A second objection, that the owner's residual
  helper was already written and already passing its tests, is answered by the fact that it encodes
  "exactly one active member is the owner" in an arithmetic expression, which is silently wrong for any
  month the owner sits out; that input is made explicit rather than inferred.
- **Affected tests:** Unit tests in `src/domain/`: a priced month with nobody active returns a share of
  zero, leaves nobody owing, still adds its full price to the plan total and the owner's net cost, and
  throws nothing; the owner's own share is zero whatever their ranges say; the owner counts toward the
  active count; the residual for a month the owner sat out covers every charged member; and for a
  range of prices and counts, every non-owner's share plus the owner's residual equals the price
  exactly. Integration tests: a created subscription comes back with exactly one owner member whose
  range starts at the subscription's first month; a second owner returns 409; deleting the owner
  returns 409; and a subscription created without an owner returns 409 from the summary route.
- **Commit:** recorded when the members-and-price-history slice lands.
