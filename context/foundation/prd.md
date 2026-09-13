---
project: "Subscription Splitter"
version: 1
status: draft
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  hard_deadline: null
  after_hours_only: true
---

# Subscription Splitter

## Vision & Problem Statement

One person pays for a shared monthly plan - a family music subscription, a shared video plan -
and collects money back from everyone on it. The bookkeeping looks trivial until the plan runs for a
year: someone joins in March, someone leaves in July and comes back in October, the provider raises
the price in September, one month is skipped entirely, one person pays a year up front and three
others pay a different amount each month by standing order. The organizer ends up with a spreadsheet
they no longer trust, quietly absorbs the difference, and stops asking.

The insight is that the unit of account is the month, not the payment. What each person owes is
decided by who was active in that month and what the plan cost in that month, and every other number
in the product is derived from those two facts. Products that model this as a shared wallet or a
running tab get the joins, leaves and price changes wrong, because they have no notion of a month in
which a given person was or was not a participant.

## User & Persona

The organizer. The person whose card is charged for the plan. They set it up, they know who is on
it, and they are the one out of pocket until everyone pays. They reach for this product at the start
of a month, when the charge lands and they want to know who owes what, and again whenever someone
transfers them money.

Participants are not users of the product. They are records the organizer keeps about people. There
is no invitation, no participant login, and no notification to a participant.

### Secondary persona

A reviewer, using a separate seeded account. They exist so that account isolation can be
demonstrated against a real second account rather than asserted. They see their own data and nothing
of the organizer's.

## Success Criteria

### Primary

- The organizer sets up one real plan - participants with the months they joined and left, the price
  history, any skipped months - records the payments that actually happened, and reads a
  per-participant balance that matches a hand calculation to the minor unit.
- A month containing a price change, a skipped month, and a participant who left all produce the
  correct share and the correct liability without manual correction.

### Secondary

- Standing orders are recorded once and stop needing monthly data entry, while remaining visibly
  labelled as assumed rather than confirmed.
- The organizer can answer "has this person paid for March?" from the payment history instead of from
  a bank statement.

### Guardrails

- No account can read or change another account's records, by any means.
- No month loses or invents money: what every participant owes plus what the organizer absorbs equals
  the plan cost for that month, exactly.
- A record that was saved is still there after a reload and after the product is restarted.

## User Stories

### US-01: Organizer sets up a plan and reads what each participant owes

- **Given** a signed-in organizer with no subscription yet
- **When** they create a subscription, record its price, add themselves as owner and add two other
  participants from the first month
- **Then** each of the two participants owes an equal rounded share for every elapsed month, and the
  organizer owes nothing

#### Acceptance Criteria
- With a price of 100.00 PLN and three active participants including the owner, each non-owner owes
  33.33 for that month
- The organizer's net cost for that month is 33.34 before anyone pays, absorbing the remainder
- A participant who pays 20.00 shows a balance of -13.33 for that month
- The numbers are unchanged after a reload

### US-02: Organizer records a payment and the balance moves

- **Given** a participant who owes money
- **When** the organizer records a payment from that participant with a date, an amount and a note
- **Then** the participant's balance moves by exactly that amount, and the payment appears in their
  history

#### Acceptance Criteria
- A payment dated before the plan's first month is rejected and nothing is stored
- A payment dated in the future is accepted and counts as credit
- Editing or deleting the payment moves the balance back correspondingly

### US-03: A participant leaves and the share changes

- **Given** a subscription whose participants include one who stops taking part after a given month
- **When** the organizer records the month that participant left
- **Then** they owe nothing for months after that, and the remaining participants' share for those
  months is recalculated over the smaller group

#### Acceptance Criteria
- The departed participant's balance stops moving after their last active month
- Their earlier liabilities and payments are unchanged
- Recording a later rejoin month for the same participant resumes their liability without creating a
  second participant

### US-04: A skipped month costs nothing

- **Given** a month in which the plan was not charged
- **When** the organizer marks that month as skipped
- **Then** nobody owes anything for it, no standing order counts as received for it, and the months
  around it are unaffected

#### Acceptance Criteria
- The plan's total cost does not include the skipped month
- A standing order covering that month contributes nothing for it
- The price recorded for later months still applies to those months

### US-05: A second account sees nothing

- **Given** two seeded accounts, each with its own subscription
- **When** one account is signed in and tries to reach the other account's records
- **Then** the records are reported as not existing, and with no session at all access is refused

#### Acceptance Criteria
- Reads, changes and deletes naming another account's records all report the record as absent
- A record belonging to the right account but reached through the wrong parent record is also
  reported as absent
- Nothing without a valid session returns any record

## Functional Requirements

### Access

- FR-001: Organizer can sign in to a seeded account with an email address and a password. Priority: must-have
- FR-002: Organizer can sign out, after which the ended session gives no further access. Priority: must-have
- FR-003: An unauthenticated visitor reaching any data screen is sent to sign-in and sees no records. Priority: must-have
- FR-004: Organizer cannot read, change or delete any record belonging to another account. Priority: must-have
  > Socratic: Counter-argument considered: "with two seeded accounts this is theoretical". Resolved: kept and
  > strengthened; it is the one defect in this product that is silent and unrecoverable.

### Subscription setup

- FR-005: Organizer can create a subscription with a name, a currency, a first month, a display locale and a time zone. Priority: must-have
  > Socratic: Counter-argument considered: "currency, locale and time zone are over-configuration for one household".
  > Resolved: kept; the time zone decides which month is current, which changes what is owed.
  > Shipped: `POST /api/subscriptions` writes the subscription and its owner participant in one batch.
  > All five settings stay editable afterwards, under FR-027, and creation applies the same first-month
  > floor the edit applies, so a subscription cannot be created below the bound its own settings screen
  > enforces.
- FR-006: Organizer can record what the plan costs from a given month onward, leaving earlier months at their old price. Priority: must-have
  > Socratic: Counter-argument considered: "just store one current price and correct history by hand". Resolved: kept;
  > a price change is the most common event that makes a naive tracker wrong for every past month at once.
- FR-007: Organizer can mark a month as skipped, so the plan costs nothing that month and nobody owes anything for it. Priority: must-have
  > Socratic: Counter-argument considered: "a skipped month is just a price of zero". Resolved: kept as its own concept;
  > a zero price and a skipped month differ in whether standing orders count as received.
- FR-008: Organizer can remove a recorded price entry or a skipped month, and corrects one by removing it and recording it again rather than editing it in place. Removing a price entry that later months depend on is confirmed first, and the confirmation names the months that would be left with no price. Priority: must-have
  > Shipped: `POST` and `DELETE` on `/api/subscriptions/:id/prices` and `/api/subscriptions/:id/break-months`;
  > there is no patch for either. The price refusal and the months it names come from
  > `monthsLosingTheirPrice` in `src/domain/prices.ts`, and `?confirm=true` is how the caller proceeds.
  > Removing a skipped month has no such gate, because restoring a month to its recorded price cannot
  > leave a month unpriced.
- FR-027: Organizer can change a subscription's name, currency, display locale, time zone and first month after it has been created. Priority: must-have
  > Socratic: Counter-argument considered: "a setting chosen at creation should be permanent, because every
  > record underneath it was entered against that setting". Resolved: each setting is either display only or
  > bounded by the records themselves, so the bound is the safeguard and a ban is only needed where no bound
  > can be stated.
  > Shipped: `PATCH /api/subscriptions/:id` takes any non-empty subset of the five and refuses with a 400
  > naming the field at fault. Currency changes only while no price, no payment and no standing order
  > exists, because §Non-Goals holds one subscription to one currency with no conversion and every amount
  > is stored in minor units carrying no currency of its own; once an amount exists the field is shown
  > locked with that reason. Locale is display only and changes freely. Time zone changes freely and moves
  > which month counts as current, as the non-functional requirement below records. The first month moves
  > earlier as far as January ten years before the current year, and later only as far as the earliest
  > month any dependent record uses: the earliest participant join month, price month, skipped month,
  > payment month and standing-order first month. A refusal names the binding month and the kind of record
  > that pins it. The owner participant's opening active range moves with the first month in the same write
  > when it starts there, and that shift is refused only when the moved range would end before it starts.
- FR-028: Organizer can delete a subscription, which removes it together with everything recorded under it: its participants, their active months, its prices, its skipped months, its payments, its standing orders and the months of those marked as not received. Priority: must-have
  > Socratic: Counter-argument considered: "removing a ledger that records money which actually changed
  > hands is the one irreversible act in this product". Resolved: kept, behind a confirmation that names the
  > subscription and lists what goes with it; a ledger the organizer has stopped keeping has no other exit,
  > and an archived subscription is a state nothing else in the product reads.
  > Shipped: `DELETE /api/subscriptions/:id` answers 204, or the existing non-disclosing 404 for an unknown
  > or foreign id. The removal is one atomic write across the eight tables, deepest first, so a subscription
  > is never left half removed. Nothing outside the named subscription is touched: another account's records
  > and the organizer's own other subscriptions all survive. This is the one place a participant who has
  > payments or a standing order is removed outright rather than archived (FR-012) or refused (FR-013),
  > because that rule protects a participant inside a ledger the organizer is keeping, not the ledger itself.

### Participants

- FR-009: Organizer can add a participant with a name and the month they joined. Priority: must-have
  > Socratic: Counter-argument considered: "a join date is enough, the month is imprecise". Resolved: whole months only;
  > the plan itself is billed monthly and part-month splitting is explicitly not wanted.
- FR-010: Organizer can record the month a participant left, and a later month they rejoined, as one participant. Priority: must-have
  > Socratic: Counter-argument considered: "a rejoin is simply a new participant". Resolved: one participant with several
  > active periods; otherwise their payment history splits in two and their balance is meaningless.
- FR-011: Exactly one participant is the account owner, who pays the plan and is never owed from. That participant is created with the subscription itself, active from its first month, so a subscription never exists without an owner. Ownership is not moved to another participant and not removed. Priority: must-have
  > Socratic: Counter-argument considered: "the owner does not need to be a participant record at all". Resolved: kept as
  > a participant; the owner occupies a seat and therefore changes the per-person share.
  > Shipped: decision D-006 settled this. The owner participant and their opening active range are written
  > in the same batch as the subscription (`create` in `src/server/db/subscriptions.ts`), a database
  > constraint holds the one-owner rule, a second owner is refused, and the owner participant cannot be
  > deleted. The organizer therefore never performs a "mark as owner" action; the requirement is met by
  > construction rather than by a step they take. Deleting the whole subscription removes the owner
  > participant with everything else under it (FR-028); what is never moved or removed is ownership while
  > the subscription exists.
- FR-012: Organizer can archive a participant who has payment history rather than deleting them. An archived participant keeps every liability and every payment they already had; archiving decides only how they are shown. One who is settled up is hidden from the list behind a toggle that says how many are hidden, and one who still owes or is still ahead stays visible. Priority: must-have
  > Socratic: Counter-argument considered: "archiving clutters the list". Resolved: kept; deleting a payer would destroy
  > the record of money that actually changed hands.
  > Shipped: `archived` on a participant, set through the participant patch and read by `MemberList` in
  > `src/client/components/`. The calculation ignores it entirely, which is what keeps an archived
  > participant's balance honest. This answers what was open question 3.
- FR-013: Organizer can delete a participant who has no payments and no standing order. Priority: must-have
- FR-014: Organizer can rename a participant and correct the months they were active. Priority: must-have

### Payments

- FR-015: Organizer can record a payment from a participant with a real date, an amount and a note. Priority: must-have
- FR-016: Organizer can mark a payment as a one-off or as a yearly lump sum. Priority: must-have
  > Socratic: Counter-argument considered: "a yearly lump sum needs its own spreading rule". Resolved: no spreading; it is
  > an ordinary payment that happens to be large, and the running balance handles it.
- FR-017: Organizer can change or delete any recorded payment. Priority: must-have
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

### Reading the numbers

- FR-022: Organizer can see, for each participant, whether they owe money or are ahead, and by how much. Priority: must-have
- FR-023: Organizer can see this month's per-person share and what has been collected against what is expected this month. Priority: must-have
- FR-024: Organizer can see the total currently owed to them and their own net cost since the plan started. Priority: must-have
- FR-025: Organizer can see the payment history for one participant. Priority: must-have
- FR-026: Organizer can tell which receipts were recorded by hand and which are assumed from a standing order. Priority: must-have
  > Socratic: Counter-argument considered: "the distinction confuses the reader". Resolved: kept; presenting assumed money
  > as confirmed money is the one way this product could mislead its user.

### Entering months and dates

- FR-029: Organizer enters every month and every date through the browser's own calendar control, and through a list of named months where a browser offers no month picker. Priority: must-have
  > Socratic: Counter-argument considered: "a typed ISO string is unambiguous and needs no browser support
  > matrix". Resolved: it is unambiguous to read and hostile to write; the organizer was typing the month out
  > as `YYYY-MM` into a plain box, with the format spelled out in a hint beside it.
  > Shipped: a date field is the browser's date control. A month field is one shared control that renders
  > the browser's month control where it exists, and a list of month names carrying their year, in the
  > subscription's own display locale, where it does not; a probe run once per page load decides which of
  > the two appears. Both shapes read and write the same `YYYY-MM` and `YYYY-MM-DD` strings the product
  > has always stored and sent, so nothing about the records or the requests changes. Where a server rule sets a lower bound,
  > the control carries it as a convenience only; the server rule stays the enforcement, because a browser
  > is free to ignore the attribute.

## Non-Functional Requirements

- Every amount shown is an exact minor-unit value, and for any month what all participants owe plus what
  the organizer absorbs equals the plan's cost for that month, with no residue.
- Without a valid session, no record of any kind is returned.
- A record that was saved is present and unchanged after the page is reloaded and after the product is
  restarted.
- The month the product treats as current matches the calendar month in the subscription's own time zone,
  regardless of where the product runs or where the organizer is. That time zone is an editable setting
  (FR-027), so changing it can move which month counts as current and therefore every balance by one
  month's worth; the field says so before the change is made, and no stored record moves with it.
- An input that would break a stated money or membership rule is rejected with a message naming the field
  at fault, and nothing is stored.
- Repeated failed sign-in attempts stop being useful to an attacker working through a password list, while
  an organizer who mistypes their password a few times in a row can still get in.
- Amounts and months are displayed in the subscription's own currency and language conventions. The
  display locale is editable at any time because it changes nothing but the rendering; the currency is
  editable only while no amount has been recorded, because every amount is stored without a currency of
  its own and changing it would relabel history.
- The product is usable on current versions of the mainstream desktop and mobile browsers.

## Business Logic

For every month the plan is charged, its price is split equally between the participants active that month
including the organizer, each non-owner owes that rounded share for every active month up to and including
the current one, and the organizer absorbs whatever the split leaves over.

The rule consumes three kinds of input the organizer provides: what the plan cost from each month onward,
which whole months each participant was taking part in, and which months were skipped entirely. Nothing is
inferred from a calendar of payments; the liability exists whether or not money moved.

Its output is one number per participant. The share for a charged month is the price divided by the number
of active participants that month, rounded to the minor unit. Each non-owner carries that share for each of
their active, charged, elapsed months. The organizer carries no share and takes the remainder, so the month
always balances exactly. Against that liability sits what the participant has paid: amounts the organizer
recorded by hand, plus the months covered by a standing order that has elapsed, was not skipped, and was not
marked as not received. The difference is the balance, negative when they owe, positive when they are ahead.

A charged month in which nobody was active is a defined outcome rather than an error: the share is
nothing, the month's whole cost falls on the organizer, and the month still counts towards the plan
total and towards their net cost. Decision D-006 settled this, and it answers what was open question 4.

The organizer meets the rule on the dashboard as five headline numbers - what is owed to them now,
this month's per-person share, their own share of this month, this month's collected against expected,
and how many participants are active this month. Their net cost since the plan started, this month's
cost and the plan's total sit directly under those five, and underneath that the same calculation is
resolved per participant.

## Access Control

Sign-in with email and password against accounts that are seeded, not self-registered. There is no sign-up
screen and no password reset flow. Signing out ends the session immediately and the ended session cannot be
reused.

One role. Every signed-in account is an organizer over its own data and has no visibility of any other
account's data. The second seeded account is not a restricted one: it has the same full control of its
own records, which is the stricter isolation test and answers what was open question 2. Account ownership runs through the subscription: every participant, price entry, skipped
month, payment, standing order and exception belongs to exactly one subscription, and that subscription
belongs to exactly one account. Anything naming a record from another account is answered as though the
record does not exist, including a record reached through a parent that belongs to someone else. An
unauthenticated visitor reaching a data screen is sent to sign-in.

## Non-Goals

Functional:

- No self-service sign-up, invitations or participant accounts. Participants are records, not users.
- No part-month proration. Membership is whole months; a mid-month join counts from that month.
- No coverage waivers - marking a month as forgiven for one participant. Deferred until the core ledger is
  trusted.
- No opening balances carried in from a previous spreadsheet. The first month in the product is the first
  month of record.
- No charts or time series beyond the headline totals. They add reading, not decisions.
- No interface for more than one subscription per account, although the records allow it.
- No currency conversion. One subscription, one currency.
- No payment processing, payment links or bank integration. The product records money that moved elsewhere.
- No machine-facing interface to the ledger for outside tools.
- No mobile applications. The browser is the only surface.

Non-functional:

- No offline use. The product is useless without its records.
- No multi-region availability or failover.
- No formal compliance or accessibility certification.

## Open Questions

None remain open. All four questions this document opened have been answered by what was built, each
taking the default it named, and each answer has been folded into the requirement it belongs to:

1. **Which sign-in mechanism the seeded accounts use** - answered by decision D-001. The product
   requirement is unchanged: seeded accounts only, no sign-up, sessions that end on sign-out. See
   §Access Control.
2. **Whether the second seeded account is read-only or has full control of its own data** - full
   control of its own data. See §Access Control.
3. **Whether archived participants stay in the balance list** - a settled archived participant is
   hidden behind a toggle; one with an outstanding balance stays visible. See FR-012.
4. **How a charged month with no active participants is presented** - an ordinary month whose whole
   cost falls on the organizer, answered by decision D-006. See §Business Logic.

These are kept as a record of what was decided rather than deleted, because the roadmap and the test
plan both cite them by number.
