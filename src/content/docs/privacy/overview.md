---
title: Privacy overview
description: The UK privacy landscape for AI-mediated consumer credit broking and how Lending Agent maps onto it.
---

Lending Agent is a working demonstration of agentic credit broking: an LLM-mediated journey that takes a UK consumer from initial enquiry, through eligibility, to a fully populated credit application. The agent processes a tightly scoped set of personal data (name, date of birth, address history, employment status, income, regular outgoings, credit-search consent, and optional vulnerability indicators), brokers a soft search, and hands a structured payload to a lender for a hard underwriting decision.

This section is written for FCA-regulated brokers, retailers operating point-of-sale finance, lenders, and anyone performing the data protection officer (DPO) function. It assumes you already understand UK consumer credit law and want a focused view of how the agent's architecture interacts with the privacy regime.

## The applicable legal framework

A broker deploying Lending Agent is operating inside a layered regulatory stack. The relevant instruments are:

- The **UK GDPR**: which is the retained version of Regulation (EU) 2016/679 as it forms part of UK law. It sets out the principles, lawful bases, data subject rights, and accountability obligations.
- The **Data Protection Act 2018** (DPA 2018), which supplements UK GDPR, sets out conditions for processing special category data under Schedule 1, and provides the regulatory powers of the [Information Commissioner's Office](https://ico.org.uk/).
- The **Privacy and Electronic Communications Regulations 2003** (PECR), which governs electronic marketing, cookies, and similar storage technologies. Some elements of a credit-broking journey (the SMS link to the customer surface, the optional emailed copy of the agreement) sit squarely under PECR rather than under UK GDPR alone.
- The **Data (Use and Access) Act 2025** ([c. 18](https://www.legislation.gov.uk/ukpga/2025/18/contents/enacted)), which has amended parts of UK GDPR. The data-protection reforms commenced on 5 February 2026 and include a rewrite of Article 22 into Articles 22A to 22D (a more permissive but safeguard-led automated decision-making regime) and various changes to legitimate interests, research processing, and complaints handling. The ICO is consulting on updated [automated decision-making guidance](https://ico.org.uk/about-the-ico/ico-and-stakeholder-consultations/2026/03/ico-consultation-on-the-draft-guidance-about-automated-decision-making-including-profiling/) reflecting these changes; the consultation closes on 29 May 2026.

Sector rules sit on top of this. A regulated credit broker remains subject to the [FCA's CONC sourcebook](https://www.handbook.fca.org.uk/handbook/CONC/) (notably CONC 4 on pre-contract disclosures and [CONC 5.2A](https://www.handbook.fca.org.uk/handbook/CONC/5/2A.html) on creditworthiness), to [SYSC 9](https://www.handbook.fca.org.uk/handbook/SYSC/9/) on record-keeping, and to the [Money Laundering, Terrorist Financing and Transfer of Funds (Information on the Payer) Regulations 2017](https://www.legislation.gov.uk/uksi/2017/692/contents) (MLR 2017) for customer due diligence and record-keeping where the broker is within scope. Privacy obligations and conduct obligations interact: the same document might need to be retained under SYSC 9 or MLR 2017 (which requires CDD records to be kept for five years from the end of the business relationship) and minimised under UK GDPR Article 5(1)(c), and the resolution of that tension is a substantive privacy-design decision. See [retention](./retention) for how Lending Agent resolves it field-by-field.

## Controllers, processors, and the agent

The controller and processor distinction is the load-bearing concept for any deployment.

- **The broker firm is a data controller.** The broker decides the purposes (assessing creditworthiness, submitting an application, complying with FCA rules) and the essential means (which lenders sit on the panel, which data fields are collected). The broker is the entity the customer can hold to account.
- **The retailer can be a separate controller** when it sources the customer, captures the seed data (basket value, customer name, email, mobile), and decides whether to offer finance. In a typical point-of-sale arrangement the retailer and the broker operate as **independent controllers** with a defined hand-off, not as joint controllers, and they should record this clearly in a data sharing agreement.
- **The agent platform (the Lending Agent codebase running on Vercel)** acts as a **processor** for the broker controller in respect of customer-supplied data. It executes the broker's documented instructions (the system prompt, the state machine, the tool catalogue) and does not determine purposes of its own.
- **The model provider, Anthropic**: is a **sub-processor** when the broker uses the Anthropic API directly, or a sub-processor of a sub-processor when the broker uses Vercel's AI Gateway. Either way, the broker controller must contractually flow down its UK GDPR Article 28 obligations and authorise the sub-processor in writing.
- **The lender is a separate controller** for the underwriting decision and the regulated credit agreement that follows. The hand-off from broker to lender is a controller-to-controller transfer and must have its own lawful basis, transparency, and minimisation analysis.

Mapping these roles before you deploy is not a paperwork exercise. It determines who answers a subject access request, who pays a fine, and who must run a DPIA.

## Why an agentic journey changes the surface but not the category

A common misconception is that introducing an LLM into a credit journey creates a new regulatory category of processing. It does not. Assessing a person's creditworthiness has always been processing of personal data for the purposes of UK GDPR; the lawful bases, the rights, and the principles are the same.

What an agentic journey does change is the **processing surface**. The transcript of a conversation contains personal data. Tool-call arguments and structured outputs contain personal data. Token counts, model versions, and replay artefacts can all be linkable to a data subject. The novel contribution of this documentation is to walk through each of those new surfaces and show what changes, what does not, and where existing ICO guidance already gives a clear answer.

The remaining pages in this section take that approach. Read [data flow](./data-flow) for what is collected and where it travels, [UK GDPR](./uk-gdpr) for lawful bases, [DPIA](./dpia) for whether you need an impact assessment, [data minimisation](./data-minimisation) for the design choices that keep the dataset small, [retention](./retention) for how long things stay around, [sub-processors](./sub-processors) for the model provider relationship, and [PECR and cookies](./pecr-and-cookies) for messaging and storage on the customer surface.
