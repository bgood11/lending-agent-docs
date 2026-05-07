---
title: Integration patterns for retailers
description: Webhooks, SMS link generation, CRM sync, idempotency, and what to do when a customer never opens the link.
---

This page describes how a retailer wires Lending Agent into their existing systems. The goal is a thin, idempotent integration that keeps the retailer's CRM as the customer system-of-record while the broker owns the regulated finance journey.

## Anchor: the `case_outcome` webhook

The single most important integration is the `case_outcome` webhook. Every Lending Agent case ends in exactly one terminal outcome. The broker emits a webhook to the retailer's configured endpoint when that outcome is recorded.

Outcomes mirror the `caseOutcome.kind` field on `CaseState` (see `lib/types.ts`):

- `selected`: the customer accepted an offer, either at requested terms or at counter terms.
- `declined`: every lender on the panel turned the application down. The agent will have surfaced suggested actions (smaller amount, longer term, free debt advice).
- `withdrawn`: the customer chose to leave the journey. The reason is captured if they offered one.
- `ineligible`: the customer failed the four-gate eligibility check (over 18, UK resident, homeowner, employed).
- `completed`: a non-finance terminal state (rare in practice; reserved for cases that finished without a credit decision being needed).

Example payload:

```json
{
  "event": "case_outcome",
  "deliveredAt": "2026-05-07T10:14:22.118Z",
  "sessionId": "8a4f...d09c",
  "retailerName": "Sunhaven Solar",
  "case": {
    "outcome": "selected",
    "selectedOffer": {
      "lender": "This Bank",
      "aprPct": 11.4,
      "termMonths": 120,
      "monthlyPayment": 152.34,
      "totalPayable": 18280.80,
      "netLoanAmount": 12500
    },
    "project": {
      "projectValue": 14000,
      "depositAmount": 1500,
      "netLoanAmount": 12500,
      "productSpec": "panels_battery"
    },
    "contact": {
      "firstName": "Aisha",
      "lastName": "Rahman",
      "mobile": "+44...",
      "email": "..."
    },
    "auditUrl": "https://broker.example.com/audit/8a4f...d09c"
  },
  "delivery": {
    "id": "wh_01JE7KZ...",
    "attempt": 1
  }
}
```

The webhook is signed with HMAC-SHA256 over the raw body using a per-retailer shared secret, transmitted in `X-Broker-Signature`. Reject any request whose signature does not match.

## Subscription model

Retailers register one or more subscription endpoints. Each subscription specifies:

- A target URL (HTTPS only).
- An event filter. Most retailers want only `case_outcome`, but the broker can also emit `vulnerability_flagged` (which goes to a vulnerability queue, see [/implementation/brokers/vulnerability-process/](/implementation/brokers/vulnerability-process/)) and `journey_started` (when the customer first opens the SMS link).
- A signing secret.
- Optional retry policy overrides.

The broker retries failed deliveries with exponential backoff: 1s, 5s, 30s, 5m, 30m, 2h, 6h, 24h, 24h. After nine failures the delivery is parked in a dead-letter queue and the retailer is alerted.

## Idempotency

Webhook deliveries can be retried. The retailer's handler must be idempotent on `delivery.id`. The simplest pattern is a database table:

```sql
CREATE TABLE webhook_deliveries (
  delivery_id text PRIMARY KEY,
  session_id text NOT NULL,
  event_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
```

On receipt:

```ts
async function handleWebhook(req: Request) {
  const payload = await verifySignature(req);
  const inserted = await db.query(
    `INSERT INTO webhook_deliveries (delivery_id, session_id, event_type)
     VALUES ($1, $2, $3) ON CONFLICT (delivery_id) DO NOTHING RETURNING delivery_id`,
    [payload.delivery.id, payload.sessionId, payload.event]
  );
  if (inserted.rowCount === 0) {
    return new Response("ok", { status: 200 }); // already processed
  }
  await processOutcome(payload);
  return new Response("ok", { status: 200 });
}
```

Return `2xx` only after the side effect (CRM write) has succeeded, so the broker knows whether to retry.

## SMS link generation

The agent emits a `generate_customer_link` event when the installer-side intake completes. The broker turns that into a customer-facing URL (typically `https://broker.example.com/c/<sessionId>?seed=<base64url>`). The seed is the portable case state described in `lib/server-store.ts:buildCaseSeed`, which is what makes the journey resilient to cold starts on serverless infrastructure.

The broker can either:

1. **Send the SMS itself.** Simpler for the retailer; the broker becomes the message originator. Requires the retailer to forward consent for marketing-adjacent communications via their existing channel.
2. **Hand the URL back to the retailer.** The retailer's existing SMS pipeline (Twilio, MessageBird, or CRM-native) sends the message under the retailer's sender ID. This is the more common pattern for retailers with established customer comms.

Pattern 2 looks like this:

```http
POST /webhooks/customer-link HTTP/1.1
X-Broker-Signature: ...
Content-Type: application/json

{
  "event": "customer_link_ready",
  "sessionId": "8a4f...",
  "url": "https://broker.example.com/c/8a4f...?seed=...",
  "contact": {
    "firstName": "Aisha",
    "mobile": "+447..."
  },
  "smsTemplate": "Hi {{firstName}}, here's your finance link from {{retailerName}}: {{url}}"
}
```

The retailer's SMS service interpolates `firstName`, `retailerName`, and `url`, then sends. The retailer's compliance team owns the SMS template wording and any opt-in evidence.

## CRM sync over the same webhook

The webhook payload carries enough state to update any reasonable CRM. Map fields once per CRM and reuse:

| `case_outcome` field            | HubSpot               | Salesforce            | Pipedrive               |
|---------------------------------|-----------------------|-----------------------|-------------------------|
| `case.outcome`                  | `deal.dealstage`      | `Opportunity.StageName` | `deal.stage_id`        |
| `case.selectedOffer.lender`     | `deal.finance_lender` | custom field          | custom field            |
| `case.selectedOffer.monthlyPayment` | `deal.finance_monthly` | custom field      | custom field            |
| `case.outcome === "withdrawn"` triggers | reactivation task | reactivation task   | reactivation activity   |

Build the CRM mapping inside the webhook receiver, not inside the broker. The broker should have no opinion about which CRM you use.

## Rate limiting

The broker rate-limits its outbound webhooks per retailer subscription: typically 50 requests per second per endpoint, burst 200. If the retailer's endpoint cannot keep up, the broker queues. If the queue grows beyond a threshold (1000 pending) the broker pages the retailer's on-call.

## What happens if the customer never opens the link

A meaningful share of customers will not open the SMS within the day. The agent has no way to push the journey forward without the customer present. The current build emits no outbound events while a session sits idle, but a production deployment should:

- Emit `journey_idle` after configurable thresholds (24h, 72h, 7 days). The retailer's reactivation playbook decides what to do with each.
- Surface the same data on the broker's audit page so a human can review (see [/implementation/brokers/audit-integration/](/implementation/brokers/audit-integration/)).
- Let the retailer reissue the link via the same `customer_link_ready` webhook (re-sending the same URL is safe; the seed is content-addressed by `sessionId`).

A practical reactivation cadence: SMS reminder at 48h, retailer phone-call task at 5 days, mark stale at 14 days.

## Error handling: what the receiver should refuse

The receiver should reject (`4xx`):

- Requests with an invalid HMAC signature.
- Requests older than 5 minutes (clock skew protection; the broker timestamps each delivery).
- Payloads whose `sessionId` is unknown to the retailer (a defence against cross-tenant injection).

The receiver should accept and 5xx (so the broker retries):

- Transient database failures.
- Downstream CRM API timeouts.

The receiver should accept and 2xx without side effects:

- Duplicate deliveries (idempotency check fired).

This separation keeps the broker's retry behaviour predictable without leaking transient retailer-side issues into the audit log.

## See also

- [/architecture/case-state/](/architecture/case-state/) for the underlying `CaseState` shape.
- [/implementation/brokers/audit-integration/](/implementation/brokers/audit-integration/) for the corresponding broker-side integration.
- [/privacy/data-minimisation/](/privacy/data-minimisation/) for what does and does not flow into the retailer's webhook payloads.
