---
title: What it is
description: An AI-mediated agentic credit broking demo for UK consumer finance, with verbatim disclosures, sequential lender waterfall, and a replayable audit log.
---

Lending Agent is a working prototype that takes a UK consumer-credit application from doorstep to lender decision through an AI agent. Solar PV plus battery is the demo vertical, but the structure is generic to any retailer-introduced consumer credit journey.

It exists to ground productisation conversations between retailers, FCA-regulated credit brokers, lenders, and regulators in something concrete. It is not a real product, no real credit search runs, no real lender API is called. The journey, audit, and replay layers are real. The lender panel, decisions, and credit search are mocked.

## Three surfaces

**Installer surface.** A voice-first intake the installer uses on the customer's doorstep. The installer says project value, deposit, customer first name, email, and mobile. The agent extracts everything and generates a customer link.

**Customer surface.** A plain-English journey on the customer's phone. Eligibility, indicative quote, application details, vulnerability check, consent, sequential waterfall, accept-or-decline. Every regulated moment is presented verbatim. Every consent is captured as an explicit binary.

**Audit dashboard.** A back-office compliance log with a chronological timeline of every event, full disclosure presented/acknowledged timing, consent grant/refuse, vulnerability flags, and waterfall outcomes. Plus a statistical replay engine that re-runs each disclosure N times against the agent to produce a per-disclosure compliance pass rate.

## Why an agent rather than a form

Forms have hit a ceiling. A long form is a long form whether it's paper or digital. Customers abandon at every page. Installers can't help fill them in because they're not allowed to. The format is the problem.

An agentic journey changes the format:

- **Conversational pacing.** The customer asks a question, the agent answers, then continues. There's no form-hostile moment of "what does APR mean again?" leading to abandonment.
- **Consistency at scale.** Every customer hears the disclosures verbatim, gets the eligibility check before the credit search, sees the same vulnerability indicators, gets the same plain-English decline narrative. You can replay any of it for compliance evidence.
- **Reach.** Existing customer journeys work for customers who are good at forms. An agent works for everyone, including those who would have called a number or never started at all.
- **Consumer Duty story.** You can demonstrate the [four outcomes](/regulatory/consumer-duty/) (products and services, price and value, consumer understanding, consumer support) with structured evidence, not assertions.

## What's mocked vs what's real

| Layer | Status |
| --- | --- |
| Customer journey, all gates, all disclosures | Real |
| State machine + reconciliation | Real |
| Audit log + replay engine | Real |
| Voice transcription (Web Speech API) | Real |
| Anthropic Claude API integration | Real |
| Lender panel (decisions, rate cards, counter-offers) | Mocked in `lib/decision-engine.ts` |
| Credit search (soft / full search APIs) | Not implemented |
| Email and SMS sending | Not implemented |
| KYC and AML checks | Not implemented |
| Settlement and funding | Not implemented |

See [Mock-vs-real boundary](/architecture/mock-vs-real/) for the seams.

## Status

This is a personal side project, built independently of any firm. The codebase is open source under the GitHub link in the footer. Documentation here is the version of record for productisation conversations.

If this is interesting for your operation, [open the simulation](https://lending-agent.vercel.app) and walk a journey end to end. The "View compliance audit log" link on terminal states leads to a fully populated audit view with a replay panel.
