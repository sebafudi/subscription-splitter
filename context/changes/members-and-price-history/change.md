---
change_id: members-and-price-history
title: Record participants and prices, and read what each one owes
status: planned
archived_at: null
---

## Notes

Second vertical slice, roadmap item S-02, and the milestone's north star. The organizer records
participants with the whole months they were active, records the price history and any skipped
months, and reads this month's per-person share, the headline totals and a per-participant balance.
It brings up `src/domain/`, the calculation module the whole product is judged against, as a pure
module with no storage dependency.

Date fields (`created`, `updated`) are omitted: this repository records progress by change ID,
migration ID and commit, not by calendar.
