---
change_id: visual-redesign
title: Redesign the interface visually across every shipped screen
status: implemented
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
Status stays `implemented`; the re-review is a separate pass.

