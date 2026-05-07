---
title: Regulatory overview
description: How UK consumer-credit regulation applies to an AI-mediated agentic broking journey.
---

## What this section is about

Lending Agent is a working demonstration of an agentic credit broking journey. The conversation a customer has with the agent is, in regulatory terms, the same regulated activity that a human credit broker performs: arranging a regulated credit agreement under article 36A of the Regulated Activities Order. The mediation layer is new. The activity is not.

This section maps the rules that bear on that activity, with citations to the primary sources, and shows where the demo's behaviours line up with each rule. It is written for four overlapping audiences: FCA-authorised credit brokers, retailers acting as introducers, lenders deciding whether to participate in waterfalls, and reviewers from the FCA's innovation services. Each page in this section is a self-contained reference; readers can jump in at the rule that concerns them.

> Lending Agent is a research demonstrator, not a regulated production service. Nothing on this site constitutes regulated advice or a recommendation. References to "compliance" describe how the demo's design surfaces evidence; live deployments require firm-level authorisation, governance, and assurance.

## The regulatory perimeter

Consumer credit broking in the UK sits inside several overlapping regimes. The relevant ones for an AI-mediated journey are:

- **Financial Services and Markets Act 2000 (FSMA)**: which establishes the FCA's authorisation and supervisory powers. Credit broking is a regulated activity; firms carrying it on without permission commit a criminal offence under section 19.
- **Consumer Credit Act 1974 (CCA)** and its secondary instruments, particularly the [Consumer Credit (Disclosure of Information) Regulations 2010](https://www.legislation.gov.uk/uksi/2010/1013), which prescribe the form of pre-contract information (the SECCI) and the timing of its provision.
- **FCA Handbook**: [PRIN](https://handbook.fca.org.uk/handbook/PRIN/) (Principles for Businesses, including the Consumer Duty in PRIN 2A), [CONC](https://handbook.fca.org.uk/handbook/CONC/) (the Consumer Credit sourcebook) and [SYSC](https://www.handbook.fca.org.uk/handbook/SYSC/) (Senior Management Arrangements, Systems and Controls).
- **Consumer Duty** under [FG22/5](https://www.fca.org.uk/publication/finalised-guidance/fg22-5.pdf), which since 31 July 2023 has imposed a higher and more exacting standard than the previous "treating customers fairly" baseline for retail products in scope.
- **Vulnerability guidance** under [FG21/1](https://www.fca.org.uk/publications/finalised-guidance/guidance-firms-fair-treatment-vulnerable-customers).
- **UK GDPR and the Data Protection Act 2018**: with [ICO guidance on AI and data protection](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/guidance-on-ai-and-data-protection/) and Article 22 rules on solely automated decisions.
- **FCA AI policy posture**: set out in the [AI Update](https://www.fca.org.uk/firms/ai-financial-services) (April 2024) and the [AI Lab](https://www.fca.org.uk/firms/innovation/ai-lab) initiative including AI Live Testing under [FS25/5](https://www.fca.org.uk/publications/feedback-statements/fs25-5-ai-live-testing).

This stack is the perimeter the agent operates inside. The pages that follow drill into each layer.

## The same regulated activity, with new evidence affordances

A common framing error is to treat AI-mediated broking as a new regulated activity that needs its own rulebook. The FCA's stated position is the opposite: existing rules apply, and they apply unchanged. What an agentic surface does change is the texture of the evidence available to a supervisor.

A traditional broking journey produces a SECCI, a recorded call (sometimes), an application form, and a CRM trail. An agentic journey produces a deterministic sequence of disclosed facts, a verbatim record of every utterance the customer saw, a structured eligibility result, a consent timestamp, and (in this demo) a replayable transcript that can be re-scored against a held-out evaluation set. The rule has not moved. The evidence has densified.

That densification has consequences on both sides of the ledger. It can be used to demonstrate Consumer Duty outcomes more rigorously than a sampled call review allows. It can also surface failure modes (drift, off-script behaviour, vulnerable-customer mishandling) that a thinner evidence base would have hidden. The [Replay and evidence](./replay-and-evidence/) page sets out the methodology used in the demo and where its limits sit.

## How this section is organised

- [Consumer Duty](./consumer-duty/): the four outcomes and the cross-cutting rules, mapped to demo behaviours.
- [CONC](./conc/): the Consumer Credit sourcebook chapters that touch the agent surface.
- [FCA AI strategy](./fca-ai-strategy/): the AI Update, AI Lab, AI Live Testing, and the supervisory expectations.
- [Vulnerable customers](./vulnerable-customers/): FG21/1, the four drivers, and the demo's vulnerability indicator card.
- [Principles and SMCR](./principles-smcr/): PRIN, accountability for the agent's behaviour, and the broker as model owner.
- [Replay and evidence](./replay-and-evidence/): the §7.7 protocol, what the audit log proves, and the open methodological questions.

## What this section is not

This is not a compliance opinion. It is not a substitute for legal advice from a regulatory law firm. It is not an FCA approval, endorsement, or authorisation. The demo at [lending-agent.vercel.app](https://lending-agent.vercel.app) cannot be used to introduce a real customer to a real lender; the lender adapters return scripted decisions for evaluation purposes.
