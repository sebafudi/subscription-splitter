---
change_id: subscription-management-and-date-inputs
title: Edit and delete the subscription itself, and use native browser calendar controls
status: planned
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
