---
title: Model evaluations
description: The replay engine as a per-deployment evaluation suite, and how to integrate it into a broker's model-risk-management process.
---

Architectural defences keep the regulated outcomes outside the model's reach. Evaluations measure whether the model is doing its remaining job, conversationally narrating the journey and emitting the right event tags at the right time, to a standard the broker can defend. This page describes the replay engine, how to extend it, and how it slots into a broker's model-risk-management (MRM) lifecycle.

The framing follows the [NIST AI RMF Measure function](https://www.nist.gov/itl/ai-risk-management-framework) and aligns with the assurance posture in Anthropic's [Responsible Scaling Policy](https://www.anthropic.com/responsible-scaling-policy), which treats per-deployment evaluation as a continuous obligation rather than a launch-day exercise.

## The replay engine

The replay engine is a deterministic harness that runs scenario scripts against any candidate combination of model version, system prompt, and disclosure registry. A scenario is a sequence of customer inputs (chat messages, form submissions, postcode lookups) and a set of assertions about the resulting event-tag stream, the audit log, and the UI-visible state.

A run produces:

- A pass/fail result per scenario
- A diff against the recorded baseline event stream
- A diff against the recorded baseline narration text (for narration-quality regressions)
- A summary of which assertions failed and where

Because the journey's regulated parts are deterministic, two runs of the same scenario against the same model and prompt should produce identical event-tag streams. The narration text varies, but the structured signal is stable. That stability is what makes the replay engine an evaluation suite rather than a vibes test.

## What scenarios cover

The seed suite covers, at minimum:

- The happy path through eligibility, adequate explanation, pre-contract presentation, application capture, decision, and signature
- The decline path with debt-advice signposting
- The withdraw-at-any-stage path from each gate
- A vulnerability-indicator opt-in path
- A prompt-injection probe in chat input (the model should refuse to fabricate consent or disclosure content)
- A prompt-injection probe in postcode-lookup output
- An empty-assistant-turn injection (verifies the [empty-turn protection](/safety/empty-turn-protection) layers)
- Cold-start hydration from a partial seed

Each scenario asserts on event-tag presence, ordering, and content, and on the audit-log shape produced by the run.

## How to extend the suite

A new scenario is a JSON or TypeScript file that lists the inputs and the assertions. A reviewer adding a scenario typically:

1. Records the desired interaction against the current production deployment
2. Curates the recorded event stream to remove run-specific identifiers
3. Adds the assertion that matters (often an event-tag presence and a disclosure id check)
4. Commits the scenario alongside the code

The harness then runs that scenario on every CI build and on any candidate model promotion.

Common scenarios worth adding for a broker's deployment:

- Brand-specific disclosure triggers (where a broker has bespoke pre-contract wording)
- Edge cases that have come up in past customer support contacts
- Adversarial inputs gathered from operational monitoring
- Compliance edge cases flagged by internal audit

## Drift detection and regression tracking

The replay engine writes a structured artefact per run that captures the event stream, the narration text, and the audit shape. By storing these per-build, the team can:

- Track narration drift across model upgrades
- Detect tag-emission regressions in pre-promotion testing
- Measure assertion-failure rates over time as a quality KPI
- Trigger an alert when a regression is detected on the main branch

Drift detection is the empirical part of the [hallucination](/safety/hallucination) defence. Architectural defences guarantee that hallucinated content cannot become a regulated outcome. Drift detection guarantees that we notice when narration quality degrades.

## Slotting into a broker's MRM process

Brokers typically already have a model-risk-management process for their credit-decision models. The replay engine fits alongside that process, not inside it: the credit decision is deterministic, so it is not a "model" in the MRM sense. The agent is.

A workable integration looks like:

- **Inventory.** Add the agent to the model inventory as a vendor LLM with the system prompt and disclosure registry as the firm-controlled artefacts.
- **Tiering.** Tier the agent by impact. In this design the agent has limited blast radius (the decision-engine is the high-tier model), so it can sit at a lower tier than the credit model.
- **Validation.** Initial validation reviews the architecture (this section of the docs), the seed suite, and the audit log. Periodic re-validation runs the replay suite against the current production deployment and reviews any drift.
- **Monitoring.** The audit log feeds into operational dashboards. The replay-engine artefacts feed into the model-risk dashboard.
- **Change control.** Any change to the model version, the system prompt, or the disclosure registry is a model change and requires a re-run of the replay suite plus a sign-off.

## When does the broker need to re-run evaluations?

The short answer: any time the inputs to the model change. Concretely:

- **Model version change.** The Anthropic model version is pinned. A change to a newer model is a re-run trigger.
- **System prompt change.** Any edit to [`lib/system-prompts.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/system-prompts.ts) is a re-run trigger.
- **Disclosure registry change.** Any edit to [`lib/disclosures.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/disclosures.ts) is a re-run trigger, especially a change that introduces a new id.
- **Reconciliation change.** Any edit to [`lib/reconcile.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/reconcile.ts) or [`lib/parser.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/parser.ts) is a re-run trigger and also an architecture-review trigger.
- **Regulatory change.** A change in FCA expectations may require new scenarios; the existing ones still need to pass.

This is also the cadence Anthropic's [research programme](https://www.anthropic.com/research) and Responsible Scaling Policy effectively recommend for a deployer: treat evaluation as continuous, not one-off, and re-evaluate on any change to the inputs that govern model behaviour.

## What evidence the suite produces

For an FCA-style auditor, the replay engine produces:

- A reproducible test run with timestamps and version stamps
- An assertion-by-assertion result that maps onto FG21/1 communications and consumer-support expectations
- A diff against baseline that quantifies any drift
- An audit-log artefact for each run that mirrors the production audit shape

This is the evidence layer the [overview](/safety/overview) refers to as Measure-and-Manage. It is what a security review team can ask to see, and what a regulator would expect a firm to be able to produce on request.

## Where to look in the code

The replay scenarios live alongside the test suite in the repository. The seed scenarios are intentionally small and readable. They are the right starting point for a reviewer who wants to understand what "the model behaving correctly" means in this design, and for a broker who wants to extend the suite to cover their own operational concerns.
