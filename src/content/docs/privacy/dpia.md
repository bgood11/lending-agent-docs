---
title: Data Protection Impact Assessment
description: Why an agentic credit journey almost certainly needs a DPIA, and a scaffold tailored to the Lending Agent demo.
---

A Data Protection Impact Assessment (DPIA) is required under UK GDPR Article 35 when a type of processing is "likely to result in a high risk to the rights and freedoms of natural persons". The ICO's [DPIA guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/) and the linked [When do we need to do a DPIA?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/when-do-we-need-to-do-a-dpia/) page set out the test.

## Why an agentic credit journey clears the threshold

The ICO's screening criteria flag a DPIA as required when processing involves any of nine listed factors. A Lending Agent deployment hits at least five of them simultaneously:

1. **Innovative technology**. An LLM-mediated journey is innovative both as a technology and as an application of an existing technology to a regulated process. The ICO has been explicit that AI applications that influence significant decisions about individuals trigger a DPIA.
2. **Automated decision-making with significant effects**. Even when the final credit decision is made by a lender, the agent's gate decisions (eligibility, quote band, vulnerability routing) produce significant effects in the Articles 22A to 22D sense (the rewritten ADM regime introduced by the [Data (Use and Access) Act 2025](https://www.legislation.gov.uk/ukpga/2025/18/contents/enacted), in force from 5 February 2026). The DUAA framework is more permissive than the original Article 22 but mandates safeguards (information rights, representations, human intervention, contestation), all of which need to be reflected in the DPIA's mitigation register. The ICO's [draft updated guidance](https://ico.org.uk/about-the-ico/ico-and-stakeholder-consultations/2026/03/ico-consultation-on-the-draft-guidance-about-automated-decision-making-including-profiling/) is the working reference; final guidance is expected in 2026.
3. **Special category data**. Vulnerability indicators frequently reveal health information; see [UK GDPR](./uk-gdpr).
4. **Vulnerable data subjects**. Credit applicants in financial difficulty are a recognised vulnerable cohort under the FCA's Consumer Duty.
5. **Large-scale processing**. A retail-finance broker processes large volumes of applications routinely.

Any one of these would warrant a DPIA. The combination makes one mandatory rather than discretionary. A broker deploying Lending Agent should produce, sign off, and keep current a DPIA before going live.

## A scaffold for the DPIA

The ICO publishes a [DPIA template](https://ico.org.uk/media/for-organisations/documents/2553993/dpia-template.docx). The headings below mirror that template and indicate what to fill in for an agentic credit journey.

### 1. Identify the need for a DPIA

State the project name (deployment of Lending Agent), the controller, the processors, the regulatory regime, and the screening criteria triggered above.

### 2. Describe the processing

Use the [data flow](./data-flow) page as the source. Cover:

- the categories of data subjects (UK consumer credit applicants, including potentially vulnerable individuals);
- the categories of personal data (identity, contact, financial, employment, vulnerability indicators);
- the recipients (the broker, the model provider as sub-processor, lenders as separate controllers);
- the retention periods for each storage tier (see [retention](./retention));
- international transfers (Anthropic's UK GDPR posture is covered in [sub-processors](./sub-processors)).

### 3. Consultation

Document who you consulted. The DPO (or DPO-equivalent) must be involved. The ICO expects controllers to seek the views of data subjects "or their representatives" where appropriate; for a credit journey, this typically means user research with applicants and, where vulnerability features are introduced, consultation with charities or advocacy groups.

### 4. Necessity and proportionality

For each Article 6 basis identified in [UK GDPR](./uk-gdpr), assess whether the processing is necessary for that purpose and whether less intrusive alternatives are available. The agentic UI is not less data-hungry than a form on its own; the question is whether the additional surfaces (transcript, tool calls, replay) are proportionate to the benefits.

### 5. Identify and assess risks

A non-exhaustive list:

- **Over-collection through free text**: a customer might disclose more in conversation than a form would prompt them to.
- **Prompt injection**: untrusted text routed into the agent (a paste from email, content fetched from a tool) could attempt to alter the agent's behaviour.
- **Model hallucination**: a model output could fabricate a fact that is then committed to the case state.
- **Re-identification through logs**: token traces, audit identifiers, or replay artefacts could allow re-identification.
- **Sub-processor risk**: data passed to Anthropic transits and may be temporarily logged.
- **Cross-border transfer risk**: see [sub-processors](./sub-processors) for the IDTA / DPF position.
- **Discrimination and bias**: an agent that varies tone or routing by inferred attributes could produce disparate treatment. Beyond UK GDPR's fairness principle, [section 19 of the Equality Act 2010](https://www.legislation.gov.uk/ukpga/2010/15/section/19) prohibits indirect discrimination unless the firm can show its practice is a proportionate means of achieving a legitimate aim. The replay engine (see [safety/model-evaluations](/safety/model-evaluations)) is the operational mechanism for detecting these patterns.

For each risk, score likelihood and severity, identify the affected rights, and decide whether the risk is acceptable, mitigated, or requires consultation with the ICO under Article 36.

### 6. Identify measures to reduce risk

This is where the architecture earns its place. Each of the following is a deliberate mitigation that should appear in the DPIA register.

| Mitigation | What it controls |
| --- | --- |
| Strict state machine over gates | Limits free-text capture to where it is needed; prevents the agent from collecting data outside the documented schema. |
| Reconciliation between transcript and structured state | Catches hallucinated values before they are committed to the case state. |
| Tool catalogue with allow-listed effects | Prevents the agent from invoking destructive or undocumented operations. |
| Replay endpoint with redacted-by-default identifiers | Allows debugging and inspection without re-exposing customer data. |
| Append-only audit log with hashed identifiers | Supports SYSC 9 record-keeping while limiting linkability. |
| Lender payload separated from transcript | Lender receives the answers, not the conversation. |
| Vulnerability indicators as counts, with optional contractual basis | Limits special category data to what is necessary. |
| Withdraw flow at every gate | Operationalises Article 7 withdrawal of consent and Article 21 objection. |
| Anthropic API with no training and short retention | Sub-processor cannot use customer data to improve a model. |

### 7. Sign off and record outcomes

The DPIA should be signed by the DPO or equivalent and the senior accountable owner. It is a living document: re-open it whenever the model, the prompt, the tool catalogue, or the data set changes materially.

The DPIA does not need to be sent to the ICO unless residual risk remains high after mitigation, in which case Article 36 requires prior consultation.
