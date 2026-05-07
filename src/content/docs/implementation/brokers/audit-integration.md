---
title: Audit integration
description: How to stream audit events into the broker's compliance store, run replay as a CI/CD check, and expose audit pages to reviewers.
---

The audit log is the broker's compliance evidence layer. It captures every state-mutating event on every case and, with the replay scorer on top, gives the broker a tested view of whether the agent reliably does the right thing across cases. This page covers the integration patterns, the CI/CD wiring, and the access controls.

## What gets audited

`buildAuditTimeline` in `lib/audit.ts` produces a chronological list of `AuditTimelineEntry` records. The kinds are:

```ts
type AuditKind =
  | "case_created"
  | "disclosure_presented"
  | "disclosure_acknowledged"
  | "consent_recorded"
  | "eligibility_recorded"
  | "quote_recorded"
  | "email_preference_recorded"
  | "personal_facts_recorded"
  | "financial_facts_recorded"
  | "vulnerability_recorded"
  | "submission"
  | "waterfall_step"
  | "counter_decision"
  | "selected"
  | "withdrawn"
  | "completed"
  | "message";
```

Each entry has `ts`, `kind`, `summary`, and an optional structured `payload`. The audit log also produces a `ComplianceSummary` per case:

- Disclosures presented and acknowledged counts, and whether all presented disclosures were acknowledged.
- Consents count, and whether all consents are explicit (binary granted/refused).
- Whether vulnerability was probed, and how many indicators flagged.
- The number of waterfall steps.
- The final outcome.
- Two durations: total session, and from credit-search consent grant to submission.

These two summaries together are the per-case compliance evidence the broker carries forward.

## Streaming audit to the broker's compliance store

In the demo, the audit timeline is built on demand from the in-memory case store. For production, every state-mutating event should also be streamed to a durable, append-only compliance store.

Two reasonable architectures:

### Pattern A: dual write

The chat route's event handler writes to the case store and emits an audit event onto a queue. A consumer drains the queue into the compliance store.

```
chat route ──┬──▶ case store (Postgres / KV)
             │
             └──▶ audit queue (SQS / Vercel Queue) ──▶ compliance store
                                                       (S3 + Athena, or
                                                        BigQuery, or
                                                        Postgres + retention policy)
```

Pros: case store stays the source of truth for live state; compliance store is optimised for retention and query.

Cons: dual-write failure mode. If the chat route crashes after writing the case store but before emitting the audit event, the audit log is incomplete.

### Pattern B: change data capture

Treat the case store as the only thing the chat route writes to, and CDC to the compliance store from there.

```
chat route ──▶ case store (Postgres) ──[logical replication]──▶ compliance store
```

Pros: one write, no dual-write inconsistency.

Cons: requires Postgres (or another store with CDC), and the audit log shape becomes a derived view rather than a primary artefact, which is harder to reason about.

The recommended pattern for most brokers is A with an outbox table (the chat route writes to the case store and an `audit_outbox` row in the same transaction; a worker drains the outbox to the compliance store and deletes drained rows). Outbox plus retry is enough to make the audit log effectively-once-delivered without any cross-store transaction.

## Retention

The compliance store retention is set by the broker's regulatory obligations. Cross-link to [/privacy/retention/](/privacy/retention/) for the full policy. The short version:

- CONC and SYSC require records of credit broking activity for at least six years.
- GDPR requires that retention beyond what is necessary for the purpose is justified.
- The broker's policy ties retention period to the disclosure record version (see [/implementation/brokers/disclosure-publishing/](/implementation/brokers/disclosure-publishing/)).

Set retention in the compliance store at the highest applicable period (typically seven years from case close) and delete records that pass that horizon. Deletion has to be auditable too: a separate retention-deletion log records what was deleted and when.

## Replay scoring as a CI/CD check

The replay endpoint (`POST /api/audit/[sessionId]/replay`) re-runs the agent against the prefix of a case's conversation and checks whether the model emits the right `present_disclosure` events. The output is a per-disclosure pass rate.

This is the closest thing to a unit test for the agent's regulatory behaviour. Wire it into CI/CD:

1. **Maintain a corpus.** Keep a frozen set of representative cases (50 to 200 sessions, covering clean, counter, decline, withdrawn, and ineligible journeys, plus a vulnerability case or two).
2. **Run replay on every model change.** Whenever the agent's system prompt, the model version, the disclosure registry, or any tool definition changes, run replay across the corpus.
3. **Set a regression threshold.** A reasonable starting threshold is "no individual disclosure pass rate drops by more than 5 points; aggregate pass rate stays above 95%."
4. **Block deploy on regression.** Treat a replay regression as a build failure. The compliance lead can override with a recorded reason.

The replay scorer in `lib/audit.ts` is N=5 by default; for CI, run N=20 to reduce noise. Each disclosure is checked against two pass criteria: the model emitted the matching `present_disclosure` event, or the disclosure title appears in the model's text output. The first criterion is the strong signal.

A CI run for a single case looks like:

```bash
curl -X POST https://broker.example.com/api/audit/$SESSION_ID/replay \
  -H "Content-Type: application/json" \
  -d '{"n": 20, "seed": "..."}' \
| jq '.disclosures[] | select(.passRate < 0.95)'
```

Aggregate across the corpus and emit a report.

## Replay drift over time

Even without intentional changes, replay scores can drift. Causes:

- The model provider rolls a minor version of the underlying model.
- The system prompt picks up a typo fix that subtly shifts the agent's narrative arc.
- A new disclosure version (see [/implementation/brokers/disclosure-publishing/](/implementation/brokers/disclosure-publishing/)) changes the title, breaking the title-substring fallback.

Run replay nightly across the live corpus and chart pass rates over time. A 7-day moving average that drops below 95% is a signal to investigate before a customer notices.

## Exposing the audit page to reviewers

The audit page is internal to the broker. Three audiences need access in different ways:

### Compliance team

Full access. Authenticated SSO. Every case visible. The audit page is their daily tool.

### FCA reviewers

Read-only access to specific cases. The cleanest pattern is signed-link sharing:

```
GET /audit/<sessionId>?token=<JWT>
```

The token is signed by the broker, scoped to a single `sessionId`, expires in 14 days, and is revocable. The link is delivered to the FCA Innovation Hub or supervisor on a secure channel (the broker's regulatory portal, not email).

Implementation:

```ts
function generateAuditLink(sessionId: string, recipient: string, ttlDays = 14) {
  const token = jwt.sign(
    { sub: sessionId, aud: recipient, scope: "audit:read" },
    BROKER_SIGNING_KEY,
    { expiresIn: `${ttlDays}d` }
  );
  return `${BASE_URL}/audit/${sessionId}?token=${token}`;
}
```

The audit page validates the token, scopes the response to that single `sessionId`, and logs every access. Token revocation is a small revocation list checked at validation time.

### Customer

The customer has a right of access under GDPR Article 15. The broker has to be able to produce a copy of their case data on request. Cross-link to [/privacy/data-flow/](/privacy/data-flow/). The audit log is part of that response, but the format should be a structured export (PDF or JSON), not the raw timeline view used by compliance.

Build a separate "subject access export" endpoint that produces a customer-readable export from the same source data. Do not give customers direct access to the compliance audit page.

## Anomaly detection

The compliance team should not have to read every case. Wire the compliance store to a small set of alerts:

- Any case where `vulnerabilityProbed` is false. The probe should fire on every case; absence is a bug.
- Any case where `allDisclosuresAcknowledged` is false but `status` is `selected`. A selected case with an unacknowledged disclosure is a process failure.
- Any case where `fromConsentToSubmissionMs` is under 30 seconds. That is faster than a customer can read the consent text and is suspicious.
- Any case where `waterfallSteps` is zero but `status` is `declined`. The customer was told they were declined without any lender being asked.

Each alert routes to the compliance team's queue with a link to the audit page. None of these are guaranteed bugs, but each is worth a human glance.

## See also

- [/regulatory/replay-and-evidence/](/regulatory/replay-and-evidence/) for the regulatory framing.
- [/implementation/brokers/disclosure-publishing/](/implementation/brokers/disclosure-publishing/) for the disclosure registry that anchors audit records.
- [/privacy/retention/](/privacy/retention/) for how long records persist.
- [/product/audit-and-replay/](/product/audit-and-replay/) for the demo's audit module.
