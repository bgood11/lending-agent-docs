---
title: Safety overview
description: How Lending Agent combines a probabilistic language model with a deterministic state machine to deliver an auditable consumer credit broking journey.
---

Lending Agent is an AI-mediated consumer credit broking demo. A customer who has been offered finance at point of sale arrives via a one-time link, has a conversation with an agent, sees a decision, and (if approved) signs an agreement. The agent is powered by a large language model. The regulated outcomes (eligibility, disclosure, decision, audit) are not. The safety story rests on that separation.

This page is the entry point for technical reviewers, broker risk teams, retailer security teams, and auditors. Each linked sub-page is written to be readable on its own and to map cleanly to the relevant industry frameworks.

## The architectural premise

The model is a narrator. Its job is to explain, gather information conversationally, and emit structured event tags that signal customer intent. The model never decides whether the customer is eligible, never composes the wording of a regulated disclosure, and never submits a credit application on its own authority.

A deterministic reconciliation pipeline (see [`lib/reconcile.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/reconcile.ts)) sits between the model's output and any state change. Three rules in that file decide whether a consent flag is recorded, whether a pre-contract document is presented, and whether the credit waterfall actually runs. If the model says something inconsistent with the rules, the rules win.

The decision-engine itself is a deterministic waterfall. Quote, APR, monthly payment, total payable, and approval status come from the engine, not from generated prose. Disclosure bodies are stored verbatim in [`lib/disclosures.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/disclosures.ts) and rendered by the UI when the model emits a `present_disclosure` tag. The model can request a disclosure by id; it cannot author one.

This is the same separation-of-concerns pattern you find in any safety-critical system that mixes a probabilistic component with a deterministic one: keep the probabilistic part out of the trust boundary.

## Mapping to industry frameworks

The design maps cleanly onto two widely-cited frameworks for AI risk.

The [NIST AI Risk Management Framework (AI RMF 1.0)](https://www.nist.gov/itl/ai-risk-management-framework) organises AI risk into four functions: Govern, Map, Measure, Manage. Lending Agent addresses each:

- **Govern**: explicit ownership of the regulated surfaces (decision-engine, disclosures, audit trail) by code, not by prompt. System prompts in [`lib/system-prompts.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/system-prompts.ts) are versioned and reviewable.
- **Map**: the [threat model page](/safety/threat-model) enumerates adversaries, surfaces, and trust boundaries.
- **Measure**: a replay engine runs deterministic scenario suites against any candidate model and prompt combination, producing per-deployment evidence. See [model evaluations](/safety/model-evaluations).
- **Manage**: fail-safe defaults (the application does not submit unless every gate passes), withdraw-at-any-time, and audit logging in [`lib/audit.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/audit.ts) provide the day-two operational controls.

The [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/) frames the threat surface specific to LLM-powered apps. The relevant entries and how Lending Agent answers them:

- **LLM01 Prompt Injection**: structured event tags, reconciliation, and verbatim UI rendering remove the model from the trust path. See [prompt injection](/safety/prompt-injection).
- **LLM02 Insecure Output Handling**: the parser in [`lib/parser.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/parser.ts) treats model output as untrusted and validates tag shape, ids, and arity before any side effect.
- **LLM06 Sensitive Information Disclosure**: regulated content is never composed by the model. See [hallucination](/safety/hallucination).
- **LLM08 Excessive Agency**: the model has no tools that can write to the decision-engine or send the application. The state machine submits, not the agent.
- **LLM09 Overreliance**: the replay engine and audit log let a reviewer reconstruct any decision without trusting the model's narration.

## Where regulated content lives

A short and deliberate list:

- **Eligibility and decision** come from the deterministic decision-engine. The model is not in the loop.
- **Pre-contract disclosures, adequate explanations, SECCI** are stored verbatim in source and rendered by the UI when triggered by an event tag.
- **Quotes, APR, monthly payment, total payable** are calculated by the engine. The model only narrates them.
- **Audit evidence** is appended by code on every state transition, capturing what the customer was shown, when, and what they consented to.

## How a reviewer should read the rest of this section

Start with the [threat model](/safety/threat-model) for the adversary view. [Prompt injection](/safety/prompt-injection) and [hallucination](/safety/hallucination) work through the two most-cited LLM risks in concrete terms. The [fail-safe state machine](/safety/fail-safe-state-machine) page explains the reconciliation pipeline in detail. [Empty-turn protection](/safety/empty-turn-protection) covers a small but important class of bugs that, untreated, can be safety bugs. [Vulnerable customer protection](/safety/vulnerable-customer-protection) maps the design to FCA FG21/1. [Model evaluations](/safety/model-evaluations) closes with how to use the replay engine for ongoing assurance.

The intended outcome of reading this section is that a reviewer can answer, with reference to specific files: who can change what, what stops the model from doing something it shouldn't, and what evidence exists after the fact.
