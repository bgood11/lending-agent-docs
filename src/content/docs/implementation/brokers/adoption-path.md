---
title: Adoption path for brokers
description: Why a broker would adopt an agentic finance journey, the regulatory case, the implementation effort, and what stays mocked.
---

This page is for FCA-authorised credit brokers deciding whether to invest in an agentic customer journey. It frames the business case, the Consumer Duty alignment, and the implementation effort for a reference deployment.

## Why an agent rather than a portal

The default modern broker journey is a web form sitting behind a retailer's "Apply for finance" button. The form is dense, structured, and unforgiving. It collects the data the broker needs because the broker designed the form. It does not adapt to the customer.

An agent inverts the default:

- The customer is asked one thing at a time, in plain language.
- Vulnerability surfaces through conversation rather than a tickbox at the end.
- Disclosures are presented inline at the moment they are relevant, not scrolled past in a terms-and-conditions modal.
- Counter-offers are explained clearly with explicit accept/decline choices, rather than buried as a price change in a quote summary.
- The audit log captures the dialogue, not just the form submission.

The portal still wins on a handful of dimensions: it is faster for customers who already know exactly what they want, and it is cheaper to operate per case. The agent wins on the dimensions Consumer Duty cares about: comprehension, foreseeable harm, and good outcomes.

This is not a binary choice. Most brokers should run both, with the agent serving the doorstep and field-sales channels and the portal serving direct-to-consumer traffic.

## The Consumer Duty story

The Consumer Duty (PRIN 2A and the supporting Consumer Duty rules) imposes outcomes obligations across products, price, customer understanding, and customer support. Cross-link to [/regulatory/consumer-duty/](/regulatory/consumer-duty/) for the full mapping.

The agentic journey gives a broker concrete artefacts against each:

- **Products and services.** The case state records which products were eligible and which lender returned which decision. The waterfall step list is evidence of fair treatment across the panel.
- **Price and value.** The provisional quote (`provisionalQuote` on `CaseState`) and the final accepted offer are both stored, and any counter-offer's relationship to the requested terms is explicit. A reviewer can see exactly what the customer was offered and accepted.
- **Customer understanding.** Each disclosure has a `presentedAt` and `acknowledgedAt` timestamp, and the duration between them is logged. Acknowledgement is captured on a structured tap, not a click-through. The replay scorer (see [/implementation/brokers/audit-integration/](/implementation/brokers/audit-integration/)) lets the broker prove the agent presents disclosures consistently.
- **Customer support.** The vulnerability indicator card (see [/regulatory/vulnerable-customers/](/regulatory/vulnerable-customers/)) routes flagged customers to a human-handled queue (see [/implementation/brokers/vulnerability-process/](/implementation/brokers/vulnerability-process/)).

None of this is novel as a regulatory aim. What changes is the cost of producing the evidence. Portals require manual case audits to generate it; the agent generates it as a side effect of normal operation.

## The audit-and-replay story

A broker's compliance evidence has two halves: that the right things happened on each case, and that the system reliably does the right thing across cases.

The first half is the per-case audit log (`buildAuditPayload` in `lib/audit.ts`), which produces a chronological timeline plus a compliance summary (counts of disclosures presented and acknowledged, vulnerability probe completion, durations between consent and submission). Cross-link to [/regulatory/replay-and-evidence/](/regulatory/replay-and-evidence/).

The second half is the replay scorer (`POST /api/audit/[sessionId]/replay`). It re-runs the agent against the same prefix of conversation N times and checks whether it consistently emits the right `present_disclosure` events. The result is a pass rate per disclosure. A broker can run this nightly across a corpus of cases and detect drift introduced by a model update or a system-prompt edit before it ships.

This is the closest thing the broker has to a unit test for the agent's regulatory behaviour. Treat it as such.

## The trust gradient

The customer experience is tuned along what the product team calls the trust gradient (see [/product/trust-gradient/](/product/trust-gradient/)): the further the customer goes into the journey, the more concrete and structured the agent becomes. Early turns are conversational; later turns are forms with explicit choices.

This matters for the broker because it shapes where regulatory friction lands. Disclosures and consents are placed at the structured end of the gradient, not buried in early prose. The agent does not present `credit_search_consent` (a regulated CONC disclosure) inline in a chat message; it presents a card with the disclosure body and an explicit acknowledge action. The model emits a `present_disclosure` event; the customer taps acknowledge; the model emits an `acknowledge_disclosure` event. Both are recorded with timestamps.

The same pattern applies to counter-offers. The customer does not accept a counter by typing "yes"; they tap an explicit button. The audit log shows the offer body, the customer's choice, and the timestamp.

## Reference architecture for first deployment

The simplest viable deployment is one broker, one product vertical (say, solar), one panel of three lenders. That is the shape of this build.

```
                    ┌───────────────────────┐
                    │    Retailer's CRM     │
                    └────────────▲──────────┘
                                 │ webhook (case_outcome)
                                 │
┌──────────────┐         ┌───────┴──────────┐
│  Installer   │────────▶│  Broker Service  │◀── audit page (broker compliance)
│   (iPad)     │ intake  │  (Lending Agent) │
└──────────────┘         └───┬─────┬────────┘
                             │     │
                             │     │ chat (customer)
                             │     ▼
                             │   ┌──────────────┐
                             │   │   Customer   │
                             │   │   (mobile)   │
                             │   └──────────────┘
                             │
                             │ waterfall
                             ▼
                       ┌───────────┐  ┌───────────┐  ┌───────────┐
                       │  Lender 1 │  │  Lender 2 │  │  Lender 3 │
                       │  (Prime)  │  │  (Prime)  │  │ (Sub-Prime)│
                       └───────────┘  └───────────┘  └───────────┘
```

The broker service hosts the agent, the case store, the disclosure registry, the audit log, the replay endpoint, the lender adapters, and the webhook delivery service. In Vercel terms it is one Next.js project with a small set of API routes, a Postgres or Vercel KV instance for the case store, and an outbound webhook queue.

## Implementation effort

A reference deployment for one broker, one vertical, three lenders runs roughly:

- **Weeks 1-2.** Stand up the broker service shell, port the case state model, wire up auth and tenant config.
- **Weeks 3-4.** Author the broker's regulated disclosures into the disclosure registry; gate them through compliance signoff (see [/implementation/brokers/disclosure-publishing/](/implementation/brokers/disclosure-publishing/)).
- **Weeks 5-6.** Replace the mock decision engine with three real lender adapters (see [/implementation/brokers/lender-panel/](/implementation/brokers/lender-panel/)).
- **Weeks 7-8.** Wire the audit log into the broker's compliance store, set up nightly replay runs, build the vulnerability queue (see [/implementation/brokers/vulnerability-process/](/implementation/brokers/vulnerability-process/)).
- **Weeks 9-10.** Brand a first retailer (see [/implementation/retailers/branding/](/implementation/retailers/branding/)), wire webhook deliveries into their CRM.
- **Weeks 11-12.** Two-week pilot (see [/implementation/retailers/pilot-playbook/](/implementation/retailers/pilot-playbook/)), with capacity to fix issues in flight.

Eight to twelve weeks is realistic for a team of three (one full-stack engineer, one product/compliance lead, one part-time SRE). Single-engineer builds run longer; teams of more than five overcommunicate and run shorter only on the headline path while debt piles up around the edges.

## What stays mocked initially, what swaps out

This build mocks several things the production broker would replace:

| Component | Demo | Production swap |
|---|---|---|
| Decision engine (`lib/decision-engine.ts`) | Hard-coded lender profiles, deterministic scenarios | Three `LenderAdapter` implementations calling real lender APIs |
| Disclosure store (`lib/disclosures.ts`) | Three disclosures inline in TypeScript | Versioned disclosure registry, approval-gated, content addressable |
| Case store (`lib/server-store.ts`) | In-memory map with URL-seed hydration | Vercel KV or Postgres, durable across instances |
| Audit log | In-memory build | Append-only stream into the broker's compliance store, retained per CONC and SYSC |
| Webhook delivery | None | Outbound queue with retry and DLQ |
| SMS dispatch | None | Twilio/MessageBird, or hand-off to retailer's pipeline |

The case state model itself, the reconciliation engine, the agent system prompt, the disclosure-presentation pattern, and the audit shape do not change. Those are the load-bearing pieces.

## What to do next

Read the four broker implementation pages in order:

- [/implementation/brokers/lender-panel/](/implementation/brokers/lender-panel/) for the waterfall protocol.
- [/implementation/brokers/disclosure-publishing/](/implementation/brokers/disclosure-publishing/) for the disclosure lifecycle.
- [/implementation/brokers/audit-integration/](/implementation/brokers/audit-integration/) for compliance evidence and replay.
- [/implementation/brokers/vulnerability-process/](/implementation/brokers/vulnerability-process/) for the human-in-the-loop side.
