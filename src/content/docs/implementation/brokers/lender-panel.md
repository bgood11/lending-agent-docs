---
title: Lender panel and the waterfall protocol
description: How sequential lender calling works, the swap-out boundary for real lender adapters, and the state machine for waterfall progression.
---

The lender panel is the broker's most operationally important asset. Lending Agent treats it as a sequential waterfall: the application is presented to lenders in priority order, the first acceptable response wins, and the customer can elect to push past a counter-offer to try the next lender. This page documents the protocol, the swap-out boundary in the code, and the state machine the broker has to implement.

## The waterfall in the demo

In the demo (`lib/decision-engine.ts`), the panel is a hard-coded array of three lender profiles:

```ts
const LENDERS: LenderProfile[] = [
  { name: "BNP Paribas", position: "Prime Priority 1", productCode: "IBC",
    minAmount: 2000, maxAmount: 25000, minTerm: 36, maxTerm: 180,
    baseAprPct: 9.9, amountAprStep: { per: 5000, bps: -25 } },
  { name: "This Bank", position: "Prime Priority 2", productCode: "IBC",
    minAmount: 1000, maxAmount: 50000, minTerm: 24, maxTerm: 180,
    baseAprPct: 11.4, amountAprStep: { per: 5000, bps: -20 } },
  { name: "Propensio", position: "Sub-Prime 1", productCode: "IBC",
    minAmount: 1000, maxAmount: 20000, minTerm: 24, maxTerm: 120,
    baseAprPct: 18.9, amountAprStep: { per: 5000, bps: -10 } },
];
```

`runWaterfall` walks this array from `fromIndex`, simulating a lender response per step, and stops on the first non-decline. The signature is:

```ts
interface RunWaterfallInput {
  caseState: CaseState;
  fromIndex?: number;
  scenario?: DemoScenario; // "auto" | "clean" | "counter" | "decline"
}

export function runWaterfall(input: RunWaterfallInput): WaterfallResult;
```

The `fromIndex` parameter is the load-bearing piece. When the customer refuses a counter-offer (the `refuse_counter_offer` event), the route handler runs the waterfall again with `fromIndex` advanced past the refused step, picking up where it left off rather than restarting.

## The production swap-out

`runWaterfall` is the swap-out boundary. The function's contract is:

> Given a case state and a starting index, return a `WaterfallResult` that records the lender steps in order, ending either with the first non-decline (approved at requested terms or approved with a counter) or with all lenders exhausted.

Any production deployment replaces the simulated lender response with a real lender adapter call. The shape of an adapter:

```ts
interface LenderAdapter {
  name: string;
  position: "Prime Priority 1" | "Prime Priority 2" | "Sub-Prime 1" | string;
  productCode: string;

  /**
   * Decide on an application. The adapter is responsible for translating
   * the broker's structured Information Request into the lender's wire
   * format, calling the lender's decision endpoint, and translating the
   * response back into a WaterfallStepOutcome.
   */
  decide(application: ApplicationPayload): Promise<WaterfallStepOutcome>;
}

type WaterfallStepOutcome =
  | { kind: "approved_as_requested"; offer: Offer }
  | { kind: "approved_with_counter"; offer: Offer; reason?: string }
  | { kind: "declined"; reason: string };
```

`ApplicationPayload` is the structured Information Request: project facts, eligibility, requested quote, personal facts, financial facts, and consent timestamps. Crucially, it is **not** the chat transcript and **not** the vulnerability free-text note (see [/implementation/lenders/data-minimisation/](/implementation/lenders/data-minimisation/) and [/privacy/data-minimisation/](/privacy/data-minimisation/)).

The replacement of `runWaterfall` then looks like:

```ts
export async function runWaterfall(input: RunWaterfallInput): Promise<WaterfallResult> {
  const { caseState, fromIndex = 0 } = input;
  const quote = caseState.provisionalQuote;
  if (!quote) throw new Error("runWaterfall called without a provisional quote");

  const adapters = await loadAdapters(caseState.product.productCode);
  const application = buildApplicationPayload(caseState);
  const steps: WaterfallStep[] = [...(caseState.waterfall?.steps ?? [])];

  for (let i = fromIndex; i < adapters.length; i++) {
    const outcome = await adapters[i].decide(application);
    steps.push({ lender: adapters[i].name, position: adapters[i].position, outcome });
    if (outcome.kind !== "declined") {
      return {
        requestedQuote: quote,
        steps,
        awaitingCounterDecision: outcome.kind === "approved_with_counter",
        acceptedOffer: outcome.kind === "approved_as_requested" ? outcome.offer : undefined,
        exhausted: false,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  return {
    requestedQuote: quote, steps,
    awaitingCounterDecision: false, acceptedOffer: undefined, exhausted: true,
    updatedAt: new Date().toISOString(),
  };
}
```

The `WaterfallResult` shape stays identical. Everything downstream (the audit log, the customer-facing waterfall card, the counter-decision UI) keeps working unchanged.

## Sequential, not parallel

The waterfall is intentionally sequential. The case for parallel:

- Lower latency to first approval.
- More efficient use of customer attention.

The case against (which is the case the demo takes):

- **Soft credit search inflation.** Every lender call costs a soft search. Parallel calling triples the search count for cases the first lender approves.
- **Information asymmetry.** Once two lenders have looked, you have implicit information about the second's view that the first did not see. Sequential keeps the price formation honest.
- **Customer narrative.** "This Bank approved at a different rate than the indicative quote, do you want to take it or try the next lender?" is a coherent question. "Three lenders responded simultaneously, which one do you want?" makes the customer choose without context.
- **Operational simplicity.** A sequential waterfall has a linear state machine. A parallel one has to merge results, handle partial failures, and decide what to surface when one returns approve and another returns decline.

The narrative argument is the strongest. The demo's UI flows out of the sequential narrative.

## State machine

The case status (`CaseState.status`) progresses through a small set of waterfall-related states:

```
intake
   ▼
awaiting_customer
   ▼
customer_active
   ▼
quote_ready
   ▼
submitting ────▶ waterfall_running ───────────────┐
                       │                          │
                       ├─ first lender approved   │
                       │  at requested terms      │
                       │       ▼                  │
                       │   selected               │
                       │                          │
                       ├─ first lender approved   │
                       │  with counter            │
                       │       ▼                  │
                       │   awaiting_counter_decision
                       │       │                  │
                       │       ├─ accept_counter_offer
                       │       │       ▼          │
                       │       │   selected       │
                       │       │                  │
                       │       └─ refuse_counter_offer
                       │             ▼            │
                       │      (waterfall_running, fromIndex++)
                       │                          │
                       └─ all lenders declined ───┤
                                                  ▼
                                              declined
```

`submitting` is a transient state; the route handler sets it on the `submit_application` event, then immediately calls `runWaterfall`, then calls `setWaterfall` which transitions to one of `waterfall_running`, `awaiting_counter_decision`, `selected`, or `declined` depending on the outcome.

`refuse_counter_offer` clears the awaiting flag in the case store and then re-runs the waterfall with `fromIndex` advanced. The audit log records the refusal as a structured event and the waterfall step list grows by one (or more) on the next run.

## Counter-offer mechanics

A counter-offer is approval at terms different from the requested quote. The customer sees an explicit card with the counter terms, the requested terms for comparison, and two buttons: accept this counter, or try the next lender.

This is the demo's most-loaded UX choice. Cross-link to [/implementation/lenders/counter-offers/](/implementation/lenders/counter-offers/) for the lender-side view of the same mechanic.

The relevant case-state pieces:

- `caseState.waterfall.requestedQuote`: what the customer asked for.
- `caseState.waterfall.steps[i].outcome`: the per-step outcome including the counter offer body.
- `caseState.waterfall.awaitingCounterDecision`: whether the UI should show the counter card.
- `caseState.waterfall.acceptedOffer`: set on `accept_counter_offer`.

After acceptance, the audit log records both the counter offer and the customer's choice. After refusal, the audit log records the refusal and the next waterfall step kicks off.

## Adapter loading

`loadAdapters(productCode)` is broker-internal. Most production deployments will:

1. Load the panel definition (which lenders are active, in what priority order, for what product code) from a config table.
2. Look up each lender's adapter implementation, typically a thin module per lender that knows the lender's API auth, request shape, and response shape.
3. Return the adapter array in priority order.

Adapter changes (a new lender, a re-prioritisation, a temporary suspension) should be config changes, not code changes. The broker's commercial team should be able to suspend a lender from the panel without a deploy.

## Failure handling

What if a lender adapter throws? Three reasonable choices:

1. **Treat as decline.** Log the error, continue the waterfall. Simple but loses information about whether the lender genuinely declined or was unavailable.
2. **Treat as skip.** Mark the step as `unavailable`, continue to the next lender. Surface the unavailability in the audit log but not to the customer.
3. **Treat as fatal.** Fail the whole journey, surface a "we couldn't reach our lenders" error to the customer.

The recommended pattern is (2). Mark the step `unavailable`, continue, and track adapter availability over time as an operational metric. If a lender's adapter availability falls below a threshold, alert the broker's on-call. The customer journey continues; the operational issue surfaces to humans.

The `WaterfallStepOutcome` union should grow a fourth variant for this: `{ kind: "unavailable"; reason: string }`. Audit it; treat it as a non-decline for the purpose of the next iteration's `fromIndex`.

## See also

- [/architecture/decision-engine/](/architecture/decision-engine/) for the demo implementation.
- [/implementation/lenders/decision-api/](/implementation/lenders/decision-api/) for the lender-side adapter contract.
- [/implementation/lenders/counter-offers/](/implementation/lenders/counter-offers/) for counter-offer composition.
- [/regulatory/conc/](/regulatory/conc/) for the consumer credit obligations the panel has to satisfy.
