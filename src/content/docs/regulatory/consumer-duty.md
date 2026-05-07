---
title: Consumer Duty
description: How the agentic journey demonstrates the four outcomes and cross-cutting rules of PS22/9.
---

## The Duty in one paragraph

The Consumer Duty was finalised by the FCA in [PS22/9](https://www.fca.org.uk/publications/policy-statements/ps22-9-new-consumer-duty) and is set out in non-Handbook guidance [FG22/5](https://www.fca.org.uk/publication/finalised-guidance/fg22-5.pdf). It came into force for new and existing products on 31 July 2023. The Duty is anchored in a new Principle 12 ("a firm must act to deliver good outcomes for retail customers") and operationalised through three cross-cutting rules and four outcomes. For products in scope, Principle 12 replaces Principles 6 and 7 and imposes a higher and more exacting standard. See [PRIN 2A](https://www.handbook.fca.org.uk/handbook/PRIN/2A.html) for the Handbook text.

The Duty is outcomes-focused. A firm cannot evidence compliance by pointing to a checklist; it must show that retail customers are, in fact, getting good outcomes. That shift is what makes an agentic journey interesting from a supervisory perspective: the journey produces structured artefacts that can be evaluated at population scale rather than by sampled review.

## Cross-cutting rules

Three rules apply across every customer interaction:

1. **Act in good faith** towards retail customers.
2. **Avoid causing foreseeable harm**.
3. **Enable and support retail customers to pursue their financial objectives**.

In the demo, these manifest in design choices rather than slogans. The agent will not advance the journey past a vulnerability disclosure without acknowledging it. It will not present a quote without first running an eligibility step. It will not solicit a credit consent without first explaining what a soft search and a hard search do. None of this is unusual practice for a competent broker; the difference is that each of these moves is logged as a discrete event that can be audited.

## Outcome 1: Products and Services

The Products and Services outcome requires that products are designed and distributed to meet the needs, characteristics, and objectives of an identified target market. In a credit-broking context, the broker does not design the product but does control distribution: which lenders sit in the panel, in what order they are tried, and on what triggers a customer is excluded.

The demo evidences this through a transparent waterfall configuration: the order of lenders, the eligibility gates that determine whether a lender is offered, and the reason a lender was skipped are all recorded per case. A reviewer can ask, for any case in the audit log, "why was lender X not tried?" and receive a deterministic answer.

## Outcome 2: Price and Value

The Price and Value outcome requires that customers receive fair value: a reasonable relationship between the total price paid (including broker commission, where applicable) and the benefits received. The Duty makes clear that price alone is not the test; the question is whether the consumer's overall benefit is proportionate.

For a broker, this engages the question of commission structure. The agent surfaces the indicative APR and the total cost of credit before any consent to search is sought, so that a customer can compare the offered terms against alternatives. Where the demo is integrated with a real lender panel, broker commission disclosure would be rendered inline at the indicative-quote step; the demo includes a placeholder for that disclosure pattern. The supervisory expectations on commission disclosure have been sharpened by the FCA's motor-finance work ([PS20/8](https://www.fca.org.uk/publications/policy-statements/ps20-8-motor-finance-discretionary-commission-models-and-consumer-credit-commission-disclosure) on discretionary commission models and [CP25/27](https://www.fca.org.uk/publications/consultation-papers/cp25-27-motor-finance-consumer-redress-scheme) on the motor-finance consumer redress scheme), and any AI-mediated journey carrying broker commission must render the disclosure verbatim, prominently, and at a moment where it can usefully inform the customer's decision.

## Outcome 3: Consumer Understanding

The Consumer Understanding outcome requires that communications equip customers to make effective, timely, and properly informed decisions. The FCA explicitly replaced the "average retail customer" test with a "retail customers in the target market" test, which obliges firms to think about whom they are actually talking to.

The agent's narration is plain English by default. Numbers are presented with their units. Terms of art (APR, hard search, soft search, indicative quote) are defined the first time they appear. Where the customer asks a clarifying question, the agent answers it before advancing. The verbatim record of what the customer was shown is part of the audit log, so a reviewer can assess whether the language used in any particular case met the understanding standard.

## Outcome 4: Consumer Support

The Consumer Support outcome requires that firms provide support that meets customer needs throughout the relationship. The FCA has published [good and poor practice examples](https://www.fca.org.uk/publications/good-and-poor-practice/consumer-support-outcome-good-practices-areas-improvement) drawn from its supervisory work.

The demo implements support in two ways. First, the customer can withdraw at any point in the journey, and the withdrawal is non-destructive: nothing has been submitted to a lender until the explicit pre-contract confirmation step. Second, where a vulnerability indicator is raised, the agent's behaviour changes (slower pacing, plain-language reaffirmation, a route to human escalation) rather than penalising the disclosure. The interaction between this outcome and [vulnerable customer guidance](./vulnerable-customers/) is direct.

## Evidencing the Duty in an agentic journey

The Duty asks a firm to monitor outcomes and act on what it finds. That obligation is heavier than the rules-based framework it replaced because it requires data the firm may not have collected before: drop-off points, comprehension gaps, vulnerability disclosure rates, and outcome distributions across protected characteristics where lawful to measure.

The demo's audit log is structured to support that monitoring. Every step in the journey emits a typed event with a timestamp, the customer's input (where given), the agent's output, and any state transitions. A monitoring layer over those events can compute outcome metrics in something close to real time. The [Replay and evidence](./replay-and-evidence/) page describes the methodology and the open questions around scoring thresholds and drift detection.

## Where the Duty bites hardest

The cross-cutting "avoid foreseeable harm" rule is the one that most directly constrains an agentic system. A model that hallucinates a number, drifts off-script, or fails to handle a vulnerability disclosure causes foreseeable harm in a way that a static disclosure document cannot. The mitigations in the demo are deterministic disclosure rendering (the SECCI is rendered from a template, not generated), explicit guardrails on eligibility outputs, and a replay regime that scores the agent against a held-out evaluation set before deployment. None of these are sufficient on their own; together, they make the Duty's evidence requirement operationally feasible.
