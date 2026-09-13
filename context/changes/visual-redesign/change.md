---
change_id: visual-redesign
title: Redesign the interface visually across every shipped screen
status: implementing
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
