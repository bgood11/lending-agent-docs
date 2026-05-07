---
title: Data minimisation (lender view)
description: GDPR Article 5(1)(c) applied to the broker-lender boundary, and why a small data surface is good for the lender.
---

This page covers what data flows from the broker to the lender, what does not, and why. The framing is GDPR Article 5(1)(c): personal data shall be "adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed." For the broker-lender relationship, that purpose is "deciding whether to lend on this application." Anything that does not advance that purpose should not be on the wire.

Cross-link to [/privacy/data-minimisation/](/privacy/data-minimisation/) for the broader privacy framing across the whole system.

## What is necessary

A lender's decision needs:

- **Identity facts** sufficient to run a credit search and a KYC check. Full name, date of birth, address history (current is mandatory; previous typically required for full match).
- **Affordability facts.** Employment status, income, regular outgoings, existing credit commitments.
- **Eligibility facts.** Residency, age, homeowner status, employment status (the four-gate intake the broker runs upfront).
- **Loan terms.** Project value, deposit, net loan amount, requested term, requested APR, product code.
- **Consent timestamps.** That credit-search consent was granted, and when. The lender needs this to satisfy their own CCA Section 75 record-keeping.
- **Disclosure acknowledgement evidence.** That the regulated disclosures (introducer status, credit-search consent, pre-contract summary) were presented and acknowledged, and the version that was presented.

All of this is on the wire as part of the structured Information Request. Cross-link to [/implementation/lenders/waterfall-protocol/](/implementation/lenders/waterfall-protocol/) for the exact payload.

## What is not necessary

What the broker holds but does not transmit:

### The chat transcript

The conversation between the customer and the agent contains the full context of how the application came to be. It is the broker's compliance evidence. It is not the lender's business.

The lender does not need to know how long the customer hesitated before answering "what's your monthly income," or what they typed before backspacing, or what reassurance the agent offered them about credit-search consent. The decision is on the structured facts, not the dialogue.

Holding back the transcript makes the lender's compliance surface smaller. The lender is not processing free-text personal data, not subject to the data subject access request implications of holding chat content, not exposed to the data-leak risk of an internal misuse of the transcript.

### The vulnerability free-text note

The customer may have typed a sentence about their circumstances that triggered the vulnerability indicator. The agent records that note. The audit log holds it.

The note does not flow to the lender. The lender receives only an `indicatorCount` (zero, or a positive integer). They do not receive the note itself, the indicator names (e.g. `bereavement_recent`, `income_change`), or any free-text the customer offered.

The argument for sending the indicator names: the lender's affordability assessment might be more lenient with full context. The argument against (which prevails): the lender holding vulnerability data without a contractual basis is a data-protection problem; the customer disclosed in confidence to the broker; the lender's affordability rules can be tuned via the broker without the lender seeing individual cases.

If a particular lender contracts for richer vulnerability data (e.g. a specialist lender for customers with specific health-related vulnerabilities), the broker can negotiate that channel separately, with explicit customer consent, on a case-by-case basis. Cross-link to [/implementation/brokers/vulnerability-process/](/implementation/brokers/vulnerability-process/).

### Replay scores and audit metadata

The broker's replay-pass-rate for the disclosures presented in this case is not on the wire. The lender does not see the broker's compliance posture; that is between the broker and the FCA.

Audit metadata such as the duration between consent and submission is not on the wire either. The lender receives the consent timestamp, not derived metrics.

### Other lenders' decisions

In the sequential waterfall, the lender being called does not see what upstream lenders said. They do not know whether the customer is being asked because lender 1 declined, because lender 1 approved with a counter that the customer refused, or because they are at position 1 themselves.

This is mostly a deliberate property of the sequential waterfall (cross-link to [/implementation/brokers/lender-panel/](/implementation/brokers/lender-panel/)), but it is also a data-minimisation property. Other lenders' commercial behaviours are not data the calling lender needs to make a decision on the application in front of them.

## Why this is a feature for the lender

A common reaction from lenders integrating into a broker panel is to ask for more data. The reasoning: more context, better decisions. The counter-argument has three parts:

### Smaller compliance surface

The data you hold is the data you have to protect, retain, and produce on subject access request. A small surface is a small problem. Holding the customer's chat transcript would mean processing free-text personal data, which has thornier GDPR implications than processing structured facts.

### Cleaner audit trail

When the lender's decision is challenged, the audit trail is cleaner if the inputs were exactly the structured facts. "We declined based on this affordability profile" is defensible in a way that "we declined based on a hard-to-articulate combination of structured facts and conversational context" is not.

### Faster decisioning

Smaller payloads decide faster. The broker's per-step latency budget is generous (60 seconds), but lenders that lean on the structured facts and decline to parse free-text dialogue make decisions in single-digit seconds reliably. Cross-link to [/implementation/lenders/decision-api/](/implementation/lenders/decision-api/) on synchronous decisioning.

## Retention on the lender side

The lender retains the application payload they received and the decision they returned. The broker retains the broader audit log. Retention periods are set by:

- **CCA and CONC.** Records of credit broking and credit lending typically retained for at least six years.
- **GDPR Article 5(1)(e).** Storage limitation: data retained only as long as necessary.
- **The broker's data-sharing agreement with the lender.** Contracts who is responsible for what.

The lender's retention horizon should not exceed the broker's. The broker is the data controller for the application data flowing across the wire; the lender is a separate controller (not a processor) for their own decision processing. Both deletion horizons should be specified in the contract.

## What if a lender wants more data

Lenders sometimes ask for richer payloads on integration. The broker's response should be:

1. **Show the use case.** What decision improves with this data, and how.
2. **Show the legal basis.** What contractual or consent basis covers it.
3. **Negotiate the surface.** Add fields to the structured payload, not the chat transcript. If the lender needs more affordability granularity, add affordability fields. If they need more identity match, add identity fields.
4. **Update the audit log.** Any new field on the wire is a new field in the audit log, recorded as transmitted to the lender.

Adding the chat transcript is rarely the right answer. The right answer is usually a richer structured payload.

## Customer-facing implications

The customer is told what data flows where. The privacy notice (cross-link to [/privacy/data-minimisation/](/privacy/data-minimisation/)) describes:

- What facts the broker collects.
- What facts the broker shares with lenders.
- What the broker does not share (the chat transcript, the vulnerability note).
- How long each retention horizon is.

A small, comprehensible data surface makes the privacy notice short and honest. A long privacy notice that covers every conceivable data flow is a sign the data surface is too large.

## See also

- [/privacy/data-minimisation/](/privacy/data-minimisation/) for the cross-cutting framing.
- [/implementation/lenders/waterfall-protocol/](/implementation/lenders/waterfall-protocol/) for the wire payload.
- [/implementation/brokers/vulnerability-process/](/implementation/brokers/vulnerability-process/) for what stays with the broker.
- [/regulatory/conc/](/regulatory/conc/) for CCA and CONC retention obligations.
