---
project: "Subscription Splitter"
context_type: greenfield
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: "context type"
      decision: "greenfield; the repository has git history but no application code"
    - topic: "pain category"
      decision: "coordination overhead plus data trapped in a spreadsheet or in the organizer's head"
    - topic: "primary persona scope"
      decision: "one named role, the organizer who pays the plan; participants are bookkeeping records, not users"
    - topic: "access model"
      decision: "sign-in against seeded accounts; no self-service signup"
    - topic: "role separation"
      decision: "flat model; one role, and a second seeded account used to prove isolation"
    - topic: "first flow scope"
      decision: "sign in, set up one subscription with members, record a payment, read the balances"
    - topic: "multi-subscription support"
      decision: "data model allows many per account; only one is exercised by the interface for now"
    - topic: "rounding policy"
      decision: "equal rounded share per active member; the owner absorbs the residual"
    - topic: "proration"
      decision: "none; membership is whole months only"
    - topic: "break months"
      decision: "price zero, no liability, no assumed receipt; later price entries survive"
    - topic: "zero active members in a priced month"
      decision: "cost still accrues, nobody owes, the owner absorbs it; defined invariant, not an error"
    - topic: "recurring arrangements"
      decision: "assumed received for elapsed, active, non-break months unless listed as an exception, and labelled as assumed"
    - topic: "member deletion"
      decision: "members with history are archived or closed out, never hard deleted"
    - topic: "future-dated payments"
      decision: "allowed and treated as credit; payments before the start month are rejected"
    - topic: "current month derivation"
      decision: "read through the subscription's own time zone, never the server's local date"
  frs_drafted: 26
  quality_check_status: accepted
---

# Shape notes: Subscription Splitter

Input to the product requirements document. Sections below follow the order of the greenfield
requirements schema so they map across cleanly. Forward-looking blocks at the end are not part of
that schema.

## Vision & Problem Statement

One person pays for a shared monthly plan - a family music subscription, a shared video plan -
and collects money back from everyone on it. The bookkeeping looks trivial until the plan runs for
a year: someone joins in March, someone leaves in July and comes back in October, the provider
raises the price in September, one month is skipped entirely, one person pays a year up front and
three others pay a different amount each month by standing order. The organizer ends up with a
spreadsheet they no longer trust, quietly absorbs the difference, and stops asking.

The insight is that the unit of account is the month, not the payment. What each person owes is
decided by who was active in that month and what the plan cost in that month, and every other
number in the product is derived from those two facts. Products that model this as a shared wallet
or a running tab get the joins, leaves and price changes wrong, because they have no notion of a
month in which a given person was or was not a participant.

## User & Persona

Primary persona: the organizer. The person whose card is charged for the plan. They set it up,
they know who is on it, and they are the one out of pocket until everyone pays. They reach for this
product at the start of a month, when the charge lands and they want to know who owes what, and
again whenever someone transfers them money.

Participants are not users of the product. They are records the organizer keeps about people. There
is no invitation, no participant login, and no notification to a participant.

### Secondary persona

A reviewer, using a separate seeded account. They exist so that account isolation can be
demonstrated against a real second account rather than asserted. They see their own data and
nothing of the organizer's.

## Access Control

Sign-in with email and password against accounts that are seeded, not self-registered. There is no
sign-up screen and no password reset flow. Signing out ends the session immediately and the ended
session cannot be reused.

One role. Every signed-in account is an organizer over its own data and has no visibility of any
other account's data. Account ownership runs through the subscription: every member, price entry,
break month, payment, recurring arrangement and exception belongs to exactly one subscription, and
that subscription belongs to exactly one account. A request naming a record from another account is
answered as though the record does not exist. An unauthenticated visitor reaching a data screen is
sent to sign-in.

## Success Criteria

### Primary

- The organizer sets up one real plan - members with the months they joined and left, the price
  history, any skipped months - records the payments that actually happened, and reads a per-member
  balance that matches a hand calculation to the minor unit.
- A month containing a price change, a skipped month, and a member who left all produce the correct
  share and the correct liability without manual correction.

### Secondary

- Standing orders are recorded once and stop needing monthly data entry, while remaining visibly
  labelled as assumed rather than confirmed.
- The organizer can answer "has this person paid for March?" from the payment history instead of
  from a bank statement.

### Guardrails

- No account can read or change another account's records, through any screen or any request.
- No month loses or invents money: what every participant owes plus what the organizer absorbs
  equals the plan cost for that month, exactly.
- A record that was saved is still there after a reload and after the service restarts.

## Functional Requirements

### Access

- FR-001: Organizer can sign in to a seeded account with an email address and a password. Priority: must-have
  > Socratic: Counter-argument considered: "a single-organizer tool needs no login at all". Resolved: kept, because
  > proving that one account cannot read another's data is a primary guardrail and needs a second account to be real.
- FR-002: Organizer can sign out, after which the ended session gives no further access. Priority: must-have
  > Socratic: Counter-argument considered: "expiry alone is enough". Resolved: kept; an ended session that still works is
  > the failure a shared laptop produces.
- FR-003: An unauthenticated visitor reaching any data screen is sent to sign-in and sees no records. Priority: must-have
  > Socratic: Counter-argument considered: "the screens are useless without data anyway". Resolved: kept; the requirement
  > is about what is returned, not what is rendered.
- FR-004: Organizer cannot read, change or delete any record belonging to another account. Priority: must-have
  > Socratic: Counter-argument considered: "with two seeded accounts this is theoretical". Resolved: kept and strengthened;
  > it is the one defect in this product that is silent and unrecoverable.

### Subscription setup

- FR-005: Organizer can create a subscription with a name, a currency, a first month, a display locale and a time zone. Priority: must-have
  > Socratic: Counter-argument considered: "currency, locale and time zone are over-configuration for one household".
  > Resolved: kept; the time zone decides which month is current, which changes what is owed.
- FR-006: Organizer can record what the plan costs from a given month onward, leaving earlier months at their old price. Priority: must-have
  > Socratic: Counter-argument considered: "just store one current price and correct history by hand". Resolved: kept;
  > a price change is the most common event that makes a naive tracker wrong for every past month at once.
- FR-007: Organizer can mark a month as skipped, so the plan costs nothing that month and nobody owes anything for it. Priority: must-have
  > Socratic: Counter-argument considered: "a skipped month is just a price of zero". Resolved: kept as its own concept;
  > a zero price and a skipped month differ in whether standing orders count as received.
- FR-008: Organizer can change or remove a recorded price entry or a skipped month. Priority: must-have
  > Socratic: Counter-argument considered: "history should be immutable". Resolved: kept editable; the data is one
  > person's bookkeeping, and a typo in a price silently misstates every balance.

### Members

- FR-009: Organizer can add a participant with a name and the month they joined. Priority: must-have
  > Socratic: Counter-argument considered: "a join date is enough, the month is imprecise". Resolved: whole months only;
  > the plan itself is billed monthly and part-month splitting is explicitly not wanted.
- FR-010: Organizer can record the month a participant left, and a later month they rejoined, as one participant. Priority: must-have
  > Socratic: Counter-argument considered: "a rejoin is simply a new participant". Resolved: one participant with several
  > active periods; otherwise their payment history splits in two and their balance is meaningless.
- FR-011: Organizer can mark exactly one participant as the account owner, who pays the plan and is never owed from. Priority: must-have
  > Socratic: Counter-argument considered: "the owner does not need to be a participant record at all". Resolved: kept as
  > a participant; the owner occupies a seat and therefore changes the per-person share.
- FR-012: Organizer can archive a participant who has payment history rather than deleting them. Priority: must-have
  > Socratic: Counter-argument considered: "archiving clutters the list". Resolved: kept; deleting a payer would destroy
  > the record of money that actually changed hands.
- FR-013: Organizer can delete a participant who has no payments and no standing order. Priority: must-have
  > Socratic: Counter-argument considered: "archive everything, never delete". Resolved: kept; a typo on a new row should
  > not be permanent.
- FR-014: Organizer can rename a participant and correct the months they were active. Priority: must-have
  > Socratic: Counter-argument considered: "corrections invite accidental rewriting of settled months". Resolved: kept;
  > entering the wrong join month is the most likely setup mistake and it must be fixable.

### Payments

- FR-015: Organizer can record a payment from a participant with a real date, an amount and a note. Priority: must-have
  > Socratic: Counter-argument considered: "a month is enough, an exact date is noise". Resolved: kept; the organizer
  > reconciles against a bank statement, which is dated.
- FR-016: Organizer can mark a payment as a one-off or as a yearly lump sum. Priority: must-have
  > Socratic: Counter-argument considered: "a yearly lump sum needs its own spreading rule". Resolved: no spreading; it is
  > an ordinary payment that happens to be large, and the running balance handles it.
- FR-017: Organizer can change or delete any recorded payment. Priority: must-have
  > Socratic: Counter-argument considered: "payments should be append-only with reversals". Resolved: plain editing;
  > reversal entries are ceremony for a one-person ledger.
- FR-018: Organizer can record a payment dated in the future, which counts as credit already held. Priority: must-have
  > Socratic: Counter-argument considered: "future dates are almost always typos". Resolved: allowed; prepayment is a real
  > and common case, while dates before the plan started are rejected outright.

### Recurring arrangements

- FR-019: Organizer can record that a participant sends a fixed amount every month from a given month, optionally until a given month. Priority: must-have
  > Socratic: Counter-argument considered: "assumed money is invented money". Resolved: kept, with the assumption made
  > visible wherever it is counted.
- FR-020: Organizer can mark a single month of a standing order as not received. Priority: must-have
  > Socratic: Counter-argument considered: "delete the arrangement for that month instead". Resolved: kept as an
  > exception; deleting and re-adding would lose the arrangement's own history.
- FR-021: Organizer can change or remove a standing order. Priority: must-have
  > Socratic: Counter-argument considered: "an amount change is a new arrangement". Resolved: editing allowed, with
  > arrangements for one participant never covering the same month twice.

### Reading the numbers

- FR-022: Organizer can see, for each participant, whether they owe money or are ahead, and by how much. Priority: must-have
  > Socratic: Counter-argument considered: "a single total is all anyone acts on". Resolved: kept per participant; the
  > organizer chases individuals, not totals.
- FR-023: Organizer can see this month's per-person share and what has been collected against what is expected this month. Priority: must-have
  > Socratic: Counter-argument considered: "the all-time balance already covers this". Resolved: kept; the monthly charge
  > is the moment the organizer opens the product.
- FR-024: Organizer can see the total currently owed to them and their own net cost since the plan started. Priority: must-have
  > Socratic: Counter-argument considered: "net cost is vanity, not a decision". Resolved: kept; it is the number that
  > answers whether running the plan is worth it.
- FR-025: Organizer can see the payment history for one participant. Priority: must-have
  > Socratic: Counter-argument considered: "the balance is the only thing that matters". Resolved: kept; a disputed
  > balance is settled by showing the payments behind it.
- FR-026: Organizer can tell which receipts were recorded by hand and which are assumed from a standing order. Priority: must-have
  > Socratic: Counter-argument considered: "the distinction confuses the reader". Resolved: kept; presenting assumed money
  > as confirmed money is the one way this product could mislead its user.

## User Stories

### US-01: Organizer sets up a plan and reads what each participant owes

- **Given** a signed-in organizer with no subscription yet
- **When** they create a subscription, record its price, add themselves as owner and add two other participants from the first month
- **Then** each of the two participants owes an equal rounded share for every elapsed month, and the organizer owes nothing

#### Acceptance Criteria
- With a price of 100.00 PLN and three active participants including the owner, each non-owner owes 33.33 for that month
- The organizer's net cost for that month is 33.34 before anyone pays, absorbing the remainder
- A participant who pays 20.00 shows a balance of -13.33 for that month
- The numbers are unchanged after a reload

### US-02: Organizer records a payment and the balance moves

- **Given** a participant who owes money
- **When** the organizer records a payment from that participant with a date, an amount and a note
- **Then** the participant's balance moves by exactly that amount, and the payment appears in their history

#### Acceptance Criteria
- A payment dated before the plan's first month is rejected and nothing is stored
- A payment dated in the future is accepted and counts as credit
- Editing or deleting the payment moves the balance back correspondingly

### US-03: A participant leaves and the share changes

- **Given** a subscription whose participants include one who stops taking part after a given month
- **When** the organizer records the month that participant left
- **Then** they owe nothing for months after that, and the remaining participants' share for those months is recalculated over the smaller group

#### Acceptance Criteria
- The departed participant's balance stops moving after their last active month
- Their earlier liabilities and payments are unchanged
- Recording a later rejoin month for the same participant resumes their liability without creating a second participant

### US-04: A skipped month costs nothing

- **Given** a month in which the plan was not charged
- **When** the organizer marks that month as skipped
- **Then** nobody owes anything for it, no standing order counts as received for it, and the months around it are unaffected

#### Acceptance Criteria
- The plan's total cost does not include the skipped month
- A standing order covering that month contributes nothing for it
- The price recorded for later months still applies to those months

### US-05: A second account sees nothing

- **Given** two seeded accounts, each with its own subscription
- **When** one account is signed in and tries to reach the other account's records
- **Then** the records are reported as not existing, and with no session at all the request is refused

#### Acceptance Criteria
- Reads, changes and deletes naming another account's records all report the record as absent
- A record belonging to the right account but reached through the wrong parent record is also reported as absent
- No request without a valid session returns any record

## Non-Functional Requirements

- Every amount shown is an exact minor-unit value, and for any month what all participants owe plus what the
  organizer absorbs equals the plan's cost for that month, with no residue.
- A request carrying no valid session returns no record of any kind.
- A record that was saved is present and unchanged after the page is reloaded and after the service restarts.
- The month the product treats as current matches the calendar month in the subscription's own time zone,
  regardless of where the product runs or where the organizer is.
- An input that would break a stated money or membership rule is rejected with a message naming the field at
  fault, and nothing is stored.
- Repeated failed sign-in attempts stop being useful to an attacker working through a password list, while an
  organizer who mistypes their password a few times in a row can still get in.
- Amounts and months are displayed in the subscription's own currency and language conventions.
- The product is usable on current versions of the mainstream desktop and mobile browsers.

## Business Logic

For every month the plan is charged, its price is split equally between the participants active that
month including the organizer, each non-owner owes that rounded share for every active month up to
and including the current one, and the organizer absorbs whatever the split leaves over.

The rule consumes three kinds of input the organizer provides: what the plan cost from each month
onward, which whole months each participant was taking part in, and which months were skipped
entirely. Nothing is inferred from a calendar of payments; the liability exists whether or not money
moved.

Its output is one number per participant. The share for a charged month is the price divided by the
number of active participants that month, rounded to the minor unit. Each non-owner carries that
share for each of their active, charged, elapsed months. The organizer carries no share and takes
the remainder, so the month always balances exactly. Against that liability sits what the
participant has paid: amounts the organizer recorded by hand, plus the months covered by a standing
order that has elapsed, was not skipped, and was not marked as not received. The difference is the
balance, negative when they owe, positive when they are ahead.

The organizer meets the rule on the dashboard as five numbers - what is owed to them now, this
month's per-person share, this month's collected against expected, their own net cost since the
plan started, and how many participants are active this month - and underneath, the same
calculation resolved per participant.

## Non-Goals

Functional:

- No self-service sign-up, invitations or participant accounts. Participants are records, not users.
- No part-month proration. Membership is whole months; a mid-month join counts from that month.
- No coverage waivers - marking a month as forgiven for one participant. Deferred until the core
  ledger is trusted.
- No opening balances carried in from a previous spreadsheet. The first month in the product is the
  first month of record.
- No charts or time series beyond the headline totals. They add reading, not decisions.
- No interface for more than one subscription per account, although the records allow it.
- No currency conversion. One subscription, one currency.
- No payment processing, payment links or bank integration. The product records money that moved
  elsewhere.
- No agent-facing or machine-facing interface for the ledger.
- No mobile applications. The browser is the only surface.

Non-functional:

- No offline use. The product is useless without its records.
- No multi-region availability or failover.
- No formal compliance or accessibility certification.

## Open Questions

1. **Which sign-in mechanism the seeded accounts use** - resolved by decision D-001: an
   authentication library running on the same runtime and database, with public sign-up disabled and
   accounts seeded server-side. The product requirement is unchanged: seeded accounts only, no
   sign-up, sessions that end on sign-out. Block: no.
2. **Whether the second seeded account is read-only or has full control of its own data** - owner: the
   organizer. Default we will take: full control of its own data, which is a stricter isolation test
   than a read-only account. Resolve by the first runtime slice.
3. **Whether archived participants stay in the balance list** - owner: the organizer. Default we will
   take: hidden from the current-month view, still reachable in history, since an archived participant
   with an outstanding balance still matters. Resolve by the members slice.
4. **How a charged month with no active participants is presented** - owner: the organizer. Default we
   will take: shown as an ordinary line whose whole cost falls on the organizer, with no warning, since
   it is a defined outcome rather than an error. Resolve by the members slice.

## Quality cross-check

All six greenfield checks present: access control, one-sentence business rule, project artifacts,
scope discipline confirmed, non-goals, and a stated first flow. No gaps carried into open questions
beyond the four listed above, each of which has a default.

## Interview decisions

Every question the discovery phases would have asked, the answer taken, and the alternative rejected.

- **Is this greenfield or brownfield?** Greenfield. The directory has git history but no application
  code, no lockfile and no source tree. Rejected: brownfield framing, which would have produced delta
  sections describing a system that does not exist here. The earlier prototype is a read-only reference,
  not a codebase being changed.
- **What kind of pain is this?** Coordination overhead plus data trapped in a spreadsheet. Rejected:
  framing it as a missing feature of the subscription provider, which is not something we can build.
- **Who exactly is the persona?** One named role, the organizer paying the plan. Rejected: treating
  participants as a second user group, which would have required invitations, notifications and
  participant accounts for no gain in the first version.
- **How does the persona get in?** Sign-in against seeded accounts. Rejected: open sign-up, which adds a
  registration surface and email delivery without serving the persona, and rejected a local-only profile,
  which cannot demonstrate account isolation.
- **Flat user model or roles?** Flat. Rejected: an admin and member split, which has no meaning when the
  only human user of an account is its owner.
- **What is the smallest end-to-end flow?** Sign in, create a subscription with members and a price,
  record a payment, read the balances. Rejected: starting with the recurring-payments engine, which
  produces no visible value until a ledger exists to sit under it.
- **Multiple subscriptions per account?** Records allow many, the interface exercises one. Rejected:
  building the multi-subscription interface now, which multiplies screens before a single subscription is
  proven correct.
- **How is the share rounded?** Price divided by active participants, rounded to the minor unit, owner
  absorbs the residual. Rejected: largest-remainder allocation, which spreads the residual across
  participants and makes two people with identical membership owe different amounts.
- **Is membership prorated within a month?** No. Whole months only. Rejected: day-level proration, which
  the underlying plan does not do either, and which would make every balance an argument.
- **What does a skipped month mean?** Zero price, no liability, no assumed receipt, later prices
  untouched. Rejected: deleting the price entry for that month, which loses the price that applies after it.
- **What happens in a charged month with nobody active?** Cost still accrues to the plan total, nobody
  owes a share, the organizer absorbs it. Rejected: treating it as invalid input, which would block a
  legitimate state; rejected silently skipping the month, which would understate the organizer's cost.
- **How are standing orders counted?** As received for every elapsed, active, non-skipped month not
  listed as an exception, and labelled as assumed wherever shown. Rejected: counting them only once
  confirmed, which reduces them to a reminder and removes the reason for having them.
- **Can a participant with history be deleted?** No. They are archived or closed out with a leaving
  month. Rejected: cascading deletion of their payments, which destroys the record of money that
  actually moved.
- **Are future-dated payments allowed?** Yes, as credit. Payments dated before the plan's first month
  are rejected. Rejected: rejecting all future dates, which breaks prepayment, a case the product exists
  to handle.
- **How is the current month decided?** Through the subscription's own time zone. Rejected: the
  service's local date, which changes what is owed depending on where the product happens to run.
- **How many people will use it?** A handful. Rejected: planning for a large tenant base, which would
  have pulled in invitations, quotas and per-tenant isolation machinery beyond what one account needs.

## Forward: tech stack

Not part of the product requirements. Carried to the stack selection step.

- The stack is already fixed by the team and is recorded in `context/foundation/tech-stack.md`.
- The sign-in mechanism was the one genuinely open technical choice. Decision D-001 settles it in
  favour of Better Auth on the Worker and the D1 binding, after a compatibility spike; the
  standard-primitives candidate stays documented as the fallback.
- Money is stored and computed in integer minor units throughout; formatting happens only where a
  number is displayed.
- Validation is a single declared contract covering amounts, months, dates, ranges, uniqueness and
  ownership, applied at every entry point rather than per screen.

## Forward: technical roadmap

Not part of the product requirements. Carried to the roadmap and test plan steps.

- The money calculation belongs in a module with no storage dependency, so it can be exercised directly
  against the worked examples in this document.
- The acceptance example in US-01 and the isolation checks in US-05 are the two things that must be
  regression-tested before anything is called done.
- An automated code review pipeline is planned as a separate package, independent of the product slices.

## Schema adaptations

- Date fields required by the requirements schema (`created`, `updated`, `timeline_budget.hard_deadline`,
  `timeline_budget.mvp_weeks`) are omitted throughout this repository. Progress is tracked by slice
  identifier, not by calendar. Version fields are kept.

## Stack interview decisions

Answers to the stack-selection questions, recorded the same way as the product decisions above. The
resulting hand-off is `context/foundation/tech-stack.md`.

- **Which language family?** TypeScript and JavaScript. Rejected: Python and the other families, none
  of which run in the chosen edge runtime and all of which would split the language between the
  calculation and the client.
- **Take the recommended web default, or design our own?** Our own. Rejected: the recommended
  full-stack web starter, which brings a rendering framework we do not need for a handful of screens
  and hides the request boundary we want to keep explicit for ownership checks.
- **Which starter card?** The Hono card. It clears all four agent-friendly checks, its bootstrapper
  support is verified, and its first deployment default is the runtime we are targeting. Rejected: a
  client-only starter, which would leave the API unhoused, and the heavier API frameworks, which do
  not run in the target runtime.
- **Which technology-forcing features are in scope?** Sign-in only. Payments are explicitly not in
  scope despite the product being about money: the product records payments that happened elsewhere
  and never processes one. No realtime, no model calls in the product, no scheduled work. The
  automated code review pipeline does call a model, but it is a separate development tool rather than
  a product feature, so it does not set the product's feature flags.
- **Who is building it?** One person. Rejected: relaxing the convention and documentation bar, which
  only makes sense with reviewers who already know the stack.
- **Soft preferences?** Explicit types everywhere and a validation contract declared once. Rejected:
  leaving validation to each screen, which is how ownership checks get missed on one route out of ten.
- **Anything to avoid?** A second deployable unit for the client, and any ORM between the repositories
  and SQL. Rejected: a separate static host for the client, which adds an origin, cross-origin
  configuration and a second account to keep in sync.
- **Where does it deploy?** The starter's first default, the edge runtime, with its own remote
  database. Rejected: a container host, which would give up the local-database test story we get for
  free in this runtime.
- **Which CI provider?** GitHub Actions, matching where the repository lives. Rejected: the runtime
  vendor's own build service, which would couple running the checks to the deployment account.
- **Deploy automatically on merge, or promote by hand?** By hand. Rejected: auto-deploy on merge;
  until the browser walkthrough and the smoke test exist, an automatic deployment would publish
  money-handling changes that nothing has exercised end to end.
- **Testing runner?** The runtime's own test pool for integration tests against a local database, a
  plain unit runner for the calculation, and one browser test for the main flow. Rejected: driving
  everything through the browser, which is slow and proves the least about the arithmetic.
- **Five-point self-check** - explicit types, official starter, recognizable conventions, current
  documentation, and the ability to tell when an agent is off-convention: all five hold, so no
  compensation is needed for the agent-friendly criteria.
- **Project name for the hand-off?** `subscription-splitter`, from the product name. Rejected:
  renaming to match the earlier prototype, which is a read-only reference and not this project.

## Roadmap and test-plan interview decisions

Answers to the sequencing and testing questions, recorded the same way as the decisions above.

- **What is the sequencing goal?** Quality. The requirements' guardrails are correctness of money and
  isolation between accounts, and both fail silently. Rejected: speed to launch, which would sequence
  the visible screens first and leave ownership checks to be retrofitted; rejected low complexity,
  which would park the price history and active ranges that are the whole reason the product exists.
- **Which item is the validation point?** S-02, where the organizer first reads a per-participant
  balance, because that is the primary success criterion. Rejected: S-01, which proves the account
  boundary but shows no number worth checking; it is sequenced first only because S-02 cannot exist
  without it.
- **What is the main blocker?** Unresolved decisions. The sign-in mechanism is open and four product
  questions carry defaults rather than answers. Rejected: external dependency, which is real for the
  review pipeline but touches nothing on the product line; it is recorded as a blocker on S-05 alone.
- **Where do we invest deeply?** In the calculation and the storage boundary. The screens stay plain
  and there is no observability work, because no requirement names either. Derived from the goal and
  the guardrails rather than asked.
- **What worries us most about this product failing?** That a balance is quietly wrong and the
  organizer absorbs the difference without noticing, which is exactly the failure the spreadsheet
  already produces.
- **Where has this gone wrong before?** At the month boundaries: the edges of active ranges, the
  month a price changes, and the month a standing order should not count. All three are named risks
  with their own rollout phase.
- **Which area changes most without confidence?** Not applicable yet - there is no code and no commit
  history over source, so likelihood in the risk map is argued from the domain rather than from churn.
- **What feels under-tested today?** Skipped. There is no test suite to be under-tested relative to;
  the first rollout phase brings the runner in.
- **What should not get test budget?** A coverage number, a second browser flow, participant-facing
  behaviour, locale rendering beyond one assertion, the review pipeline's output quality, and browser
  or accessibility matrices. All recorded in the test plan's negative-space section.
