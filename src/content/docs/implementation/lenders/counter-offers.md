---
title: Counter-offers
description: How counter-offers are composed, presented to the customer, and accepted, with the case for honest counter-pricing.
---

A counter-offer is the lender saying "yes, but at different terms." Most consumer credit journeys handle counter-offers badly. The customer applies for £12,500 over 120 months at an indicative 9.9% APR, the lender approves at 12.9% over 144 months, and the customer discovers the price change buried in a quote summary on the next page. Lending Agent presents counter-offers as their own first-class object with explicit accept and try-next buttons.

This page covers the wire shape, the customer-facing presentation, and the design rationale.

## The counter-offer payload

When you respond `approved_with_counter`, the offer body looks like this:

```json
{
  "kind": "approved_with_counter",
  "offer": {
    "id": "offer_thisbank_144_<applicationId>",
    "lender": "This Bank",
    "position": "Prime Priority 2",
    "productCode": "IBC",
    "aprPct": 12.9,
    "termMonths": 144,
    "monthlyPayment": 138.10,
    "totalPayable": 19886.40,
    "netLoanAmount": 12500
  },
  "reason": "Counter-offered at a longer term to bring monthly payment within affordability range."
}
```

Fields that matter to the customer:

- `lender`. Named clearly. The customer learns who is offering.
- `aprPct`. Compared visually against the requested APR.
- `termMonths`. Compared against the requested term.
- `monthlyPayment`. The number the customer cares about most.
- `totalPayable`. The full cost-of-credit figure across the term, which makes APR concrete.

The `reason` string is optional and not surfaced verbatim to the customer (it is captured in the audit log). The broker's UI summarises why the counter exists from the difference between the requested and counter terms; the literal reason text is for the broker's compliance review.

## What the customer sees

The counter-offer card is a structured comparison, not a paragraph of text. Schematic:

```
┌──────────────────────────────────────────────────────────┐
│  This Bank approved your application                     │
│                                                          │
│  At slightly different terms than you saw in your quote: │
│                                                          │
│  ┌────────────────┬─────────────────┬──────────────────┐ │
│  │                │ You asked for   │ This Bank offers │ │
│  ├────────────────┼─────────────────┼──────────────────┤ │
│  │ APR            │ 9.9%            │ 12.9%            │ │
│  │ Term           │ 120 months      │ 144 months       │ │
│  │ Monthly        │ £160.10         │ £138.10          │ │
│  │ Total payable  │ £19,212         │ £19,886          │ │
│  └────────────────┴─────────────────┴──────────────────┘ │
│                                                          │
│  [ Accept this offer ]   [ Try the next lender ]         │
└──────────────────────────────────────────────────────────┘
```

The two buttons are the entire customer interaction. Tapping accept emits `accept_counter_offer`; tapping try-next emits `refuse_counter_offer`. The audit log records the choice and the timestamp.

## The case for honest counter-pricing

The default UX for counter-pricing in the industry is to swap the price quietly on the next form. The numbers update; the customer signs; the lender funds. The customer's ability to compare what they were offered against what they accepted is degraded by design.

Lending Agent's UX makes the swap impossible to miss:

- The counter exists as a discrete card, not a quote update.
- The requested terms appear next to the counter terms.
- The accept choice is binary and explicit.
- The audit log records both options and the choice.

Cross-link to [/regulatory/consumer-duty/](/regulatory/consumer-duty/). Consumer Duty asks brokers to demonstrate customer understanding. A burying-in-fine-print counter cannot demonstrate that. A side-by-side comparison plus an explicit choice can.

For the lender, the implication is that more counters will be refused than under the buried-counter UX. That is the right outcome: a customer who would have accepted a 3-percentage-point APR increase only because they didn't notice should not be funded.

## The "try the next lender" path

Refusal is not the end. The customer's `refuse_counter_offer` event clears the awaiting flag and triggers the broker to call the next lender on the panel with `fromIndex` advanced past the refused step. The customer sees a "ok, let's see what the next lender says" message and the agent narrates the next waterfall step.

If the next lender approves at requested terms, that becomes the offer. If they approve with another counter, the customer sees another counter card. If they decline, the agent moves on. If every remaining lender declines or counters, and every counter is refused, the journey ends with `caseOutcome.kind === "declined"` (treating refused-all-counters as a customer choice not to take a counter, with no offer to proceed on).

The customer can refuse counters until they run out of lenders. There is no penalty for this beyond running out of options. The audit log records every refusal.

## Edge case: counter accepted but funding fails

Out of demo scope but a real concern in production. The customer accepts a counter, the broker passes the acceptance to the lender, the lender's funding pipeline rejects (final credit check, KYC document failure, fraud flag).

The cleanest pattern:

- The acceptance event is recorded as a customer choice.
- The lender's funding rejection is a separate downstream event.
- The case state grows a `funded` outcome distinct from `selected`.
- If funding fails, the case re-enters the waterfall with the failed lender excluded.

Implementing this means the `WaterfallResult` shape grows a `fundingResult` field per accepted offer, and the case status grows two states: `funding_pending` and `funded`. The customer-facing UX explains the funding step and what happens if it fails.

The demo treats `selected` as the terminal state. A production deployment should not.

## Composition: who builds the counter

The counter-offer body is composed by the lender's adapter, not by the broker. The lender knows their own pricing, term constraints, and affordability rules. The broker just relays the structured response.

Cross-link to [/implementation/lenders/decision-api/](/implementation/lenders/decision-api/) for the adapter contract. The adapter's `decide` function returns a `WaterfallStepOutcome` whose body is fully populated; the broker does not modify the offer fields.

The broker does enforce one constraint: the counter must be at a `netLoanAmount` equal to the requested amount. The broker does not relay counters that change the loan principal. If the lender wants to offer at a different amount, that is a decline-plus-suggestion, handled differently. Cross-link to [/architecture/mock-vs-real/](/architecture/mock-vs-real/) and the suggestion mechanic.

## Multiple counters in one journey

A customer can see up to N counter cards in a single journey, where N is the panel size. Each lender that approves with a counter triggers a separate card. Each card carries that specific lender's terms. Each card is decisioned independently.

If the customer accepts the third counter (after refusing two), the journey terminates on the third lender's terms. The audit log shows three counter offers and three customer decisions, with the final decision marked `acceptedOffer`.

## What the broker does not do

The broker does not aggregate counters. The customer never sees "three lenders approved at different terms, pick one." That is a parallel-waterfall UX, not a sequential one, and it surfaces in a different mental model.

The broker does not negotiate. The counter is what the lender offered; the customer's choice is binary.

The broker does not remember refused counters across journeys. If a customer comes back tomorrow with a fresh application, the panel sequence starts over. There is no "you refused This Bank's counter yesterday" memory.

## See also

- [/implementation/lenders/waterfall-protocol/](/implementation/lenders/waterfall-protocol/) for the response shape.
- [/implementation/brokers/lender-panel/](/implementation/brokers/lender-panel/) for the waterfall mechanics.
- [/implementation/lenders/decision-api/](/implementation/lenders/decision-api/) for adapter composition.
- [/regulatory/consumer-duty/](/regulatory/consumer-duty/) for the customer-understanding framing.
