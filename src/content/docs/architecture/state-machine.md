---
title: State machine
description: CaseState as the source of truth, with status transitions driven by deterministic events.
---

`CaseState.status` is a finite-state field. It transitions through a defined sequence as events apply. Each transition is deterministic.

## States

| State | Meaning | Triggered by |
| --- | --- | --- |
| `intake` | Initial state, no facts captured | session creation |
| `awaiting_customer` | Installer handed off, customer hasn't started | `installer_handoff_complete` |
| `customer_active` | Customer has started the journey | `record_personal_facts` or `record_financial_facts` |
| `quote_ready` | Eligibility passed, quote configurator showing | `record_eligibility` (all yes) |
| `submitting` | Application submitted, waterfall about to run | `submit_application` |
| `waterfall_running` | Waterfall has run, awaiting customer decision | `setWaterfall()` with no acceptance or counter |
| `awaiting_counter_decision` | Counter-offer presented, customer choosing | `setWaterfall()` with `awaitingCounterDecision: true` |
| `selected` | Customer accepted an offer | `select_offer` or `accept_counter_offer` |
| `declined` | Waterfall exhausted, no offer | `setWaterfall()` with `exhausted: true` |
| `ineligible` | Eligibility failed | `record_eligibility` (any no) |
| `withdrawn` | Customer withdrew | `withdraw` |
| `complete` | Generic terminal | `case_complete` |

## Transition diagram

```
                           ┌─────────────────────────────┐
                           │                             ▼
intake ──► awaiting_customer ──► customer_active ──► quote_ready ──► submitting
                                                          │              │
                                                          ▼              ▼
                                                      ineligible    waterfall_running
                                                                         │
                                                                         ▼
                                                              awaiting_counter_decision
                                                                         │
                                                          ┌──────────────┼──────────────┐
                                                          ▼              ▼              ▼
                                                      selected       declined       (back to
                                                                                   waterfall_running
                                                                                   on refuse)

withdraw can fire from any non-terminal state and lands in: withdrawn
```

## Terminal states

Five terminal states: `selected`, `declined`, `ineligible`, `withdrawn`, `complete`. Once the case enters any of these, no further state transitions happen. The chat is locked, the audit log records the outcome, and the case is closed.

See [Withdraw and outcomes](/product/withdraw-and-outcomes/) for the customer-facing semantics.

## How transitions happen

Every transition is in [`applyEvents`](https://github.com/bgood11/lending-agent/blob/main/lib/server-store.ts) in `lib/server-store.ts`. The function is a switch over event types, with each case mutating `s.case` synchronously.

Example, the eligibility transition:

```ts
case "record_eligibility": {
  const data = evt.data as Omit<EligibilityFacts, "capturedAt">;
  const allPass = data.isOver18 && data.isUkResident
                  && data.isHomeowner && data.isEmployed;
  s.case.eligibility = { ...data, capturedAt: now };
  s.case.status = allPass ? "quote_ready" : "ineligible";
  break;
}
```

Three properties of every transition:

1. **Synchronous and pure.** No async, no I/O. Just a state mutation.
2. **Idempotent where it matters.** Re-applying the same event doesn't break things.
3. **No model involvement.** The model's output can produce events, but the transition itself is decided by case state and the event payload, not by model judgement.

## Reconciliation, not transition

Some "transitions" don't fit cleanly into a single event. Example: when consent is granted, three things should happen:

1. The consent record is added.
2. The linked disclosure (`credit_search_consent`) is acknowledged.
3. The next disclosure (`pre_contract_summary`) is presented.

Only (1) is a direct effect of the `capture_consent` event. (2) and (3) are consequences. They live in [`reconcileSession()`](/architecture/reconciliation/), not in `applyEvents`.

The discipline is: `applyEvents` does ONE thing per event. Cross-cutting consequences live in reconciliation. This makes the state machine readable.

## Status as a UI signal

The customer page reads `caseState.status` to decide what to render:

- `intake` / `awaiting_customer` → loading state
- `customer_active` and earlier disclosures presented → render whichever card matches the next gate
- `quote_ready` → render quote configurator
- `submitting` → render "submitting your application…" placeholder
- `waterfall_running` → render the WaterfallProgress component animating
- `awaiting_counter_decision` → render the CounterOfferCard
- `selected` → render the OfferCard with `selected` style
- `declined` → render the DeclineNarrative component
- `ineligible` → render the ineligible-path card
- `withdrawn` → render the paused-state card

Status is a coarse signal. The customer page also looks at finer-grained state (which disclosures are presented but not acknowledged, what the waterfall result is, etc.) to decide what to show next.

## Why a state machine

The alternative would be deriving "what should the UI show" from the chat history. That works but is fragile: it requires re-deriving on every render, requires the chat history to be authoritative, and breaks when the chat history is incomplete or noisy.

A state machine is more boring, but: it's the same on every read, it's testable, it's serialisable (which is what enables the [seed pattern](/architecture/cold-start-recovery/)), and it's what an audit reviewer wants to read.

See [Reconciliation](/architecture/reconciliation/) for how stuck cases get unstuck.
