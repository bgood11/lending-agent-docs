---
title: Waterfall protocol (lender view)
description: What a lender receives on the wire, what they don't, the three response shapes, and the implications of sequential calling.
---

This page is for lenders integrating into a Lending Agent panel. It describes the wire-level contract between the broker and the lender: what arrives at your decision endpoint, what response shapes the broker accepts, and how sequential calling shapes your relationship with the application stream.

## What you receive

On the wire, you receive a structured Information Request payload. The shape (a stable contract; the broker maintains it):

```ts
interface ApplicationPayload {
  applicationId: string;             // unique per submission to your panel position
  brokerCaseId: string;              // broker-side case identifier (== sessionId)
  productCode: string;               // e.g. "IBC" for unregulated home-improvement credit
  retailerName: string;              // the introducer
  submittedAt: string;               // ISO timestamp

  // Project (the thing being financed)
  project: {
    projectValue: number;            // £ pence-rounded
    depositAmount: number;
    netLoanAmount: number;
    productSpec: "panels_only" | "panels_battery" | "battery_only" | string;
    systemKwp?: number;
    systemBatteryKwh?: number;
  };

  // Requested terms (the customer's quote)
  requested: {
    amount: number;
    termMonths: number;
    indicativeAprPct: number;
    monthlyPayment: number;
  };

  // Eligibility (the four-gate intake)
  eligibility: {
    isOver18: true;
    isUkResident: true;
    isHomeowner: true;
    isEmployed: true;
    capturedAt: string;
  };

  // Personal facts
  personal: {
    fullName: string;
    dateOfBirth: string;             // YYYY-MM-DD
    addressLine1: string;
    addressLine2?: string;
    town: string;
    postcode: string;
    propertyType: string;
    residentialStatus: string;
  };

  // Financial facts
  financial: {
    employmentStatus: string;
    annualIncome: number;
    monthlyOutgoings: number;
    existingCommitments: number;
  };

  // Consents and disclosures
  consents: Array<{
    type: "credit_search" | string;
    granted: true;
    capturedAt: string;
  }>;
  disclosuresAcknowledged: Array<{
    id: string;
    version: number;
    presentedAt: string;
    acknowledgedAt: string;
  }>;

  // Vulnerability summary
  vulnerability: {
    probed: true;
    indicatorCount: number;          // count, not the items themselves
  };
}
```

This is the entire wire payload. It is structured, predictable, and small.

## What you do not receive

Important by what is absent:

- **The chat transcript.** You do not see the conversation between the customer and the agent. The application is stripped to its decisionable facts.
- **The vulnerability free-text note.** The customer's own words about their circumstances are held by the broker, not transmitted. You receive the count of indicators flagged (zero or more), not the indicators themselves and not the note.
- **Replay scores.** The broker's compliance posture (replay pass rates, audit completeness) is between the broker and the FCA. You do not see it.
- **Other lenders' decisions.** Sequential calling means you are decisioning without knowledge of what an upstream lender said. This is intentional; cross-link to [/implementation/brokers/lender-panel/](/implementation/brokers/lender-panel/).

The minimisation is not an oversight. Cross-link to [/implementation/lenders/data-minimisation/](/implementation/lenders/data-minimisation/) and [/privacy/data-minimisation/](/privacy/data-minimisation/) for the GDPR Article 5(1)(c) framing. From the lender's perspective the small surface is also a feature: less PII to handle, less data to retain, smaller compliance footprint.

## Three response shapes

The broker accepts exactly three response shapes:

### `approved_as_requested`

You can lend at the customer's requested terms. The offer body must match the requested amount and term; the APR may match the requested rate or be lower (a discount is acceptable).

```json
{
  "kind": "approved_as_requested",
  "offer": {
    "id": "offer_thisbank_120_<applicationId>",
    "lender": "This Bank",
    "position": "Prime Priority 2",
    "productCode": "IBC",
    "aprPct": 11.4,
    "termMonths": 120,
    "monthlyPayment": 152.34,
    "totalPayable": 18280.80,
    "netLoanAmount": 12500
  }
}
```

### `approved_with_counter`

You can lend, but only at terms different from the requested terms. Most commonly: a higher APR, a longer term, or a different monthly payment.

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
  "reason": "Counter-offered at a longer term to bring monthly payment in line with affordability."
}
```

The customer sees the counter terms alongside the requested terms in an explicit accept/decline card. Cross-link to [/implementation/lenders/counter-offers/](/implementation/lenders/counter-offers/) for the mechanics and the customer-facing presentation.

### `declined`

You will not lend at any terms.

```json
{
  "kind": "declined",
  "reason": "Affordability sits below the threshold for this profile."
}
```

The reason is recorded in the audit log and may be summarised to the customer. The broker's UI does not surface the literal reason verbatim by default; it summarises across the panel ("none of our lenders could offer terms today, here are some things you could try"). The lender's verbatim reason is preserved in the audit log for compliance and for any subsequent complaint handling.

## Sequential calling: implications

The broker calls lenders in priority order. Your position on the panel is set by the broker's commercial agreement and the customer's product (it is **not** dynamically reordered per case). For each application:

- If you are at position 1, you see every application that gets to submission.
- If you are at position 2, you see every application that the position-1 lender declined.
- If you are at position N, you see every application that positions 1 to N-1 declined.

There is no information leakage about why upstream lenders declined. You see only that you are being asked.

The customer's "try the next lender" pathway means you can also receive an application that an upstream lender approved with a counter, but the customer chose to push past it. In that case you have the same payload, with no indication that an upstream counter was offered. Decision the application on its own merits; the customer's choice to continue is not a signal you should weight.

## Latency budget

The waterfall is patient. The broker waits for your synchronous response within a generous budget (60 seconds is the default per-step timeout). The customer-side UI shows a "checking with [lender name]" state while you decision. After 60 seconds, the broker treats it as `unavailable` and continues to the next lender; cross-link to [/implementation/brokers/lender-panel/](/implementation/brokers/lender-panel/) on failure handling.

In practice, real lender APIs respond in single-digit seconds. The 60-second budget exists for the cases where your internal credit search times out and you need to decide between a fast decline and a slower full check; lean to the full check. The customer's attention is held by the agent.

## Authentication

The broker authenticates to your decision API using the credentials your integration team provides. mTLS is the recommended pattern for any lender that supports it; otherwise OAuth 2.0 client credentials with rotated secrets. Cross-link to [/implementation/lenders/decision-api/](/implementation/lenders/decision-api/) for the operational details.

The broker signs every outbound request body with HMAC-SHA256 over a per-lender shared secret in addition to TLS, transmitted in `X-Broker-Signature`. This is belt and braces; reject any request whose signature does not match.

## Idempotency

Decision requests carry an `applicationId` that uniquely identifies the broker's submission to your panel position. If you receive the same `applicationId` twice (network retry on the broker's side), return the same decision. Maintain a short-lived idempotency table keyed by `applicationId`.

## Volume expectations

A new broker partner typically starts at single-digit applications per day, scales to tens per day inside a quarter, and to hundreds per day at full network distribution. Plan for 100x your initial volume; the broker's expansion follows its retailer-network growth.

## See also

- [/implementation/brokers/lender-panel/](/implementation/brokers/lender-panel/) for the broker-side waterfall implementation.
- [/implementation/lenders/decision-api/](/implementation/lenders/decision-api/) for adapter mechanics.
- [/implementation/lenders/data-minimisation/](/implementation/lenders/data-minimisation/) for what is and is not on the wire.
- [/regulatory/conc/](/regulatory/conc/) for the consumer credit framing.
