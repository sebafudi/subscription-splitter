---
change_id: subscription-management-and-date-inputs
title: Edit and delete the subscription itself, and use native browser calendar controls
status: archived
---

## Notes

Roadmap S-08. Two things the shipped ledger never gave the owner: the subscription record itself is
create-only and delete-less, and every calendar field in the client is a plain string input. This
change adds a subscription-level edit form, a deliberate delete of a subscription together with its
whole ledger, and real `<input type="date">` and `<input type="month">` controls wherever a calendar
value is entered.

The authored request is `context/foundation/subscription-management-brief.md`. It fixes the rules
that matter most. Editing must be validated against dependent records rather than silently
relabelling stored currency amounts, reinterpreting membership ranges or discarding history; a
refusal explains itself and keeps the form values for correction. Deletion must remove exactly the
selected subscription and its descendants, atomically, never the user's identity, sessions or other
subscriptions, and never by half. Native controls must not turn month-based accounting into
day-based accounting, must keep the existing `YYYY-MM` and `YYYY-MM-DD` wire formats and server
validation, and must not round-trip values through `Date` objects where a time zone could shift them.

Hard constraint: the shipped accounting, authentication and ownership behaviour is preserved.
Ownership stays server-side on every read and mutation, child IDs included, and foreign or
nonexistent identifiers keep returning the existing non-disclosing 404.

Fable 5.1 is the sole designer, consistent with the accepted redesign in
`context/archive/visual-redesign/design-spec.md`. It specifies the edit affordance and form, the
delete confirmation, input styling and the month-control fallback for browsers with no native month
picker. Research and framing collect the ground truth and the open design questions; they decide no
appearance. Opus and Sonnet implement and return unresolved design choices to Fable.

Date fields (`created`, `updated`, `archived_at`) are omitted: this repository records progress by
change ID, migration ID and commit, not by calendar.

## Closing note

Archived. Subscription editing, deliberate deletion of a subscription with its whole ledger, and
native browser calendar controls are live. Release 5,
`91ce0daa469df960097398ce756730f97845e647`, deployed as Cloudflare version
`751a8bfd-e62a-4c9a-beb2-1953eb6a7656` and recorded in `evidence/runs/release-5.md`, carries the
change. The five certification captures this change alters were retaken against that release and
recorded in `evidence/runs/release-5-captures.md`; the other five were left alone because the screens
they show are unchanged.

Progress in `plan.md` stands at 57 of 59 rows ticked, and the two open rows are open by design rather
than unfinished. Row 2.8 asserted that the rendered app was unchanged while no call site referenced
the new controls yet; it is checkable only at `e47b427`, and every call site uses the controls on the
current tree. The `no-owner` half of row 4.17 needs a subscription whose owner participant row is
absent, which the product's own routes refuse to produce because the owner cannot be deleted; the
`error` half of that row is verified. Both reasons, and what would close each, are recorded under
"Unverified" in `evidence/runs/s08-browser-verification.md`.

Browser verification covered Chrome and Safari on one machine. Firefox, Edge, Chrome Android and
Firefox Android are unverified: none is installed or reachable from that machine, and the design
delta's answer 11 already rests on published support data for them. Four Safari readings are
unverified for the same reason recorded there, that Safari could not be scripted: the control heights
are pixel measurements off a 1:1 capture rather than `getBoundingClientRect` readings, and Safari at
390 width, Safari in light appearance, and a full Tab traversal with Escape on the confirmation strip
were out of reach.

Roadmap S-08 is `done`. Date fields (`created`, `updated`, `archived_at`) are omitted: this
repository records progress by change ID, migration ID and commit, not by calendar.
