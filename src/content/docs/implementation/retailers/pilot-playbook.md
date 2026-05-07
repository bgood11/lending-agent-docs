---
title: Pilot playbook for retailers
description: Two-week pilot, what to measure, failure modes, and the criteria for expanding from a controlled pilot to whole-network rollout.
---

This is a recipe for a controlled pilot of Lending Agent at a retailer. The default shape is two weeks, five to ten installers, one geographic patch, with daily standups and a single metric owner. The aim is to get from "we think this works" to "we have evidence and a decision" with the smallest reasonable footprint.

## Pilot setup

### Cohort

Five to ten installers, picked for a mix of:

- **Tenure.** Two veterans (over five years), two mid-tenure, the rest newer.
- **Patch.** A single geographic patch reduces variance from market differences and lets you compare against a non-pilot patch as a control.
- **Volume.** Pick installers whose typical week produces at least three finance-eligible quotes. Lower volume makes the pilot statistically uninformative.

A cohort of fewer than five gives you anecdote, not signal. A cohort larger than ten makes daily standups unwieldy and slows the iteration loop.

### Duration

Two weeks of live use, preceded by a one-day onboarding session (see Failure modes below for what to drill on), and followed by a two-day analysis window before the go/no-go decision.

### Roles

- **Pilot lead** (retailer side): owns the metrics, runs the daily standup, escalates blockers.
- **Compliance observer** (broker side): reviews the audit log nightly, surfaces anything anomalous to the pilot lead.
- **On-call engineer** (broker side): rapid response to anything that breaks in field. Assume one bug per day for the first three days.

## What to measure

Pick a small set. The temptation is to instrument everything; resist it for the pilot.

### Funnel metrics

| Metric | Definition | Baseline source |
|---|---|---|
| Doorstep-to-application-start | Median time from `journey_started` webhook firing to the first `record_personal_facts` event | Compare to current paper or portal flow |
| Application-to-decision | Median time from `submit_application` to `case_outcome` | Compare to current broker SLA |
| Doorstep-to-install conversion | Share of doorstep quotes that become installed jobs | Compare to the same patch in the prior month |
| Counter-offer acceptance rate | Of waterfall steps with `approved_with_counter`, share where the customer accepted | New metric, no baseline |
| Withdrawal rate | Share of journeys ending in `caseOutcome.kind === "withdrawn"` | Best-effort comparison to portal abandonment |

The conversion metric is the headline. Everything else is supporting evidence for why it moved (or did not).

### Quality metrics

- **Customer-reported confidence.** A one-question post-journey survey: "How confident are you that you understood the finance you took on?" with a 1-5 scale and one optional free text field. Aim for at least 50% completion.
- **Vulnerability detection rate.** Share of journeys where the agent flagged a vulnerability indicator. Compare to the retailer's prior baseline if they have one (most do not, which is itself a finding).
- **Disclosure replay pass rate.** The broker runs the replay scorer (see [/implementation/brokers/audit-integration/](/implementation/brokers/audit-integration/)) nightly across all pilot cases. Expect over 95%; investigate anything below 90%.

### Operational metrics

- **Installer time per case.** From the installer-side intake perspective, how long does the pre-handoff portion take. Should be under five minutes.
- **Bug count per day.** Track in a single shared sheet. Pilot success depends on this trending down.
- **Customer-side support touches.** Any time a customer phones in mid-journey, log it. Diagnose whether the agent should have handled it.

## Daily standup

Fifteen minutes, every weekday, same time. Agenda:

1. New cases overnight: count and outcomes.
2. Failures: any case that errored, withdrew, or surfaced a vulnerability flag the broker's process did not catch within SLA.
3. Bugs raised yesterday: status and ETA.
4. Decisions needed today.

Anything longer goes to a separate working session. Standups that drift beyond fifteen minutes lose the cohort's attention.

## Failure modes to watch for

### Voice-to-text not working in the field

The customer-side journey assumes a phone with reliable mobile data. In practice, a meaningful share of customers in rural patches have weak signal. The journey degrades to text-only on weak connections, which is fine, but if the agent expects voice and the customer expects text, the experience confuses both. Brief installers to hand off cleanly with "you'll get a text in a moment with a link to chat with our finance assistant."

### Customer doesn't open the SMS link

The single largest funnel leak. Mitigations:

- The installer says "open it now while I'm here" and waits 30 seconds to confirm the chat loads.
- The SMS reminder fires at 48h (see [/implementation/retailers/integration-patterns/](/implementation/retailers/integration-patterns/)).
- The retailer's CRM creates a phone-call task at five days for any unopened journey.

If more than 25% of journeys are not opened within 48h, the doorstep handoff is broken, not the agent.

### Application abandons mid-form

The agent walks through application data over multiple turns. Customers can drop off at any point. The audit log shows where. Expect abandonment to cluster around two points: financial outgoings (the customer doesn't know the number) and the credit search consent disclosure (the customer pauses to read).

For the financial step, brief installers to suggest the customer have a recent bank statement to hand. For the consent step, the pause is good. Long acknowledgement times on `credit_search_consent` (over 30 seconds) correlate with deeper engagement, not failure. The audit log captures the duration; track it.

### The agent gets stuck

Rare in normal flow but possible if the customer says something genuinely off-script. The reconcile layer (see `lib/reconcile.ts`) handles most off-flow events by closing gates the model missed. If a journey sits idle for more than 10 minutes mid-conversation, the broker's on-call should be alerted and a human can take over via the audit page.

### Unhandled vulnerability flag

The agent records `vulnerability_flagged` events. The broker's vulnerability process consumes those events (see [/implementation/brokers/vulnerability-process/](/implementation/brokers/vulnerability-process/)). During the pilot, the compliance observer reviews each one within an hour. If the broker's process is slower than that in production, do not turn the pilot up.

## Expansion criteria

The decision at the end of week two is binary: expand or stop. Expand if all five conditions hold:

1. **Conversion uplift is positive and significant.** "Significant" here is a judgement call, not a t-test, given pilot size. A 10-point lift in doorstep-to-install conversion against a comparable patch in the prior month is a strong signal. Anything under 3 points warrants pause.
2. **Withdrawal rate under 25%.** Higher than that and the journey itself is too long, the disclosures too dense, or the doorstep handoff weak.
3. **Replay pass rate over 95% on all disclosures.** Drift kills the compliance story; this has to hold.
4. **No vulnerability flag missed beyond SLA.** Even one missed flag breaks the Consumer Duty story (see [/regulatory/vulnerable-customers/](/regulatory/vulnerable-customers/)). Investigate before expanding.
5. **Installer NPS positive.** Ask the cohort directly: would you recommend this to your colleagues. If installers do not want it, it will not stick.

If expansion is approved, scale to the next geographic patch (10 to 30 installers) for a four-week phase before rolling network-wide. Use the same metric cadence; adjust the standup to twice-weekly.

## What to take to the post-pilot review

A one-page summary: the five expansion criteria, ticked or crossed, with the supporting numbers and the audit log of any incidents. Attach the customer survey free-text in full. Do not aggregate it; the verbatim quotes are the most useful single artefact for the review.

The broker's compliance lead and the retailer's commercial lead jointly sign off on the expansion. If either side has a blocker, do not expand.

## See also

- [/implementation/retailers/integration-patterns/](/implementation/retailers/integration-patterns/) for what the webhook payloads carry into your CRM.
- [/implementation/brokers/audit-integration/](/implementation/brokers/audit-integration/) for the broker-side compliance evidence layer.
- [/regulatory/consumer-duty/](/regulatory/consumer-duty/) for what good outcomes look like under Consumer Duty.
