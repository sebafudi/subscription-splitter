---
change_id: payments-and-recurring
title: Record payments and standing orders, and watch the balances move
status: plan_reviewed
archived_at: null
---

## Notes

Third vertical slice, roadmap item S-03. The organizer records, edits and deletes payments, records
standing orders and marks single months of them as not received, sees every balance move
accordingly, and can tell a recorded receipt from an assumed one.

It is the slice that makes `balanceForMember` and `collectedThisMonth` mean something: S-02 typed
payments, schedules and exceptions and wrote the received-month rule against them, then passed empty
arrays. This slice brings the three tables, their repositories, their routes and their screens, and
proves the assumed-receipt rule against stored data rather than against a literal.

Date fields (`created`, `updated`) are omitted: this repository records progress by change ID,
migration ID and commit, not by calendar.
