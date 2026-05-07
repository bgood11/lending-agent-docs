---
title: Data minimisation
description: How the demo applies the Article 5(1)(c) data minimisation principle in practice.
---

UK GDPR Article 5(1)(c) requires that personal data be "adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed". The ICO treats minimisation as a foundational principle and a frequent source of enforcement findings. This page documents the specific architectural choices in Lending Agent that operationalise it.

## The minimisation problem in an agentic UI

A conversational interface invites disclosure. A customer who would otherwise tick a box may volunteer a paragraph of context. A model that has access to a turn of free text will keep it in its context window. Every additional turn is potentially additional personal data.

The minimisation strategy in Lending Agent has three pillars:

1. **Capture only what each gate needs**. The state machine declares the schema for each gate. The agent prompt is constrained to elicit those fields and not others.
2. **Promote structured fields, not free text, into durable storage**. Conversation content can sit on the transcript with a shorter retention; only the structured fields make it into the audit log and the lender payload.
3. **Strip identifiers from anything that does not need them**. Logs, replays, and metrics are designed against pseudonymised identifiers by default.

## Lender receives the payload, not the transcript

When the agent submits to a lender, it sends a structured JSON payload that contains the answers to the lender's underwriting questions. It does **not** send the chat transcript. The lender does not see the conversation that produced the answers.

This is a deliberate minimisation choice. The lender's lawful basis for processing is performance of the credit agreement and compliance with creditworthiness rules; the conversation is not necessary for that purpose. The same logic applies to ancillary content the customer might have shared in the chat (small talk, reasoning about the purchase, mentions of family members). None of that flows downstream.

The architectural enforcement is that the lender adapter only has access to the structured slice of case state, never to the transcript module.

## Vulnerability handling: counts before content

The vulnerability gate is the place where minimisation matters most, because the data is special category. The default capture is a set of indicator counts and category flags drawn from a closed list. Only with a defensible Article 9 basis (typically explicit consent, or a substantial public interest condition with a basis in UK law) does the agent retain the specific item.

If a customer volunteers a free-text disclosure ("I am recovering from cancer treatment"), the agent acknowledges it, records the relevant indicator, and does **not** promote the free text into a structured durable field. The transcript itself has shorter retention and tighter access controls than the audit log.

## The replay endpoint never exposes raw identifiers in logs

The agent has a deterministic replay endpoint used by engineers and, where appropriate, by regulators. Replay reconstructs the journey from the audit log. By default, it shows the journey with customer identifiers redacted: names become `<applicant>`, addresses become `<address>`, dates of birth become a year band.

Engineers who need the raw values to debug a specific issue must invoke a separate `unseal` step which is itself audited (who unsealed, when, for which case, and why). This bifurcation prevents casual disclosure during routine debugging while preserving the regulator's ability to inspect the full journey when warranted.

## The withdraw flow as a minimisation mechanism

At every gate, the customer can withdraw. Withdrawal is not a single endpoint but a documented set of behaviours:

- **Withdraw before submission**: the case state is purged from short-term storage, the transcript is marked for accelerated deletion, and the audit log retains only a "withdrawn" record with no personal data beyond the hashed identifier.
- **Withdraw after submission to lender**: the lender is notified by a structured "applicant withdrew" message; the broker retains records to the extent required by FCA SYSC 9 and CONC, but the dataset shrinks immediately.
- **Withdraw consent for the CRA share**: handled separately because consent is the relevant basis for that specific share. The withdrawal is recorded with timestamp and propagated.

Withdrawal is a Article 7(3) and Article 17 mechanism rolled together. By making it a first-class gate, the agent treats minimisation as a continuous setting rather than a one-time design choice.

## The seed-encoded URL state

The customer surface is mounted from a URL whose query carries a signed seed. That choice has privacy implications:

- URLs are logged by intermediate proxies, by reverse proxies, by analytics scripts, and by the user's browser history.
- A URL is shareable by accident.

The minimisation response is that the seed contains only the data the surface needs to mount: basket value, retailer reference, a short-lived nonce, and (optionally) a given name for personalisation. It does **not** carry full identity data, contact details, financial attributes, or a tokenised customer record. The signature is for integrity, not confidentiality, and the seed is treated as if it could be observed.

A separate, server-side fetch retrieves any further context once the surface authenticates. That fetch is over TLS, not in a URL parameter, and is logged at a granularity that excludes personal data. The result is that even if the URL leaks, the leaked data is bounded to a basket amount and a retailer reference.

This is a pattern worth highlighting in any DPIA: a public surface that depends on URL-borne state has to reason carefully about what travels in the URL and what does not.

## A note on metrics and analytics

Metrics about agent performance (tokens used, gate completion rate, time on task) are aggregated without attaching to a specific customer. Where a metric must be sliced by case (for instance to investigate a specific failure), it is done against the hashed case identifier and not against direct identifiers. Analytics on the customer surface are kept off by default and are subject to PECR consent if introduced; see [PECR and cookies](./pecr-and-cookies).
