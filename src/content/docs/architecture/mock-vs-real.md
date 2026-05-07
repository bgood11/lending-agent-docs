---
title: Mock-vs-real boundary
description: What's real in the demo, what's mocked, and where the seams are if you wanted to make this production.
---

The demo's job is to demonstrate the **structure** of an agentic credit broking journey. The structural parts are real. The parts that need a regulated counterparty (lender API, credit bureau, settlement, KYC) are mocked.

Knowing where the mock boundary is matters because it determines integration effort.

## What's real

Every file outside `lib/decision-engine.ts`. Specifically:

- **Customer journey**: every gate, every disclosure, every consent, every form, every chat turn. Real.
- **Installer surface**: voice intake (real Web Speech API), fact extraction (real Claude call), customer link generation. Real.
- **Audit log**: every event in the timeline, every disclosure timestamp, every consent record. Real.
- **Replay engine**: every replay run is a real Anthropic API call. Real.
- **State machine**: `applyEvents`, status transitions, terminal outcomes. Real.
- **Reconciliation**: all three rules. Real.
- **Event protocol**: `<agent-event>` tag parsing, direct-event dispatch. Real.
- **Cold-start recovery**: seed encoding and hydration. Real.
- **System prompts**: the agent's instructions. Real.
- **Verbatim disclosure copy**: `lib/disclosures.ts`. Real (production would have version-controlled CMS-published versions).

## What's mocked

Concentrated in [`lib/decision-engine.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/decision-engine.ts):

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

export function runWaterfall({ caseState, fromIndex, scenario }: RunWaterfallInput): WaterfallResult {
  // For each lender from fromIndex onwards:
  //   Apply rate card to the case (baseAprPct + amountAprStep tier)
  //   simulateLenderResponse decides: approve as requested, counter, or decline
  // Returns sequential results until first non-declined or exhaustion
}
```

The lender adapters, their decisioning, their counter-offer logic, their rate cards are all in this one file. Integration with real lenders would replace this.

## What's not implemented at all

Several productisation concerns sit outside the demo entirely:

| Concern | Notes |
| --- | --- |
| Real credit search APIs (Experian/TransUnion/Equifax) | Out of scope. Soft-search and full-search would be lender-side concerns. |
| KYC / identity verification | Out of scope. Would be a step before pre-contract in production. |
| AML checks | Out of scope. Sanctions screening, PEP checks. |
| Email sending | Email opt-in is recorded in case state. No email actually sent. |
| SMS sending | `generate_customer_link` doesn't actually trigger SMS. Production would. |
| Document e-signature | Customer accepting an offer ends the demo. Production would route to a signing flow. |
| Settlement and funding | The lender's job in production. |
| Customer authentication | Anyone with the customer URL can resume. Production would have at least magic-link auth. |
| Audit page authentication | Same. Audit URLs are unauthenticated in the demo. |
| Persistent storage | In-memory + URL-borne seed only. Production would be a real database. |

## The seams

Three places to swap mock for real:

### 1. Lender panel

[`lib/decision-engine.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/decision-engine.ts). The `runWaterfall` function would take a panel of `LenderAdapter` interfaces (see [Decision API](/implementation/lenders/decision-api/) for the full contract):

```ts
interface LenderAdapter {
  name: string;
  position: "Prime Priority 1" | "Prime Priority 2" | "Sub-Prime 1" | "Sub-Prime 2";
  productCode: "IFC" | "BNPL" | "IBC";
  decide(application: ApplicationPayload): Promise<WaterfallStepOutcome>;
}
```

Each lender adapter wraps your existing decision API. The waterfall calls them sequentially. Counter-offers come from the lender, not from local rate-card calculation.

See [Lender panel integration](/implementation/brokers/lender-panel/) and [Decision API adapter](/implementation/lenders/decision-api/).

### 2. Storage

[`lib/server-store.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/server-store.ts). The `Map<sessionId, ServerSession>` would be replaced with calls to a Redis or KV store:

```ts
async function ensureSession(sessionId: string): Promise<ServerSession> {
  const cached = await kv.get(`session:${sessionId}`);
  if (cached) return cached;
  const session = emptySession(sessionId);
  await kv.set(`session:${sessionId}`, session);
  return session;
}
```

The seed pattern continues to work as a recovery mechanism even with persistent storage. See [Production hardening](/deploy/production-hardening/).

### 3. Disclosure publishing

[`lib/disclosures.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/disclosures.ts). The hardcoded disclosure bodies would be served from a versioned CMS:

```ts
export async function getDisclosure(id: string): Promise<DisclosureContent> {
  return await cms.fetchDisclosure(id, { version: "current" });
}
```

The audit log records the version that was presented, not just the id. Approval workflow (legal/compliance signoff) precedes a new version going live.

See [Disclosure publishing](/implementation/brokers/disclosure-publishing/).

## Integration effort

A reference deployment for one broker, one product vertical (solar), one panel partnership: **8-12 weeks of focused work**.

| Week | Focus |
| --- | --- |
| 1-2 | Branding, copy, disclosure text, domain |
| 3-5 | Lender panel adapters (waterfall integration) |
| 6-7 | CRM webhooks + vulnerability process integration |
| 8-9 | Trust-gradient policy + broker-hosted disclosure pages |
| 10-11 | Audit log integration with existing compliance tooling |
| 12 | Pilot with 1-2 retailers, monitoring, iteration |

This is a pilot, not a v1. A v1 would also wire in real database, KYC + AML, e-signature, lender funding webhooks, settlement reconciliation.

See [Adoption path for brokers](/implementation/brokers/adoption-path/) for the broker integration story.

## What stays the same forever

The structural parts. The state machine, the reconciliation rules, the event protocol, the seed pattern, the audit and replay layers. These are the parts that would be tested, audited, and signed off once. After that, deploying for a new retailer or panel partnership is a configuration change, not a rewrite.

The bet is: the structural backbone is the hard part to get right. Once it's right, productisation is wiring.
