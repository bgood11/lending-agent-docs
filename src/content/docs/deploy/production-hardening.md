---
title: Production hardening
description: What to harden before exposing the demo to real customers and real money.
---

The demo is production-shaped, not production-ready. This page is the gap analysis.

## What to do first

Five things, in priority order:

1. Persistent storage (replace the in-memory `Map`)
2. Authentication on the audit pages
3. Real lender adapters (replace `lib/decision-engine.ts`)
4. Real disclosure publishing (replace hardcoded `lib/disclosures.ts`)
5. Replay regression in CI

## 1. Persistent storage

The demo uses an in-memory `Map<sessionId, ServerSession>` plus URL-borne seeds. This works for demos. For production, replace with a real store.

The interface to swap is in [`lib/server-store.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/server-store.ts):

```ts
ensureSession(sessionId): ServerSession
getSession(sessionId): ServerSession | undefined
appendCustomerMessage(sessionId, msg): void
appendInstallerMessage(sessionId, msg): void
applyEvents(sessionId, events): CaseState
setWaterfall(sessionId, w): CaseState
```

These six functions are the boundary. Everything else reads through them.

A reasonable swap:

- **[Vercel KV / Upstash Redis](https://vercel.com/docs/storage/vercel-kv)** for case state and message history. Sub-millisecond latency, Vercel-native.
- **Postgres** for the audit log (long retention, query-friendly).

The seed pattern continues to work as a recovery mechanism even with a primary store. It becomes a defensive fallback, not the source of truth.

See [Cold-start recovery](/architecture/cold-start-recovery/) for the seed pattern's privacy implications. With a real store, the seed should be encrypted (the demo doesn't bother).

## 2. Authentication

**The audit page is unauthenticated in the demo.** Anyone with a session ID can view full case state including PII. This is a deliberate demo trade-off; in production it must change.

What to add:

- **Customer surface**: magic-link auth on the customer URL. The customer receives the URL by SMS; opening it sends a one-time code to their email or to their phone for a re-auth check. The seed pattern stays in the URL but is encrypted.
- **Audit dashboard**: behind broker SSO with role-based access. Compliance reviewers see anonymised data by default; raw PII requires elevated permission.
- **Installer surface**: behind retailer SSO. The installer is a known user; treat the installer ID as part of the case provenance.
- **Broker handoff page**: trust-gradient depends on this being a controlled surface; harden authentication accordingly.

Vercel supports several auth integrations: NextAuth, Clerk, Auth0, Workos. Pick what fits the existing identity stack.

## 3. Real lender adapters

[`lib/decision-engine.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/decision-engine.ts) is the only file that knows about specific lenders. Replace its `runWaterfall` with a call to a panel of real `LenderAdapter` instances.

```ts
interface LenderAdapter {
  id: string;
  name: string;
  decide(application: ApplicationPayload): Promise<WaterfallStepOutcome>;
}

async function runWaterfall({ caseState, fromIndex }) {
  const steps = [];
  for (let i = fromIndex ?? 0; i < panel.length; i++) {
    const adapter = panel[i];
    const outcome = await adapter.decide(buildApplicationPayload(caseState));
    steps.push({ lender: adapter.name, outcome });
    if (outcome.kind !== "declined") break;
  }
  return { steps, ... };
}
```

Each lender adapter wraps that lender's existing decision API. The waterfall calls them sequentially.

See [Lender panel integration](/implementation/brokers/lender-panel/) and [Decision API adapter](/implementation/lenders/decision-api/).

## 4. Real disclosure publishing

[`lib/disclosures.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/disclosures.ts) hardcodes disclosure body text. In production:

- Each disclosure has a stable id, a body, and a version
- The audit log records the version that was presented
- A new version requires legal/compliance signoff before going live
- Old versions stay accessible for cases that were run against them

A simple swap: a CMS (Sanity, Contentful, Strapi, or just JSON files in a versioned S3 bucket) keyed by disclosure id, returning the current published version plus a way to fetch historical versions.

See [Disclosure publishing](/implementation/brokers/disclosure-publishing/).

## 5. Replay regression in CI

The replay engine is on-demand in the demo. In production it should run automatically:

- A corpus of representative historical cases stored in CI
- Every prompt change, model version change, or disclosure change re-runs replay against the corpus
- Pass-rate drops below threshold (say 95% per disclosure) fails the CI check
- Drift detection alerts a human

This is what turns the replay engine from "compliance theatre we can show a regulator" into "compliance evidence the broker actually operates against".

See [Audit & replay integration](/implementation/brokers/audit-integration/).

## Other hardening tasks

In rough priority order:

| Task | Why |
| --- | --- |
| Real DPIA + lawful-basis review | UK GDPR, see [Privacy: DPIA](/privacy/dpia/) |
| Sub-processor agreement with Anthropic | Article 28 GDPR, see [Privacy: sub-processors](/privacy/sub-processors/) |
| Vulnerability process integration | Consumer Duty, see [Vulnerability process](/implementation/brokers/vulnerability-process/) |
| KYC + AML before pre-contract | Money Laundering Regulations 2017 |
| E-signature for the credit agreement | Customer accepting an offer ends the demo; production needs signing |
| Lender funding webhooks | Settlement notification |
| Settlement reconciliation | Match credit agreements to actual disbursements |
| Customer comms (SMS, email) | The demo records preferences but sends nothing |
| Rate limiting on the chat route | Prevent abuse, especially for the (expensive) replay endpoint |
| Audit log redaction tooling | Subject access request handling |
| Backups and disaster recovery | Standard production hygiene |
| Logging and monitoring | OpenTelemetry, structured logs, dashboards |
| SOC 2 / ISO 27001 alignment | If the broker requires it |

## What stays the same

The structural architecture. The state machine, reconciliation, event protocol, audit log, replay engine. These are designed to scale to production without rewrite.

The bet is: the structural parts are correct and reusable. The hardening list is wiring and policy work, not architecture work.
