---
title: Vulnerable customers
description: FG21/1's four drivers, the demo's vulnerability indicator card, and the do-not-penalise principle.
---

## FG21/1 in summary

The FCA's [Finalised Guidance FG21/1](https://www.fca.org.uk/publications/finalised-guidance/guidance-firms-fair-treatment-vulnerable-customers) on the fair treatment of vulnerable customers is the canonical UK reference. It defines a vulnerable customer as someone who, due to their personal circumstances, is especially susceptible to harm, particularly when a firm is not acting with appropriate levels of care. The guidance describes vulnerability as a spectrum of risk: every customer is potentially vulnerable, and the question is how the firm responds when the indicators present.

The FCA's [Financial Lives surveys](https://www.fca.org.uk/publications/financial-lives) have repeatedly found that more than half of UK adults show one or more characteristics of vulnerability at any time. That volume rules out any approach based on labelling a small subset of customers as vulnerable; the obligation runs across the whole book.

## The four drivers

FG21/1 organises the indicators of vulnerability into four drivers. Each driver maps to several indicators, and a single customer may present in multiple drivers at once.

- **Health**: physical disability, mental-health conditions, addictions, hearing or visual impairments, cognitive impairment, conditions that affect cognitive load.
- **Life events**: bereavement, separation, redundancy, caring responsibilities, change in immigration status, criminal-justice events.
- **Resilience**: low or volatile income, over-indebtedness, low savings, exposure to economic shocks.
- **Capability**: low literacy or numeracy, low digital confidence, limited English, low financial literacy or experience with the product.

The guidance is explicit that these are drivers, not categories. A customer is not "a vulnerable customer"; the customer has indicators that, together with the product and the channel, raise the risk of harm.

## The demo's vulnerability indicator card

The Lending Agent journey includes an explicit vulnerability check step. The customer is asked whether anything in their current circumstances might affect their ability to manage repayments or to engage with the rest of the journey. The phrasing is deliberately broad and does not name any particular condition; the structure follows FG21/1's preference for open-ended disclosure over checklist categorisation.

When the customer discloses an indicator, the agent does three things:

1. **Acknowledges the disclosure** in plain language and confirms what will happen with the information.
2. **Adapts the journey** by slowing pacing, repeating key terms, and offering a route to a human handler. Where the indicator suggests the journey should not continue at all (for example, the customer mentions being in a debt management plan), the agent stops the journey and signposts to free debt advice.
3. **Records the disclosure** in the audit log, with the customer's consent to retain it for the duration of the case.

The card itself is a structured artefact. It records the driver category, the customer's verbatim disclosure (where given), the agent's response, and any state transitions that resulted. A reviewer can ask, for any case, "how did the agent handle the vulnerability disclosure?" and receive a deterministic answer.

## Do not penalise the disclosure

The most-cited principle in FG21/1 is that disclosure of a vulnerability indicator should never make the customer's outcome worse. A customer who tells a broker they have ADHD should not, on that basis, be excluded from products they would otherwise qualify for. A customer who mentions a recent bereavement should not be hurried through the journey because they have flagged emotional distress.

This is operationally awkward for any system that uses customer-disclosed information to gate decisions. The demo handles it by separating two surfaces:

- **The eligibility surface**: which uses customer-supplied financial data (income, outgoings, employment status, address history) to compute lender eligibility. Vulnerability indicators do not feed this surface.
- **The support surface**: which adapts the agent's behaviour (pacing, escalation, signposting) based on vulnerability indicators. The support surface never reduces the customer's eligibility, only changes how the journey is conducted.

The separation is enforced at the data layer. The lender adapters do not see the vulnerability card. A reviewer can verify this by inspecting the adapter inputs in the audit log.

## Interaction with Consumer Duty's Consumer Support outcome

FG21/1 predates the Consumer Duty by two years, but the two regimes interlock cleanly. The Consumer Duty's [Consumer Support outcome](./consumer-duty/) requires that firms provide support that meets customer needs throughout the relationship; FG21/1 specifies what "needs" looks like for customers with vulnerability indicators.

In the demo, that means the support surface is not optional. A customer who discloses a low-capability indicator (limited English, low digital confidence) gets a different journey from a customer who discloses none, even if the eligibility outcome is identical. The Consumer Duty obliges this; FG21/1 specifies it; the agent implements it.

## Where the demo's handling is deliberately limited

A live deployment would need to extend the demo's vulnerability handling in several directions, none of which are present in the research artefact:

- **Trained human escalation paths**: with FG21/1-aware agents on the receiving end. The demo signposts but does not connect.
- **A formal vulnerability framework** at firm level, including governance, training, and reporting per FG21/1's expectations.
- **Outcomes monitoring** that compares case results across vulnerability indicators to detect any pattern of disadvantage.
- **Data retention rules** consistent with [ICO guidance on AI and data protection](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/guidance-on-ai-and-data-protection/), particularly for special-category data (health) where Article 9 of the UK GDPR sets a higher bar.

The demo is a starting point. The work of treating vulnerable customers fairly does not stop at the journey design; it runs through the whole firm.
