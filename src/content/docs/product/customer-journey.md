---
title: Customer journey
description: The thirteen-gate customer journey from status disclosure to acceptance, with the events emitted at each step.
---

The customer journey is the heart of the demo. Thirteen gates, each producing structured evidence. The order matters; the [reconciliation pass](/architecture/reconciliation/) assumes it.

## Gate map

| # | Gate | Source of truth | Event(s) |
| --- | --- | --- | --- |
| 1 | Open in plain language | Model | (none) |
| 2 | Status disclosure | UI button | `present_disclosure` then `acknowledge_disclosure` |
| 3 | Eligibility check | UI form | `record_eligibility` |
| 4 | Indicative quote configurator | UI form | `record_provisional_quote` |
| 5 | Email opt-in | UI form | `record_email_preference` |
| 6 | Application details | UI form | `record_personal_facts` + `record_financial_facts` (+ `record_customer_contact` if mobile missing) |
| 7 | Vulnerability check | UI form | `record_vulnerability_indicators` |
| 8 | Credit search consent | UI button | `present_disclosure` then `capture_consent` |
| 9 | Pre-contract confirmation | Server reconcile + UI button | `present_disclosure` then `acknowledge_disclosure` |
| 10 | Submit | Server reconcile | `submit_application` then waterfall runs |
| 11 | Waterfall narration | Model + server | `WATERFALL_RESULT_JSON` system note |
| 12 | Counter-offer or decline | UI buttons | `accept_counter_offer` / `refuse_counter_offer` |
| 13 | Acceptance | Model | `case_complete` |

See [Event taxonomy](/reference/events/) for full payload shapes.

## Why the order matters

The order is not arbitrary. It reflects the FCA-compliant sequence:

1. **Status before eligibility.** The customer must know who's talking to them and on what basis before they answer any qualifying questions.
2. **Eligibility before quote.** A customer who can't qualify shouldn't see a tempting indicative monthly. The agent doesn't anchor.
3. **Quote before application details.** The customer commits to a term they've chosen with full information about the indicative monthly. Application details come after they've decided to proceed.
4. **Application details before vulnerability check.** The customer has filled in their details; the vulnerability prompt is the moment to flag anything that needs care before consent.
5. **Vulnerability before credit search consent.** A flagged customer might choose to withdraw or take time before consenting.
6. **Consent before pre-contract.** A customer who refuses the credit search never sees pre-contract; nothing is sent to the lender panel.
7. **Pre-contract before submission.** The customer affirms accuracy as a final step before the application becomes live.

If the agent (or a human operator) tries to skip a gate, [reconciliation](/architecture/reconciliation/) catches it and forces the journey back into sequence.

## What the customer sees

Each gate has a UI surface designed to be unambiguous on a phone:

- **Disclosures** render the verbatim body text as a card with a single button ("I understand", "I confirm", or "Grant / Refuse").
- **Forms** are short and use chips for enumerated values (residential status, property type, employment status). No free-text dropdowns where avoidable.
- **The quote configurator** shows the loan amount big, term chips, monthly payment recomputing live.
- **The waterfall** animates lender-by-lender as steps land. The agent's prose narrates in parallel.

The chat thread runs the whole way through, but it's a *companion* to the structured cards, not the primary surface. The agent answers questions and explains; the cards capture the regulated commitments.

## What the agent says (and doesn't say)

The agent's [system prompt](https://github.com/bgood11/lending-agent/blob/main/lib/system-prompts.ts) is explicit about what's in and out of bounds:

- **Plain UK English.** No marketing speak. Banned filler: "brilliant", "perfect", "amazing", "fantastic", "wonderful", "lovely". No exclamation marks anywhere.
- **Never invent disclosure content.** The model emits `present_disclosure` with an id, the UI looks up the body and renders verbatim.
- **Never infer consent or eligibility from conversational vibes.** The structured cards are the source of truth.
- **Never claim a guarantee about future solar savings.** Always label as estimate.
- **Never give suitability advice** ("you should pick X", "this is right for you").
- **Never recommend a specific offer in prose.** The UI labels one offer with a factual marker like "Lowest net cost".

This is enforced by the [reconciliation pass](/architecture/reconciliation/) and by the [empty-turn protection](/safety/empty-turn-protection/), not by hope.
