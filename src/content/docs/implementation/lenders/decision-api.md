---
title: Decision API and adapter
description: The LenderAdapter interface, sync vs async patterns, mTLS, rate limiting, and how a lender's existing decision API is wrapped for a broker panel.
---

This page is the lender's integration cookbook. It covers the `LenderAdapter` contract, how a typical lender wraps their existing decision API behind it, authentication and rate-limiting choices, and the synchronous-versus-asynchronous question that comes up on every integration.

## Demo vs production shape

A note up front: this page describes the production-shape `LenderAdapter`. The demo's `runWaterfall` in `lib/decision-engine.ts` is synchronous and operates on a hard-coded `LenderProfile[]` array; there is no `LenderAdapter` interface in the repo today. The production adapter shape below is a forward-looking design, validated against the contract `runWaterfall` exposes (give it a `caseState`, get back a `WaterfallResult`).

When you replace the simulated panel with real lenders, three things change at once:

- `runWaterfall` becomes `async` and `await`s each adapter's `decide` call.
- The hard-coded `LENDERS` array becomes a panel definition loaded from configuration.
- `simulateLenderResponse` is replaced by per-lender adapter modules.

The case state, the reconciliation rules, and the audit shape do not change.

## The `LenderAdapter` contract

The broker calls a small interface per lender:

```ts
interface LenderAdapter {
  /** Display name; appears in waterfall step records and audit log. */
  name: string;

  /** Position on the broker panel, set by commercial agreement. */
  position: "Prime Priority 1" | "Prime Priority 2" | "Sub-Prime 1" | string;

  /** Product code; used for routing and panel filtering. */
  productCode: string;

  /**
   * Decision the application. Returns one of three outcomes (cross-link
   * /implementation/lenders/waterfall-protocol/). Composes the offer body
   * for approved/counter outcomes.
   */
  decide(application: ApplicationPayload): Promise<WaterfallStepOutcome>;
}

type WaterfallStepOutcome =
  | { kind: "approved_as_requested"; offer: Offer }
  | { kind: "approved_with_counter"; offer: Offer; reason?: string }
  | { kind: "declined"; reason: string };
```

Every lender on the broker's panel has an adapter implementation. The adapter's job is to translate between the broker's structured payload and the lender's wire format.

## Wrapping a typical lender API

A typical lender's decision API is an HTTPS endpoint that accepts a credit application in their own JSON shape and returns a decision. The adapter is a thin module that:

1. Translates the broker's `ApplicationPayload` into the lender's request shape.
2. Authenticates and calls the lender's endpoint.
3. Parses the lender's response.
4. Translates back to a `WaterfallStepOutcome`.
5. Composes the `Offer` body for approval outcomes.

Sketch:

```ts
import { ApplicationPayload, WaterfallStepOutcome, Offer } from "../types";

export const ThisBankAdapter: LenderAdapter = {
  name: "This Bank",
  position: "Prime Priority 2",
  productCode: "IBC",

  async decide(application: ApplicationPayload): Promise<WaterfallStepOutcome> {
    const body = buildThisBankRequest(application);

    const res = await fetch("https://api.thisbank.example.com/v1/decisions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${await getAccessToken()}`,
        "X-Idempotency-Key": application.applicationId,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new AdapterError(`This Bank returned ${res.status}`);
    }

    const decision = (await res.json()) as ThisBankDecision;
    return mapDecisionToOutcome(decision, application);
  },
};

function mapDecisionToOutcome(
  d: ThisBankDecision,
  app: ApplicationPayload
): WaterfallStepOutcome {
  if (d.outcome === "decline") {
    return { kind: "declined", reason: d.reason ?? "This Bank declined." };
  }
  const offer = composeOffer(d, app);
  const matchesRequested =
    Math.abs(offer.aprPct - app.requested.indicativeAprPct) < 0.01 &&
    offer.termMonths === app.requested.termMonths;
  return matchesRequested
    ? { kind: "approved_as_requested", offer }
    : { kind: "approved_with_counter", offer, reason: d.reason };
}
```

This adapter lives in the broker's codebase, not the lender's. The lender's existing decision API is unchanged; the adapter is the integration glue.

## Synchronous vs asynchronous decisioning

Most consumer credit decision APIs are synchronous: the broker calls, the lender decides, the broker gets a response within seconds. The waterfall is built for this.

Some lenders run asynchronous pipelines: the broker submits, the lender accepts and queues, and the decision arrives later via webhook. This is more complex.

Both are accommodated, but synchronous is cleaner.

### Synchronous

The adapter's `decide` function awaits the lender's response and returns a `WaterfallStepOutcome`. The broker's per-step timeout is 60 seconds; lenders that respond within that budget work without further plumbing. Real-world response times are typically 2 to 15 seconds.

### Asynchronous

The adapter's `decide` function submits the application and returns a `pending` outcome. The broker treats `pending` as a non-decision and pauses the waterfall. When the lender's decision webhook arrives, the broker resumes:

```
broker          adapter         lender
  │                │               │
  │── decide ─────▶│── submit ────▶│
  │                │               │
  │◀── pending ────│◀── 202 ────── │
  │                                │
  (waterfall paused, customer told  │
   "we're hearing back from the     │
   lender, this can take a moment") │
                                   │
  │◀────────── webhook(decision) ──│
  │                                 
  (resume waterfall with the
   received decision)
```

The asynchronous pattern requires the broker to grow a `pending` waterfall outcome, a webhook receiver per asynchronous lender, and customer-facing UI for the wait state. It is operationally heavier; prefer synchronous.

In practice, the waterfall is patient enough for most lender response times. A 30-second decision is fine; the agent narrates the wait.

## Authentication

Three viable patterns, in order of preference:

### mTLS

The lender issues a client certificate to the broker. Every request carries the certificate at the TLS layer. The lender's API is configured to require client certificates and to bind requests to the certificate's identity.

Pros: strongest authentication, no shared secrets in flight, certificate rotation is independent of code change.

Cons: operational complexity, certificate management infrastructure required, TLS proxies need to support pass-through.

### OAuth 2.0 client credentials

The broker exchanges a client id and client secret for a short-lived access token, presents the token as a Bearer credential.

Pros: simpler than mTLS, well-supported tooling, standard rotation patterns.

Cons: secrets management still required, token caching has to be implemented carefully (see below).

### HMAC-signed requests

The broker signs every request body with a shared secret using HMAC-SHA256. The lender verifies the signature.

Pros: simplest. No tokens, no certificates.

Cons: requires secret distribution and rotation, less tooling support.

The recommended default is OAuth 2.0 with mTLS layered on top for higher-stakes decisions. Token caching: cache the access token until 60 seconds before its expiry. Multiple concurrent decision requests should share a cached token; race the refresh into a single critical section.

## Rate limiting

The broker implements client-side rate limiting per adapter. Defaults:

- 10 requests per second per lender, burst 50.
- Token-bucket implementation with per-lender state.
- Excess requests queue up to a max wait of 30 seconds; beyond that, the broker treats the request as `unavailable` and continues the waterfall.

The lender's server-side rate limit is independent. Honour the lender's `Retry-After` headers; back off and retry up to two times within the per-step timeout.

## Idempotency

The broker passes an `applicationId` (the same as `X-Idempotency-Key` if the lender uses that pattern) on every decision request. The lender returns the same decision for the same `applicationId` if asked twice within an idempotency window (typically 24 hours). This protects against retries on network errors.

## Error handling

The adapter classifies lender responses into three buckets:

| Lender response | Adapter action |
|---|---|
| 2xx with a parseable decision | Map to outcome |
| 4xx for application-shape errors (e.g. missing field) | Throw `AdapterError`; broker's panel handler treats as `unavailable` and alerts |
| 4xx for auth errors | Throw `AdapterError`; broker's panel handler treats as `unavailable`, refreshes credentials, alerts |
| 5xx | Retry once with exponential backoff; if still 5xx, treat as `unavailable` |
| Network timeout (within per-step budget) | Retry once; if still timeout, treat as `unavailable` |
| Network timeout (beyond per-step budget) | Treat as `unavailable` immediately |

`unavailable` is a fourth `WaterfallStepOutcome` variant the broker should add for production (cross-link to [/implementation/brokers/lender-panel/](/implementation/brokers/lender-panel/)). The customer-facing UI does not surface lender unavailability by name; the agent narrates "we couldn't reach all of our lenders today" if multiple are unavailable.

## Counter-offer composition

The adapter composes the counter-offer body. The lender's API typically returns approval terms as raw fields (rate, term, monthly, total). The adapter wraps these into the broker's `Offer` shape, including a stable `id`. The broker does not alter the offer terms.

Cross-link to [/implementation/lenders/counter-offers/](/implementation/lenders/counter-offers/) for the customer-facing presentation. The adapter's responsibility is to ensure the offer body is internally consistent: `monthlyPayment * termMonths` should equal `totalPayable` to within a penny rounding, and `aprPct` should reflect the actual rate the lender will charge.

## Adapter testing

Each adapter ships with three test types:

1. **Contract tests.** Assert the adapter's `decide` function for representative inputs returns the expected `WaterfallStepOutcome` shape. Use recorded fixtures from a sandbox lender environment.
2. **Resilience tests.** Inject network failures, slow responses, malformed payloads. Assert the adapter degrades to `AdapterError` cleanly without leaking partial state.
3. **End-to-end tests.** Run the full waterfall against a panel of three test adapters (one approves, one counters, one declines) and assert the case state at each step.

The adapter is the single highest-risk piece of broker code. Test it accordingly.

## Operational metrics per adapter

The broker tracks per-adapter:

- Decision request rate, success rate, error rate.
- Decision latency (p50, p95, p99).
- Approval rate (approved_as_requested + approved_with_counter) over total decisions.
- Counter-offer rate (counter / approved).
- Counter acceptance rate (acceptances / counters).
- Token refresh rate, mTLS handshake failure rate.

These feed into commercial conversations with the lender (panel reordering, term renegotiation) and into operational alerts (latency regressions, auth failures).

## See also

- [/implementation/lenders/waterfall-protocol/](/implementation/lenders/waterfall-protocol/) for the wire payload.
- [/implementation/lenders/counter-offers/](/implementation/lenders/counter-offers/) for offer composition.
- [/implementation/brokers/lender-panel/](/implementation/brokers/lender-panel/) for the broker-side waterfall.
- [/architecture/mock-vs-real/](/architecture/mock-vs-real/) for the demo's mock implementation that the adapters replace.
