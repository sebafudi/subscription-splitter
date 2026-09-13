# Subscription management and native date controls

Roadmap S-08; change ID `subscription-management-and-date-inputs`; status ready for research. This is a new user-requested change, not implemented by writing this brief.

## Required outcome

The owner can edit the subscription itself and delete a subscription with its associated ledger. Calendar fields use real browser date/month controls instead of plain string inputs. Preserve the accepted visual design, existing authentication, ownership and accounting behavior.

## Subscription editing

Expose an obvious edit action on the subscription detail screen and a complete form for subscription-level settings. Research the actual schema and existing PATCH handler first; do not assume all settings are currently mutable. Include name, start month and other existing user-configurable settings where meaningful. Resolve constraints on historical data in the plan: do not silently relabel stored currency amounts, reinterpret membership ranges or discard records when editing settings. Validate proposed changes against dependent records; explain refusals and keep the form values for correction. A genuinely supported edit must persist and be visible after reload. Missing product/design details are decided by Fable under standing delegation, not sent back to the user for another interview.

## Subscription deletion

Provide a deliberate delete action and confirmation naming the subscription and explaining that its participants, ranges, prices, break months, payments, schedules and exceptions will be removed. Cancellation performs no mutation. Confirmed deletion must remove the subscription from lists, close its detail view and make its old routes inaccessible. Server-side ownership remains mandatory; foreign/nonexistent identifiers return the existing non-disclosing response.

Research D1 foreign keys and deletion order; use an atomic operation or correctly enforced cascades so no half-deleted ledger or orphan records remain. Remove only the selected subscription and its descendants, never the user's identity, sessions or other subscriptions. Test failure handling and cross-user access. Creating the feature is authorized; do not delete existing user/demo data merely to test it. Exercise deletion on synthetic disposable subscriptions. Any browser automation of irreversible deletion must obey the runtime's action-confirmation rules.

## Native calendar inputs

Inventory every calendar field in create and edit flows: subscription start month, member join/leave ranges, effective-price month, break months, payment date and recurring schedule bounds. Use `<input type="date">` for complete calendar dates and `<input type="month">` for month-only values. Do not change month-based accounting into day-based accounting merely to use a date picker. Keep existing wire formats and server validation, avoid timezone conversions through Date objects, and handle optional/open-ended fields and min/max bounds correctly.

Verify the actual rendered input types and native picker behavior in the available desktop and mobile browsers. Native month controls have uneven browser support: Fable specifies an accessible fallback for browsers without a month picker, using supported native selects or date-picker adaptation with an explicit month-only meaning, not an unexplained plain string field. Do not claim a native calendar works from JSX inspection alone.

## Design and 10x flow

Fable 5.1 reads frontend-design and specifies placement, edit form, confirmation, input styling, loading/success/error/focus states, keyboard behavior, responsive layout and motion before implementation. Opus/Sonnet implement the complete specification; return unresolved design choices to Fable.

Use `10x-new` → `10x-research` → applicable `10x-frame` → Fable design delta → `10x-plan` → independent `10x-plan-review` and corrections → phased `10x-implement` → independent `10x-impl-review` → Fable acceptance → release verification → `10x-archive`. Read full skills and schemas. Update foundation PRD, test plan, roadmap and setup docs where affected. Follow canonical change Progress and date-free checkpoint/archive conventions.

## Acceptance and evidence

Tests cover allowed/refused setting edits, persistence, unauthenticated/foreign mutations, deleting a ledger with all supported child records, preserving unrelated data, and failure atomicity. Browser checks cover edit/save/reload, cancellation and synthetic deletion, native date/month behavior, keyboard access and narrow screens. Re-run relevant app tests, typecheck/build and live smoke checks after deployment. Capture new evidence for the identifiable release and refresh affected certification screenshots/package references. Do not upload anything to 10x without explicit confirmation.

Subagents checkpoint each meaningful step; designated status writer reconciles parent GOALS.md, app STATUS and evidence. Prior release checkboxes are not evidence that this new feature is complete.
