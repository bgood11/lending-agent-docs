---
title: Adoption path for retailers
description: Why a solar or home-improvement retailer would adopt an agentic finance journey, and how Lending Agent slots into the existing doorstep-to-install lifecycle.
---

This page is for retailers (solar installers, home-improvement firms, EV charger fitters) who already sell finance-eligible work and are deciding whether to plug an AI-mediated finance journey into their sales motion. Lending Agent is the demo build of that journey. The adoption case is about funnel economics and compliance posture, not about novelty.

## Status quo on the doorstep

A typical solar consultation runs 60 to 90 minutes. The installer surveys the roof, sketches a system, and prices it. If the customer wants to proceed but cannot pay cash, finance has to happen. The current options are all bad in different ways:

1. **Paper application on the kitchen table.** Slow, error-prone, hostile to vulnerable customers, and produces a thin compliance trail. The installer is reading rate cards from a printed sheet.
2. **Tablet handoff to a broker portal.** Better data, worse flow. The customer fills in 30 fields under the watchful eye of a salesperson. Vulnerability never gets surfaced. Counter-offers are buried in fine print.
3. **"We'll email you a link tomorrow."** The conversion killer. Drop-off between the doorstep and the customer eventually opening the link is the single largest leak in the funnel.

Each route has the same compliance failure mode: the broker cannot prove what was said, what was disclosed, and what the customer agreed to. That gap matters more under Consumer Duty (see [/regulatory/consumer-duty/](/regulatory/consumer-duty/)) than it did before.

## The alternative: an agent on the doorstep

Lending Agent flips the model. The installer runs a short installer-side intake (project value, deposit, customer contact). That hands off via SMS link to a customer-side agent. The customer talks to the agent, on their own phone, in their own time, and the agent walks them through eligibility, quote choice, application, vulnerability check, consent, and waterfall submission. Every state-mutating event is recorded against a single `CaseState` (see [/reference/types/](/reference/types/)).

The doorstep effect is compositional:

- The installer does the survey and pricing. They never touch finance data.
- The customer engages with the agent at a moment of their own choosing, after the salesperson has left.
- The application reaches the lender panel inside hours, not days.
- The audit log proves what happened: every disclosure presented, every consent captured, every counter-offer shown (see [/regulatory/replay-and-evidence/](/regulatory/replay-and-evidence/)).

## Where Lending Agent slots in

Most retailers already run a CRM (HubSpot, Pipedrive, Salesforce, or a vertical-specific tool) and an appointment lifecycle (lead, booked, surveyed, quoted, sold, installed). Lending Agent fits between *quoted* and *sold*:

```
Lead → Booked → Surveyed → Quoted ─┬→ Cash sale → Installed
                                   └→ Lending Agent ─┬→ Selected → Funded → Installed
                                                     ├→ Counter accepted → Funded → Installed
                                                     ├→ Declined → (retailer pursues alternative)
                                                     └→ Withdrawn → (retailer follows up)
```

The retailer's CRM stays the system of record for the customer relationship. Lending Agent emits a `case_outcome` event when the journey terminates, which a webhook handler maps onto the CRM stage. See [/implementation/retailers/integration-patterns/](/implementation/retailers/integration-patterns/) for the wire format.

## Compliance posture: who holds what

The cleanest division of responsibility (and the one this build assumes) is:

- **Retailer** is the introducer. They generate a lead, collect basic project facts, and hand off to the agent. They do not collect financial data. They do not present regulated disclosures. They do not give finance advice.
- **Broker** holds the FCA Part 4A permission for credit broking under CONC. They own the agent, the disclosure library, the lender panel, the audit log, and the vulnerability process (see [/regulatory/conc/](/regulatory/conc/) and [/implementation/brokers/disclosure-publishing/](/implementation/brokers/disclosure-publishing/)).
- **Lender** holds the consumer credit lending permission and accepts or declines applications via the waterfall (see [/implementation/lenders/waterfall-protocol/](/implementation/lenders/waterfall-protocol/)).

This split keeps the retailer's regulatory surface small. The retailer is not making credit decisions, not running affordability checks, and not capturing vulnerability data. Those sit with the broker, which holds the permission for them.

The audit trail (see [/regulatory/replay-and-evidence/](/regulatory/replay-and-evidence/)) lets the retailer prove they handed the customer over cleanly. If a complaint surfaces six months later about something said on the doorstep, the audit can show what the agent presented and what the customer responded.

## Where Lending Agent does not help

Be explicit about scope:

- It does not replace the doorstep conversation. The installer still surveys, prices, and sells.
- It does not handle the install-and-fund leg. The lender's payout and the installer's invoice happen outside the agent.
- It does not (in this build) handle joint applications, business finance, or non-standard property types. Those route to a human broker.
- It does not give regulated advice. The agent is information-only, on the broker's permission. See [/safety/threat-model/](/safety/threat-model/).

## Pricing model: open question

The retailer's question is "what does this cost me." There are three live models, and the right one depends on volume and panel economics:

1. **Per completed application.** Flat fee for every customer who reaches an outcome (selected, declined, ineligible, withdrawn). Predictable cost; predictable margin to the broker.
2. **Per funded application.** Fee only on selected-and-funded outcomes. Aligns broker and retailer incentives but loads risk on the broker.
3. **Platform fee plus per-application fee.** A monthly platform charge that covers brand-frame customisation, retailer-specific webhook configuration, and SMS gateway, plus a smaller per-application fee.

The placeholder for retailer pricing in this build is a single per-completed-application fee. A real deployment should run a 30-day pilot (see [/implementation/retailers/pilot-playbook/](/implementation/retailers/pilot-playbook/)) before committing to a model.

## What "ready to adopt" looks like

A retailer is ready to adopt when:

- They have a CRM with a webhook ingest endpoint, or a webhook receiver service in front of one.
- Their installers have iPads or phones in the field with reliable mobile data.
- They have an SMS service (Twilio, MessageBird, or a CRM-native sender) that can send the customer link the agent emits.
- They have buy-in from their compliance lead on the introducer split described above.
- They are willing to run a fixed pilot before committing.

The next pages cover the integration mechanics ([/implementation/retailers/integration-patterns/](/implementation/retailers/integration-patterns/)), branding ([/implementation/retailers/branding/](/implementation/retailers/branding/)), and the pilot playbook ([/implementation/retailers/pilot-playbook/](/implementation/retailers/pilot-playbook/)).
