---
title: FCA AI strategy
description: The AI Update, AI Lab, and AI Live Testing, mapped to the demo's audit and replay design.
---

## The FCA's stated posture

The FCA's policy posture on AI is technology-neutral and outcomes-focused. The position is set out in the [AI Update](https://www.fca.org.uk/publication/corporate/ai-update.pdf) of 22 April 2024 (and summarised on the FCA's [AI in financial services](https://www.fca.org.uk/firms/ai-financial-services) hub) and reinforced through the [AI Lab](https://www.fca.org.uk/firms/innovation/ai-lab) initiative. The headline is short: existing rules apply. The FCA has not announced a separate AI rulebook for financial services. Instead, it has confirmed that the [Senior Managers and Certification Regime](https://www.fca.org.uk/firms/senior-managers-certification-regime), the Consumer Duty, the Principles, and the sectoral sourcebooks (CONC included) are all in force unchanged for AI-mediated activity.

That posture has two practical consequences. First, a firm cannot point to "the AI rulebook" as a discrete compliance target; it must demonstrate that its AI use respects every existing rule that bears on the activity in question. Second, supervisory expectations crystallise around three themes the regulator has named explicitly: explainability, governance, and monitoring.

## AI Update (April 2024)

The [AI Update](https://www.fca.org.uk/publication/corporate/ai-update.pdf) is the FCA's response to the UK Government's AI White Paper. It maps existing FCA rules to the cross-sector AI principles set out by the Government (safety, transparency, fairness, accountability, contestability) and identifies where supervisory attention will concentrate. For consumer-facing AI use, three points stand out:

1. The Consumer Duty (and especially the Consumer Understanding outcome) requires that firms can show their AI systems do not degrade the customer's ability to understand the product on offer.
2. The SMCR makes a named senior manager personally accountable for the conduct of AI systems within their function. There is no "the model did it" defence.
3. Operational resilience expectations apply to AI systems on the same footing as any other important business service.

The AI Update is a deliberately light-touch document. It does not specify metrics or thresholds; it tells firms that the rules apply and that the regulator will judge outcomes, not architectures.

## AI Lab and AI Live Testing

The [AI Lab](https://www.fca.org.uk/firms/innovation/ai-lab) is a programme inside the FCA's Innovation Services aimed at supporting firms developing AI in financial services. Its components include:

- **AI Sprints**: short, focused supervisory engagements on a particular AI question.
- **AI Spotlights**: thematic publications surfacing what the FCA is seeing.
- **Supercharged Sandbox**: a sandbox environment, supported by NVIDIA, that lets firms test compute-intensive AI workloads with regulatory engagement.
- **AI Live Testing**: a controlled deployment programme allowing firms to put AI into live customer interactions under supervisory observation.

AI Live Testing was confirmed in [FS25/5](https://www.fca.org.uk/publications/feedback-statements/fs25-5-ai-live-testing) (September 2025), with the first cohort selected later that month and a second cohort announced subsequently. The programme is the closest the UK has to a formal pre-deployment review for consumer-facing AI; participation is voluntary and selective.

The Lending Agent demonstrator is not in any FCA programme. It is a research artefact, not a regulated production service. The point of mapping its design to the AI Lab's published expectations is to make the artefact useful to a firm that does want to engage with the Lab, by giving them a starting evidence package.

## Three supervisory expectations, mapped to the demo

The AI Update names three areas where the FCA expects firms to be able to evidence their work: explainability, governance, and monitoring.

### Explainability

The supervisory expectation is that a firm can explain to a customer (and to the regulator) why a particular outcome was produced. For an agentic broking journey, "explanation" has two parts: explaining the journey (what happened, in what order, on what input) and explaining the lender's decision (which is the lender's obligation under CONC 5).

The demo's audit log gives a deterministic answer to the first part. Every step emits a typed event with timestamps, inputs, agent outputs, and state transitions; a journey can be reconstructed from the log without recourse to the model. The lender's decision, for the demo's scripted lender adapters, is also fully traceable; in a live deployment, the broker would need to ensure each lender exposes a decision rationale that can be relayed to the customer.

### Governance

The supervisory expectation is that a named senior manager owns the AI system's behaviour, that there is a documented model lifecycle (development, validation, deployment, monitoring, retirement), and that the firm can show how it would respond to a model-level incident. The [Principles and SMCR](./principles-smcr/) page goes into the accountability piece in more detail.

The demo's contribution to this is the version-pinning regime: the agent, the rubric, and the evaluation set are all versioned together, so that a deployed configuration can be reproduced exactly. A firm using this pattern can show its supervisor not just "what we deployed" but "what we tested, against what rubric, with what pass rate, on what date, signed off by whom".

### Monitoring

The supervisory expectation is that the firm watches outcomes in something close to real time and acts on what it sees. The demo's replay engine is the monitoring spine: it can re-score historical cases against the current rubric to detect regression, and it can re-score new cases against historical rubrics to detect drift in the agent's behaviour. The methodology and its open questions are set out on the [Replay and evidence](./replay-and-evidence/) page.

## The demo as an evidence package, not a permission

Nothing in the FCA's AI work removes the underlying authorisation requirement. A firm offering credit broking as a service must still be authorised under FSMA, must still meet the threshold conditions, and must still satisfy the conduct rules in CONC and the Duty. AI-specific tooling is additive; it does not substitute for authorisation. The Lending Agent demonstrator is positioned to make the additive evidence cheaper to produce, not to remove any layer of regulatory work below it.

For the most current view of the FCA's AI position, the canonical references are the [AI Update](https://www.fca.org.uk/publication/corporate/ai-update.pdf) PDF (22 April 2024), the [AI in financial services](https://www.fca.org.uk/firms/ai-financial-services) hub, and the [AI Lab](https://www.fca.org.uk/firms/innovation/ai-lab) programme pages. Where AI-mediated journeys cross regulatory remits (FCA conduct, ICO data protection, CMA competition, Ofcom online safety), the [DRCF AI and Digital Hub](https://www.drcf.org.uk/ai-and-digital-hub) offers a cross-regulator route for queries.

## Adjacent regulatory frameworks worth tracking

The AI Update sits inside a wider regulatory ecosystem. Three adjacent threads matter for an AI-mediated credit journey:

- **ICO AI guidance and the rewrite of Article 22**. The [Data (Use and Access) Act 2025](https://www.legislation.gov.uk/ukpga/2025/18/contents/enacted) repealed Article 22 of the UK GDPR and replaced it with Articles 22A to 22D. The new regime is more permissive (legitimate interests can support solely automated decisions for non-special-category data) but mandates safeguards: information rights, the right to make representations, the right to obtain human intervention, and the right to contest decisions. The ICO consulted in 2026 on updated [automated decision-making guidance](https://ico.org.uk/about-the-ico/ico-and-stakeholder-consultations/2026/03/ico-consultation-on-the-draft-guidance-about-automated-decision-making-including-profiling/) reflecting this change; brokers should track the final version.
- **Operational resilience under PS21/3**. The [PS21/3 framework](https://www.fca.org.uk/publications/policy-statements/ps21-3-building-operational-resilience) requires firms to identify important business services, set impact tolerances, and remain within them. For a broker whose customer journey runs on an AI-mediated surface, the agent platform and the model provider sit on the critical path of an important business service and should be inside the firm's mapping, third-party concentration analysis, and severe-but-plausible scenario testing. The FCA's deadline for firms to operate within impact tolerances passed on 31 March 2025.
- **Equality Act 2010**. AI systems can produce indirectly discriminatory outcomes under [section 19 of the Equality Act 2010](https://www.legislation.gov.uk/ukpga/2010/15/section/19) where a facially neutral practice disadvantages a group sharing a protected characteristic. The replay engine's drift and counterfactual modes (see [replay and evidence](./replay-and-evidence/)) are the operational mechanism by which a firm can satisfy itself that its journey does not produce such patterns; objective justification under section 19 still requires the firm to be able to show that any disparate effect is a proportionate means of achieving a legitimate aim.
