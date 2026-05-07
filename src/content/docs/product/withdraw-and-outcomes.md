---
title: Withdraw and outcomes
description: The terminal lifecycle. How a case ends, what's recorded, what the audit trail shows.
---

A case ends in one of five terminal states. Each is a `caseOutcome.kind` recorded with a timestamp.

| Outcome kind | Meaning |
| --- | --- |
| `selected` | Customer accepted an offer (clean approval or counter-offer accepted) |
| `declined` | Waterfall ran, no lender approved (and no counter accepted) |
| `withdrawn` | Customer left the journey via "Leave for now" |
| `ineligible` | Failed eligibility check, no application made |
| `completed` | A neutral terminal state used as a fallback |

Every case ends in a terminal state. There is no implicit timeout. A case in `awaiting_customer` indefinitely is still in flight; the broker's case-management process decides what to do with stale cases.

## The withdraw flow

The customer can leave at any point during the journey. A discreet "Leave for now" link in the page header opens a confirmation modal:

> *Are you sure? You can come back to this link later but the lender panel won't process your application until you finish.*
>
> [Yes, leave for now] [No, stay here]

There's an optional reason textarea ("anything you'd like us to know?") and the buttons. Confirming dispatches:

```ts
{
  type: "withdraw",
  data: { reason: "..." }   // or undefined
}
```

The state machine records:

- `case.status = "withdrawn"`
- `case.caseOutcome = { kind: "withdrawn", reason, recordedAt }`
- The chat input locks
- A paused-state card appears: *"Thanks. We've paused the application."*

Nothing has been sent to the lender panel. No credit search has run. The case can be resumed later by opening the same link, but the broker's process may also decide to delete the case after a retention period (see [Privacy: retention](/privacy/retention/)).

The customer is not pressured to commit, not asked why repeatedly, not chased. The withdraw flow is a Consumer Duty consumer-support feature; see [Vulnerable customer protection](/safety/vulnerable-customer-protection/).

## Selected (clean approval)

The waterfall ran, the prime lender approved at the requested terms. The customer's "Accept this offer" tap dispatches `select_offer` with the offer ID:

- `case.status = "selected"`
- `case.selectedOfferId = offer.id`
- `case.caseOutcome = { kind: "selected", recordedAt }`

The agent's next turn confirms the next step (signing the agreement with the approving lender) and emits `case_complete`. The audit log shows the full waterfall, with the prime lender's outcome as `approved_as_requested`.

## Selected (counter accepted)

The prime lender declined; a downstream lender approved at different terms (a counter-offer). The customer's "Accept this offer" on the counter-offer card dispatches `accept_counter_offer`:

- `case.waterfall.acceptedOffer = waterfall.steps[i].outcome.offer`
- `case.status = "selected"`
- `case.selectedOfferId = acceptedOffer.id`
- `case.caseOutcome = { kind: "selected", recordedAt }`

The audit log shows the full waterfall: lender 1 declined, lender 2 counter-offered, customer accepted.

## Declined (waterfall exhausted)

Every lender on the panel declined. The agent moves to the decline narrative:

> *Unfortunately the panel couldn't arrange finance for this application this time. We tried [Lender 1], [Lender 2], and [Lender 3]. Each had their own reasons for not being able to approve.*
>
> *If you'd like to talk it through with someone, free and independent debt advice is available from StepChange (stepchange.org, 0800 138 1111) and Citizens Advice (citizensadvice.org.uk).*

The agent emits `case_complete` after the customer indicates they understand. State:

- `case.status = "declined"`
- `case.caseOutcome = { kind: "declined", recordedAt }`

The audit log shows every lender's decline reason. The decline path never pushes for retries, never offers alternative finance products, never asks the customer to "try again with different details".

## Ineligible

The customer answered No to one or more eligibility questions. The agent moves to the ineligible path with a plain-English explanation:

> *Thanks for letting me know. Based on those answers, our lender panel won't be able to offer this finance. The reason is [the specific NO answer they gave]. That's a hard requirement from the lenders, not a credit decision.*

The agent emits `case_complete` after the customer indicates they understand. State:

- `case.status = "ineligible"`
- `case.caseOutcome = { kind: "ineligible", recordedAt }`

No credit search runs. No lender call is made. The customer's eligibility answers are recorded for audit but no further data capture happens.

## Completed (neutral)

A fallback terminal state for cases where the journey reached a sensible end without any of the more specific outcomes applying (e.g. the customer reached the end and the agent emitted `case_complete` without a more specific outcome already recorded).

In practice this is rare; most journeys end with a more specific outcome.

## What the audit shows

Every terminal outcome is rendered in the audit log timeline:

```
2026-05-07 14:32:11    case_outcome    Case outcome: withdrawn, Customer chose to leave
2026-05-07 14:32:11    withdrawn       Case outcome: withdrawn
```

The outcome's `recordedAt` lets a compliance reviewer see exactly when the case ended, and the timeline shows the full sequence leading to it.

## Resumability

Cases in non-terminal states can be resumed by re-opening the customer URL with the `?seed=...` parameter. The seed carries the full case state. See [Cold-start recovery](/architecture/cold-start-recovery/).

Cases in terminal states **cannot** be resumed:

- `withdrawn` cases show the paused-state card with no chat input
- `selected` cases show the accepted offer with no further action
- `declined` cases show the decline narrative with no further action
- `ineligible` cases show the ineligible explanation with no further action

The broker's case-management process decides what happens to terminal cases (deletion after retention period, escalation to human follow-up, etc.).
