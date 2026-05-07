---
title: Vulnerable customer protection
description: How the FCA FG21/1 framework and Consumer Duty obligations are implemented in code, not just in policy.
---

The [FCA's finalised guidance on the fair treatment of vulnerable customers (FG21/1)](https://www.fca.org.uk/publications/finalised-guidance/guidance-firms-fair-treatment-vulnerable-customers) defines a vulnerable customer as someone who, due to their personal circumstances, is especially susceptible to harm, particularly when a firm is not acting with appropriate levels of care. The guidance asks firms to understand their target market, equip staff to recognise vulnerability, design products and communications around the needs of vulnerable customers, and monitor outcomes.

The [FCA's AI Update](https://www.fca.org.uk/publication/corporate/ai-update.pdf) (April 2024) makes clear that AI does not modify these obligations. A firm using AI in customer-facing journeys must still detect vulnerability signals and route customers appropriately. The [regulatory/vulnerable-customers](/regulatory/vulnerable-customers) page sets out the rule context; this page describes how Lending Agent implements the controls in code.

## Design principles

Three principles shape the implementation:

1. **Self-declared, never inferred.** Vulnerability is not inferred from conversational vibes. The customer either declares it through an explicit affordance or they do not.
2. **Never penalises.** A vulnerability flag does not change eligibility, price, or approval. It changes how the journey runs and what support is offered.
3. **Minimum disclosure.** Information leaves the customer's screen only when there is a regulated reason for it to do so. Counts and presence are shared more readily than specific items.

Each principle maps to a specific code surface.

## The vulnerability indicator card

The vulnerability indicator is an opt-in card that the customer can complete during the journey. It offers a short list of categories drawn from FG21/1's drivers of vulnerability (health, life events, resilience, capability) and lets the customer mark any that apply. The categories are written in plain language; the model is not in the loop.

Three properties of the card matter for safety:

- **It is opt-in.** The customer can complete the journey without ever opening the card. There is no nudge that pressures completion.
- **It does not affect the credit decision.** The deterministic decision-engine never reads the vulnerability flags. They live in a separate, parallel record.
- **It informs broker support, not pricing.** A flag opens up support options (slower pace, alternative formats, signposting to debt advice) and surfaces in the broker's review screens.

The card is implemented as a UI affordance with its own structured submission path, not via the chat. The model can mention that the card exists and explain what it is for, but it cannot fill it in on the customer's behalf.

## What the system prompt says

[`lib/system-prompts.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/system-prompts.ts) explicitly tells the model not to infer vulnerability from conversational tone. If a customer mentions they are tired, stressed, or going through a difficult time, the model acknowledges it as a person would and offers to slow down. It does not write a "vulnerability detected" tag. It does not change its description of the offer. It does not unlock different content.

This is deliberate. Inferred vulnerability flags would be an LLM-driven characterisation of a person, with all the unreliability that implies, attached to a regulated record. Self-declaration is the only path that produces a flag.

## Counts, not specifics

In screens shared with the broker side (and any aggregate views that exist), the vulnerability indicator surfaces as a count or a presence flag, not as the specific categories the customer ticked. The detail stays with the customer's record and is accessed only when a specific support pathway requires it.

This implements the FG21/1 expectation that information be used proportionately for the support need at hand, not as a general profiling mechanism.

## Withdraw at any time

The customer can withdraw at any point in the journey. There is no friction wall, no "are you sure" loop intended to dissuade, and no penalty for withdrawing. The application returns to a non-submitted state, the audit log records the withdrawal, and the customer can leave.

This is a vulnerability protection in the FG21/1 sense. A customer who is overwhelmed or unsure should be able to exit gracefully without a feeling of pressure. It is also a Consumer Duty consumer-support outcome: the journey supports the customer in acting in their own interest.

## Decline-with-debt-advice signposting

Where the deterministic decision-engine declines an application, the experience is not just "no". The decline is paired with a clear explanation in the language of FG21/1's communications principle, plus signposting to free debt advice services (StepChange, MoneyHelper, Citizens Advice).

The signposting is a verbatim disclosure (see [hallucination](/safety/hallucination)) so the wording is fixed. The model narrates the decline; the disclosure carries the regulated content.

This addresses the Consumer Duty consumer support outcome directly: a declined customer in a vulnerable circumstance is more likely to need help than a declined customer in good health, and the signposting is not gated on a vulnerability flag. Everyone who is declined gets it.

## Pace and format

The chat surface is a high-bandwidth channel for a customer who finds reading and writing easy. It is not the only channel for a customer who finds it harder. Two design choices flow from this:

- The model's default register is plain UK English, short sentences, no jargon. The system prompt enforces this.
- The verbatim disclosure registry includes alternative-format references where regulator practice expects them.

These are not AI features; they are product features that the AI is instructed to respect.

## How this maps to the FCA framework

In the language of [FG21/1](https://www.fca.org.uk/publications/finalised-guidance/guidance-firms-fair-treatment-vulnerable-customers):

- **Understanding the needs of the target market**: target market work happens upstream of the demo, but the journey is designed for the cohort of point-of-sale-finance applicants the broker serves.
- **Skills and capability**: the AI's "skills" are codified in the system prompt and tested by the replay engine.
- **Practical action**: the indicator card, withdraw-at-any-time, signposting, plain-language register.
- **Monitoring and evaluation**: the audit log captures every interaction at the level needed to evidence outcomes.

In the language of the [Consumer Duty (PS22/9)](https://www.fca.org.uk/publications/policy-statements/ps22-9-new-consumer-duty) and its non-Handbook guidance [FG22/5](https://www.fca.org.uk/publication/finalised-guidance/fg22-5.pdf), the four outcomes (products & services, price & value, consumer understanding, consumer support) are addressed respectively by the deterministic decision-engine, the price calculation in the engine, the verbatim disclosures and plain-language register, and the indicator card plus signposting. See [regulatory/consumer-duty](/regulatory/consumer-duty) for the rule mapping.

## Where to look in the code

- [`lib/system-prompts.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/system-prompts.ts): the no-inference rule, the plain-language register, the pacing instructions.
- [`lib/disclosures.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/disclosures.ts): the decline-and-signpost text, in verbatim form.
- [`lib/audit.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/audit.ts): how flags, withdrawals, and signposting events are recorded.
