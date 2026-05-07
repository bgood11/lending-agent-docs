---
title: UK GDPR
description: Lawful bases, special category conditions, and data subject rights as they apply to an agentic credit broking journey.
---

This page maps Lending Agent's processing onto the lawful bases under UK GDPR Article 6, the special category conditions under Article 9, and the data subject rights under Articles 12 to 22. The authoritative ICO reference is the [Lawful basis for processing](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-uk-gdpr/lawful-basis-for-processing/) guide.

## Article 6: choosing a lawful basis

UK GDPR Article 6(1) sets out six lawful bases. A controller must identify one before processing begins, document it, and inform the data subject:

1. **Consent**: freely given, specific, informed, unambiguous, and demonstrable.
2. **Contract**: necessary for performance of a contract with the data subject, or for steps taken at their request prior to entering one.
3. **Legal obligation**: necessary to comply with a UK legal obligation other than a contract.
4. **Vital interests**: necessary to protect someone's life.
5. **Public task**: necessary for a task carried out in the public interest or in the exercise of official authority.
6. **Legitimate interests**: necessary for the legitimate interests pursued by the controller or a third party, except where overridden by the rights and interests of the data subject.

For credit broking, the realistic candidates are contract, legal obligation, and legitimate interests. Consent is reserved for the narrow steps where it is the appropriate basis. The mapping below is the recommended posture for a broker deploying Lending Agent.

| Step | Recommended Article 6 basis | Rationale |
| --- | --- | --- |
| Eligibility check | 6(1)(b) Contract (pre-contractual steps) | The customer asks for a finance quote; the eligibility check is a step taken at their request. |
| Quote generation | 6(1)(b) Contract (pre-contractual steps) | Same chain. |
| Application capture | 6(1)(b) Contract | Necessary to complete the application the customer has initiated. |
| Vulnerability prompt | 6(1)(c) Legal obligation, supported by 6(1)(f) | Aligns with the FCA Consumer Duty's expectations on identifying vulnerable customers. |
| Credit reference search | 6(1)(b) Contract, with explicit consent for the CRA share | The CRA framework requires specific consent in addition to the controller's lawful basis. |
| Audit log | 6(1)(c) Legal obligation | Required by FCA SYSC 9 and CONC record-keeping. |
| Lender submission | 6(1)(b) Contract | Direct continuation of the journey the customer initiated. |
| Internal model improvement | 6(1)(f) Legitimate interests, after a balancing test | Only with strict minimisation; never on raw transcripts. |

The basis must be documented before processing and surfaced in the privacy notice. Switching basis after the fact is hard to defend.

## Article 9: special category data

Vulnerability indicators frequently reveal information about physical or mental health, which is special category data under Article 9. The general rule is that special category processing is **prohibited** unless one of the conditions in Article 9(2) applies. The ICO sets out [the rules on special category data](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-are-the-rules-on-special-category-data/) and the ten conditions.

For Lending Agent the realistic conditions are:

- **Article 9(2)(a) Explicit consent**: the customer is told clearly that the answer reveals health information, and they affirmatively choose to share it.
- **Article 9(2)(g) Substantial public interest**: with a basis in UK law, supported by Schedule 1 of the [Data Protection Act 2018](https://www.legislation.gov.uk/ukpga/2018/12/contents/enacted). The "preventing or detecting unlawful acts" and "regulatory requirements" conditions can be relevant where vulnerability handling is itself a regulatory expectation.

Either route requires an Appropriate Policy Document, retention limits, and additional safeguards under the DPA 2018. The agent's design supports this by storing indicator counts in a structured field and treating any free-text elaborations as transient transcript content with shorter retention.

You must always identify **both** an Article 6 basis **and** an Article 9 condition for the same processing. They are cumulative, not alternative.

## Data subject rights

Articles 12 to 22 give data subjects a set of rights. The agentic context affects how each is operationalised but does not change what is owed.

- **Right to be informed (Articles 13 to 14)**: the privacy notice must cover the agent. The agent itself reinforces this with status disclosure: at the start of the journey it confirms it is an AI assistant acting on behalf of the named broker, and at every gate where it captures personal data it confirms what is being captured and why.
- **Right of access (Article 15)**: a subject access request must return not just the structured application data but also the transcript content, the audit log entries, and any pseudonymised identifiers that resolve to the customer. The case-state model is designed to support a single export.
- **Right to rectification (Article 16)**: the customer can correct any structured field via the conversation. Corrections are written to the audit log alongside the original value so the rectification is itself accountable.
- **Right to erasure (Article 17)**: see [retention](./retention) for how this interacts with the FCA's record-keeping rules. The right is not absolute where another legal obligation applies.
- **Right to restriction (Article 18)** and **right to data portability (Article 20)** apply in their usual form. Portability is handled by exporting the structured case state in a machine-readable format.
- **Right to object (Article 21)** applies primarily to legitimate-interests processing, which the agent uses sparingly.
- **Right not to be subject to a solely automated decision (Articles 22A to 22D)**: this is the live wire for any agentic credit journey. The [Data (Use and Access) Act 2025](https://www.legislation.gov.uk/ukpga/2025/18/contents/enacted) repealed the original Article 22 and replaced it with a four-Article regime that came into force on 5 February 2026. The new position is more permissive in shape (a controller may rely on legitimate interests, contract, or consent for solely automated decisions producing legal or similarly significant effects, rather than the previous near-prohibition) but it is mandatorily safeguard-led: the data subject must be given information about the decision, the ability to make representations, the right to obtain meaningful human intervention, and the right to contest the decision. Special category data still triggers the stricter regime in Article 22C, which requires explicit consent or a legal basis. The recommended posture for Lending Agent remains that the agent does not make the final lending decision: it brokers the application to a lender, which applies its own underwriting. Where any step in the journey could be characterised as a solely automated decision with significant effect (an eligibility cut-off, a vulnerability-driven block), the broker should document the safeguards and surface them to the customer. The ICO is consulting on revised [automated decision-making guidance](https://ico.org.uk/about-the-ico/ico-and-stakeholder-consultations/2026/03/ico-consultation-on-the-draft-guidance-about-automated-decision-making-including-profiling/) reflecting these amendments; firms should track the final version when published.

## Right to be informed: how the agent's status disclosure satisfies it

Articles 13 and 14 require specific information at the point of collection. A static privacy notice carries most of the load, but a conversational interface adds an opportunity for **just-in-time transparency**: the agent confirms, in the user's own conversation, what it is about to capture and why, before each substantive gate. This pattern is consistent with ICO guidance on transparency and works well for the cohort that does not read privacy notices upfront. It does not replace the privacy notice; it complements it.
