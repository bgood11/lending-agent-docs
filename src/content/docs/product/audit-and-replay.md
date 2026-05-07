---
title: Audit & replay
description: The back-office compliance log and the statistical replay engine that produces per-disclosure compliance pass rates.
---

The audit dashboard is the regulator-facing artefact. Open `/audit/[sessionId]` for any completed (or in-progress) case. Every state-mutating event in the case lands here with a timestamp.

## What the audit shows

Six sections, top to bottom:

1. **Case header**: case ID, retailer, customer initials only, status, timestamps.
2. **Compliance summary**: disclosures presented vs acknowledged, all-acked flag, consent counts (and whether all are explicit binary), vulnerability count, waterfall steps, final outcome, time from session start to last update, time from credit-search consent to application submission.
3. **Replay panel**: runs N statistical replays per disclosure, returns per-disclosure pass rates.
4. **Timeline**: every event in chronological order with one-line summary and expandable JSON payload.
5. **Disclosures**: each disclosure with presented-at, acknowledged-at, duration in milliseconds, expandable verbatim text.
6. **Consents**: each consent with grant/refuse, timestamp, the disclosure that triggered it.
7. **Application data**: full case-state JSON.
8. **Waterfall**: each lender attempt with outcome.
9. **Customer messages**: full transcript with role and timestamp.

## Compliance summary, in detail

The summary computes from raw case state every time the page is opened (or the API endpoint hit):

```ts
{
  disclosuresPresentedCount,
  disclosuresAcknowledgedCount,
  allDisclosuresAcknowledged,    // boolean
  consentsCount,
  explicitConsents,              // every consent has a binary granted/refused
  vulnerabilityProbed,           // was the vulnerability card surfaced
  vulnerabilityIndicatorsCount,
  waterfallSteps,                // number of lender attempts
  finalOutcome,                  // status
  durations: {
    sessionMs,                   // start to last update
    fromConsentToSubmissionMs    // credit-search consent grant to waterfall start
  }
}
```

These are the numbers a compliance reviewer cares about. They roll up to a yes/no answer: was this case run correctly?

## The replay engine

This is the §7.7 "replayability" feature of the agentic credit broking protocol made operational. See [Replay & evidence](/regulatory/replay-and-evidence/) for the regulatory framing.

The engine takes the case's customer transcript and, for each disclosure that was presented, replays N model calls asking: *"given the conversation up to this point, would the agent present this disclosure deterministically?"*

```ts
for each disclosure in case:
  history = customerMessages where createdAt < disclosure.presentedAt
  for i in 1..N:
    response = generateText(systemPrompt, history)
    events = parseAgentEvents(response)
    pass = events.includes(present_disclosure with id == disclosure.id)
        OR response.includes(disclosure.title verbatim)
    record pass/fail
  passRate = passes / N
```

Default N = 5. Capped at 20. Each run is a real model call (~£0.0005 each at current Sonnet rates). The engine returns a `ReplaySummary`:

```ts
{
  sessionId,
  disclosures: [
    {
      disclosureId,
      runs: 5,
      passed: 5,
      failed: 0,
      passRate: 1.0,
      failures: []   // populated for failed runs with snippet of what the agent said
    },
    ...
  ],
  overallPassRate,
  totalRuns
}
```

The audit page renders this as a horizontal bar per disclosure, green for compliant runs, red for drift. A sub-button "Inspect drift" shows the snippets of failed runs so you can see exactly what the agent said when it didn't comply.

## What the replay engine proves

It proves that, given the same conversation history, the agent re-emits the correct regulated event N out of N times. That's empirical compliance evidence per case.

What it doesn't prove:

- That the disclosure body itself is correct (that's a publishing concern, see [Disclosure publishing](/implementation/brokers/disclosure-publishing/))
- That the customer understood the disclosure (that's a UX concern; the audit log measures presentation and acknowledgement timing)
- That the journey was the right journey for this customer (that's a Consumer Duty concern; the demo provides evidence, not the judgement)

## Production hardening

In production:

- Replay should be a CI/CD step, not a manual button. Any prompt change, model version change, or disclosure change re-runs replay against a corpus of historical cases.
- Drift detection should alert. A pass rate dropping below threshold (say 95%) on any disclosure should page someone.
- Replay outputs should be archived alongside the case, not regenerated on demand.

See [Audit & replay integration](/implementation/brokers/audit-integration/) for the broker integration story.

## Privacy of the audit page

The demo's audit page is unauthenticated. **Do not deploy this in production without authentication.** The audit page contains:

- Customer first name (initials shown by default; full name on expand)
- Full personal facts (DOB, address)
- Full financial facts (income, outgoings)
- Vulnerability indicators
- Full chat transcript

In production, the audit page should be behind broker SSO with per-user role-based access. The signed-link pattern (time-limited URL with a signature) is appropriate for sharing with FCA Innovation Hub reviewers or external auditors.

See [Privacy: data flow](/privacy/data-flow/) and [Privacy: retention](/privacy/retention/).
