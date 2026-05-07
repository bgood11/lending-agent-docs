---
title: Who it's for
description: Audience-specific framing for retailers, brokers, lenders, and FCA-style reviewers.
---

The demo and these docs serve four audiences. Each audience cares about a different surface. The links below jump straight into the part of the documentation built for you.

## Retailers

If you sell solar PV, batteries, EV chargepoints, or any other home-improvement product where the customer typically finances a high-value install, this is for you.

"Retailer" here means the firm whose installer is on the customer's doorstep. You introduce the customer to the broker; you don't hold the FCA permission yourself. The agent moves the journey from a clunky web form to a doorstep conversation that completes on the customer's phone before the installer has packed up.

Start with [Adoption path for retailers](/implementation/retailers/adoption-path/). Then [Integration patterns](/implementation/retailers/integration-patterns/) and the [Pilot playbook](/implementation/retailers/pilot-playbook/).

## Credit brokers

If you hold the FCA permission and arrange consumer credit through a panel of lenders for home-improvement / renewables introductions, this is for you. You're the regulated entity. The retailer introduces the customer; you arrange the finance.

The agent is a stronger Consumer Duty surface than a form: same disclosures every time, same vulnerability check every time, replayable for compliance evidence. The trust gradient lets regulated moments render inline (high-trust user agents) or on the broker's own surface (low-trust user agents) without changing the underlying journey.

Start with [Adoption path for brokers](/implementation/brokers/adoption-path/). Then [Lender panel integration](/implementation/brokers/lender-panel/), [Disclosure publishing](/implementation/brokers/disclosure-publishing/), and [Audit & replay integration](/implementation/brokers/audit-integration/).

For the regulatory framing, [Consumer Duty](/regulatory/consumer-duty/) and [CONC](/regulatory/conc/) are the load-bearing chapters.

## Lenders

If you sit on a broker's panel (prime, near-prime, or sub-prime) and you're wondering what changes when the broker swaps a form-based journey for an agent-mediated one, this is for you.

Less changes than you might think. You already receive structured applications via your existing broker integrations. The agent doesn't change the **shape** of what you receive. It changes what the broker can prove about how it was collected, and it changes the surface area you can offer counter-pricing on.

Start with [Waterfall protocol](/implementation/lenders/waterfall-protocol/). Then [Counter-offer mechanics](/implementation/lenders/counter-offers/) and [Decision API adapter](/implementation/lenders/decision-api/).

## Regulators, risk teams, and auditors

If you're reviewing whether AI-mediated agentic journeys meet the regulatory bar, the [Regulatory section](/regulatory/overview/) is the entry point. Then [Safety](/safety/overview/) and [Privacy](/privacy/overview/) for the cross-cutting concerns.

The strongest concrete artefact is the [replay engine](/regulatory/replay-and-evidence/). Section 7.7 of the agentic credit broking protocol calls for replayability; the demo implements it. Open any completed case at `https://lending-agent.vercel.app/audit/[sessionId]` and click "Run statistical replay".

## I'm someone else

Curious technologist? [Architecture overview](/architecture/overview/) is where the interesting design decisions live. Want to deploy your own copy? [Deploy guide](/deploy/local/).

If you're thinking about a similar problem in a different vertical (mortgage broking, motor finance, insurance arrangement), the same pattern applies. Get in touch.
