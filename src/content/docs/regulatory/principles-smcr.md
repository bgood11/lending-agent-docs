---
title: Principles and SMCR
description: PRIN 7, 9 and 12, the SMCR, and the broker as model owner.
---

## The Principles

The FCA's [Principles for Businesses (PRIN)](https://www.handbook.fca.org.uk/handbook/PRIN/) are the high-level rules that sit above every sectoral sourcebook. They are short, drafted in plain English, and binding on every authorised firm. The Principles most directly engaged by an agentic broking journey are 7, 9, and 12.

### Principle 7: communications with clients

PRIN 2.1.1R Principle 7 requires that a firm "must pay due regard to the information needs of its clients, and communicate information to them in a way which is clear, fair and not misleading". For products in scope of the Consumer Duty, Principle 7 is replaced by Principle 12 and the Consumer Understanding outcome (which sets a higher bar). For products outside the Duty's scope, Principle 7 continues to apply unchanged.

In an agentic surface, Principle 7 has bite at the moments where the agent paraphrases. The deterministic disclosures (status, SECCI, pre-contract explanation) are rendered from templates. The conversational glue around them (greetings, follow-up answers, plain-language summaries) is generated. Principle 7 demands that the generated layer not introduce material that contradicts or undermines the deterministic layer. The replay regime tests for this.

### Principle 9: customers' relationships of trust

Principle 9 requires that a firm "must take reasonable care to ensure the suitability of its advice and discretionary decisions for any customer who is entitled to rely upon its judgement". A credit broker that is arranging rather than advising is not always inside Principle 9, but the line moves depending on what the agent says. If the agent recommends a particular product on the basis of the customer's circumstances, that looks like advice, and Principle 9 engages.

The demo's design avoids advice. The agent presents the eligibility result, surfaces the lenders that match, and explains the trade-offs in objective terms. It does not say "I recommend lender X". A live deployment would need to keep that line clean; failing to do so would not just engage Principle 9 but could also pull the activity into the regulated activity of advising on regulated credit (article 53(1)(b) of the Regulated Activities Order), which carries its own permission.

### Principle 12: Consumer Duty

Principle 12 is the operative Principle for in-scope products. The full text is short: "A firm must act to deliver good outcomes for retail customers". The detailed mechanics sit in [PRIN 2A](https://www.handbook.fca.org.uk/handbook/PRIN/2A.html) and the [Consumer Duty](./consumer-duty/) page expands on each outcome.

The interaction between Principles 7, 9 and 12 is set out in [FG22/5](https://www.fca.org.uk/publication/finalised-guidance/fg22-5.pdf). The short version: where Principle 12 applies, it imposes a higher and more exacting standard than Principles 6 or 7 would have done; where it does not, Principles 6 and 7 continue. Principle 9 sits alongside Principle 12 rather than being replaced.

## The Senior Managers and Certification Regime

The [Senior Managers and Certification Regime](https://www.fca.org.uk/firms/senior-managers-certification-regime) is the FCA's individual accountability regime. It works by mapping defined senior management functions (SMFs) to named individuals, requiring those individuals to take reasonable steps to prevent regulatory breaches in their area, and giving the FCA a route to take action against the named individual where they fail to do so.

The FCA and PRA have confirmed that the SMCR applies to AI use in regulated firms without modification. The relevant joint posture is captured in the firms' [AI Update](https://www.fca.org.uk/firms/ai-financial-services). For a credit-broking firm using an AI agent in customer journeys, the practical implication is straightforward: a named senior manager owns the agent's behaviour. Most often this will be the SMF holder responsible for the customer-facing function (typically SMF3, SMF16 or SMF17, depending on the firm's structure), supported by SMF24 where the firm has appointed a senior manager for operations or technology.

The "named senior manager" point is doing more work than it appears. The senior manager cannot delegate accountability. They can delegate execution, but if the agent malfunctions and causes consumer harm, the FCA can pursue the senior manager personally. They are obliged to be able to show that they took reasonable steps: validated the model, kept it under review, monitored outcomes, escalated when monitoring flagged drift, and retained the evidence.

Underneath the SMF holder, the [FCA's Conduct Rules](https://www.handbook.fca.org.uk/handbook/COCON/) (COCON) bind every certified person and (in their reduced form) every other employee. Rule 1 ("you must act with integrity") and Rule 4 ("you must pay due regard to the interests of customers and treat them fairly") apply directly to the staff who configure prompts, curate disclosures, review replay artefacts, or sign off model promotions. Configuring an agent is regulated work; firms should treat it that way in their certification population.

## The model-owner concept

It helps to think about responsibility in two layers. The agent is a tool. The broker is the firm. The firm is accountable for the tool's conduct just as it would be for a human broker's conduct. That is the model-owner concept: the firm owns the model in the sense that matters to the regulator, regardless of which vendor built it, which cloud runs it, or which third party supplied the underlying model weights.

The model-owner concept has consequences across the lifecycle:

- **Procurement**: the firm cannot rely on a vendor's compliance attestation in lieu of its own validation. [SYSC 8](https://www.handbook.fca.org.uk/handbook/SYSC/8/) (outsourcing) and the FCA's [operational resilience](https://www.fca.org.uk/firms/operational-resilience) regime under [PS21/3](https://www.fca.org.uk/publications/policy-statements/ps21-3-building-operational-resilience) apply. The agent platform and the model provider are typically inside the firm's mapping of "important business services" and inside its third-party concentration analysis. The firm-level deadline to operate within impact tolerances was 31 March 2025.
- **Validation**: pre-deployment testing, including against vulnerability scenarios, must be documented and repeatable.
- **Monitoring**: post-deployment, the firm must watch outcomes and act on what it sees. Monitoring evidence is the firm's responsibility, not the vendor's.
- **Incident response**: where the agent causes harm, the firm responds. Vendor support is part of the response, not a substitute for it.

The demo's audit log and replay engine are designed to make each layer cheaper. The audit log captures the evidence; the replay engine lets a firm validate a configuration before deployment and re-validate it on a schedule. Neither tool transfers accountability.

## Where broker accountability ends and lender accountability begins

The broker is accountable for the conduct of the journey: status disclosure, eligibility, adequate explanation, vulnerability handling, pre-contract confirmation, and the data passed to the lender. The lender is accountable for the credit decision itself: the creditworthiness assessment under CONC 5, the affordability check, and the ultimate offer.

In the demo, this split is visible in the data. The broker-side audit log records everything up to and including consent and submission. The lender-side decision rationale (in a live deployment) sits with the lender. For the Handbook texts, [PRIN](https://www.handbook.fca.org.uk/handbook/PRIN/) and [PRIN 2A](https://www.handbook.fca.org.uk/handbook/PRIN/2A.html) are authoritative.
