---
title: Sub-processors
description: How Anthropic fits into the processor chain, the cross-border transfer position, and the broker's sub-processor management duties.
---

The model provider is the most consequential sub-processor in any LLM-backed product. This page sets out how Anthropic fits into the Lending Agent processor chain, how data retention and training opt-out work for API customers, the cross-border transfer position under UK GDPR, and what a broker controller must do to discharge its sub-processor management duties.

## The chain

For a typical Lending Agent deployment:

- The **broker** is the controller.
- The **agent platform** (Lending Agent code running on Vercel infrastructure) is a processor for the broker.
- **Anthropic** (or Anthropic via Vercel's AI Gateway) is a sub-processor that processes inputs and outputs to generate model responses.
- Hosting and storage providers (Vercel, the broker's chosen database, the broker's chosen log destination) are further sub-processors for their specific scope.

Article 28 of the UK GDPR requires a written contract between controller and processor, and equivalent flow-down to each sub-processor. The controller authorises sub-processors in writing (general or specific authorisation, with the same downstream obligations).

## Anthropic's commercial API posture

Anthropic publishes its [commercial terms](https://www.anthropic.com/legal/commercial-terms) and a Data Processing Addendum that govern API use. The key points relevant to a broker controller are:

- **No training on customer content**. The commercial terms state that Anthropic "may not train models on Customer Content from Services". This is a contractual commitment, not a setting that needs to be toggled, and it applies to both inputs and outputs sent through the API. This is the core distinction between commercial API use and consumer products.
- **Customer ownership**. The terms confirm the customer retains rights to inputs and owns outputs.
- **Default API log retention**. For standard commercial API use, inputs and outputs are retained for a limited period for abuse-monitoring purposes. The retention window has tightened over time; it has been reported that standard log retention reduced from 30 days to a shorter window in 2025. Verify the current published retention with Anthropic's documentation before you rely on a specific number in your DPIA.
- **Zero Data Retention (ZDR)**. For qualifying enterprise customers, Anthropic offers a ZDR mode in which logs are not retained beyond what is needed for synchronous abuse screening. Where the broker can secure ZDR, this should be reflected in the DPIA mitigation register.

Confirm any of these specifics with the live Anthropic Privacy Center and the version of the DPA in force at the time you sign. The shape is stable; the exact numbers move.

## Cross-border transfers under UK GDPR

Anthropic is a US company and processes API traffic through US-based infrastructure. Sending UK personal data to a US sub-processor is a "restricted transfer" under UK GDPR Chapter V and requires an appropriate safeguard. The ICO's [international transfers](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/) guidance sets out the available routes:

- **Adequacy**. The UK government has approved a UK Extension to the EU-US Data Privacy Framework. Where the receiving organisation is certified to the DPF and the UK Extension, transfers can rely on the [adequacy regulations](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/adequacy-regulations/) for those flows.
- **International Data Transfer Agreement (IDTA)** or **EU SCCs plus UK Addendum**. Where adequacy is not in play, Article 46 standard data protection clauses provide the appropriate safeguard. The ICO publishes the [IDTA](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/appropriate-safeguards/what-are-standard-data-protection-clauses-the-uk-idta-and-the-addendum/).
- **Transfer Risk Assessment**. Whichever route you use, the controller must perform and document a transfer risk assessment that considers the destination country's law, the data, and the recipient.

Confirm with Anthropic which mechanism it relies on for your traffic. The DPA typically incorporates SCCs / IDTA by reference and may rely on the DPF where relevant.

## Sub-processor management duties for the broker

Engaging a sub-processor is not a one-time act. Article 28 imposes ongoing obligations on the controller. A broker deploying Lending Agent should treat the following as a checklist.

1. **Maintain a sub-processor register**. Record each sub-processor, the data categories they process, the location, the transfer mechanism, and the contract identifier.
2. **Authorise in writing**. The processing agreement with the agent platform should list authorised sub-processors and require advance notice of any addition or replacement, with a right to object.
3. **Flow down obligations**. Confirm that each sub-processor agreement contains the Article 28(3) clauses: documented instructions only, confidentiality, security, sub-sub-processor restrictions, assistance with subject rights, breach notification, deletion or return at end of services, and audit rights.
4. **Run due diligence at onboarding**. Review the sub-processor's published security posture, certifications (SOC 2, ISO 27001), DPA, and breach history. Document the assessment.
5. **Monitor on a cadence**. Re-review at least annually. Subscribe to the sub-processor's status page. Track regulatory enforcement against them.
6. **Test rights handling**. Confirm that the sub-processor can meet a subject access request, an erasure request, and a breach notification within the timelines required by your DPA.
7. **Plan for the alternative**. If your model provider becomes unavailable or unsuitable, what is the fallback? An agentic product with a hard dependency on a single provider is also a privacy concentration risk.

## What this means for the customer

The customer-facing privacy notice should name Anthropic (or whichever model provider is in use) as a sub-processor, the categories of data shared, the transfer mechanism, and a route to obtain further information. ICO transparency expectations support naming sub-processors that have a material role in the processing, even if a strict reading of Article 13 only requires categories of recipients.
