---
change_id: visual-redesign
title: Redesign the interface visually across every shipped screen
status: archived
---

## Notes

Roadmap S-06. Give the shipped app a cohesive, polished, responsive interface across every screen
that exists today: login, the subscription list and its empty state, the subscription form, and the
subscription detail with its members, prices, break months, payments, standing orders and summary.

Fable 5.1 is the sole designer per `context/foundation/visual-redesign-brief.md`. Research and
framing collect the ground truth and the open design questions; they do not decide appearance.

Hard constraint: the shipped accounting, authentication, ownership and persistence behaviour is
preserved exactly. This change may move markup, styling, copy and interaction, but no domain rule,
no route, no ownership check and no stored value changes as a result of it.

An independent implementation review followed (`reviews/impl-review.md`, verdict APPROVED with two
required corrections, 0 critical, 2 warnings, 5 observations). Every finding is resolved, mapped to
its commit in that file's `## Resolution` section. The two that changed code are F1, where the
section index now tracks the current item at the same line a click lands on and design-spec 4.4 fixes
that line at 117px, and F6, where a price-delete refusal falls back to the server's own words instead
of to none. The rest gave the record what it lacked: the automated gates as output, nineteen manual
rows as browser measurements, two corrected counts, and the design-question protocol's own lesson.
An independent re-review of that resolution followed and is recorded in the same file's
`## Re-verification` section: all seven findings verified resolved, the four automated gates re-run
at both the resolution revision and the F1 follow-up revision, and the F1 behaviour confirmed in a
real browser at 1280 and at 375, by keyboard, and under forced reduced motion. Overall verdict
APPROVED, every dimension PASS. One new observation, R1, asks for four mislabelled index captures
to be retaken or their rows corrected before archive; it is documentation only and changes no code.
Status moves to `impl_reviewed`.

## Closing note

Archived. R1 is closed at `6b30d5b` and `a5b5f18`: the four mislabelled index captures were
retaken at the set's widths and themes and the run record updated. The redesign is live: release
`c842f64` deployed as Cloudflare version
`84a95549-cd34-4065-a202-cf5f1385e9f9`, recorded in `context/checkpoints/release-2.md` and
`evidence/runs/release-2.md`. Roadmap S-06 is `done`. The design specification in this folder is the
accepted record of the shipped interface; the S-07 login amendment lives in
`context/changes/google-sign-in/design-delta.md` rather than here.

Date fields (`created`, `updated`, `archived_at`) are omitted: this repository records progress by
change ID, migration ID and commit, not by calendar.
