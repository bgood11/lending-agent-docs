---
title: Live simulation
description: How to walk the live demo end-to-end, including demo controls and side paths.
---

The simulation is at **<https://lending-agent.vercel.app>**.

## The 60-second tour

1. Open the URL and click **I'm an installer**.
2. Click the microphone (or type) and say: *"Seventeen and a half thousand pounds solar plus battery, ten percent deposit, customer is Sarah, sarah at example dot com, oh seven seven hundred nine hundred one two three."*
3. Watch the right-hand panel populate with project and contact facts as the agent extracts them.
4. Click **Open customer view** when the customer link card appears.
5. As Sarah, walk through the journey: I understand the status disclosure, all four eligibility yes, pick a term, skip the email opt-in, fill the application details (any fake values are fine), skip vulnerability or tick a couple, grant credit search, confirm pre-contract.
6. Watch the waterfall narrate. Accept the offer when one comes in, or pick "Try the next lender" if you get a counter.
7. Click **View compliance audit log** to inspect the audit dashboard.
8. Click **Run statistical replay** to see compliance scoring across the disclosures.

## Demo controls

Append `?demo=1` to the customer URL to expose a control bar at the bottom of the chat. Three controls:

- **Trust mode**: `high` (default, inline disclosures) vs `low` (disclosures render on a broker-hosted surface). See [Trust gradient](/product/trust-gradient/).
- **Waterfall scenario**: `auto` / `clean` (lender 1 approves) / `counter` (lender 2 counters) / `decline` (all decline). Lets you walk a stakeholder through different outcomes without resetting.
- **Audit log link**: opens the audit page with the current session seed pre-loaded.

Combine them. Open the same session in two tabs with different `?trust=` values to demonstrate inline-vs-broker-hosted disclosure rendering side by side.

## Side paths to explore

**Withdraw.** Click "Leave for now" in the page header at any step. Confirm. The chat locks with a paused-state card. Open the audit log; the case outcome records the withdrawal with timestamp.

**Ineligible.** Restart the journey and answer No to any of the four eligibility questions. The agent moves to the ineligible path with a plain-English explanation and signposts to alternatives. No credit search runs.

**Refusing consent.** Reach the credit search consent step and click Refuse. The agent acknowledges and asks if the customer wants to stop or think about it. No application is submitted.

**Counter-offer flow.** With `?demo=1`, set waterfall to `counter`. Lender 1 will decline, lender 2 will offer at a different APR. You'll see the counter-offer card with two buttons: "Accept this offer" or "Try the next lender".

**Vulnerability flag.** Tick one or more indicators on the vulnerability card and add a free-text note. The agent acknowledges plainly without lecturing. The flag appears in the audit log under "Vulnerability flagged".

## What you should NOT do

- **Don't enter real personal data.** This is a public demo and case state is preserved in URL-borne seeds. Use fake names, fake DOBs, fake postcodes (the lookup is mocked).
- **Don't expect emails or SMSs.** Nothing is actually sent. The email opt-in records the preference in case state but no message goes anywhere.
- **Don't expect a real credit search.** The waterfall is a deterministic mock. Counter-offers and declines are scripted by the demo scenario, not produced by a real underwriting model.

## Want a deeper run?

Once you've walked the happy path, go deeper:

- [Customer journey](/product/customer-journey/), the protocol-aligned breakdown
- [Audit & replay](/product/audit-and-replay/), the back-office surface
- [Architecture overview](/architecture/overview/), how the journey actually works under the hood
