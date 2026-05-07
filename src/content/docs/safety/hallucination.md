---
title: Hallucination
description: How the verbatim disclosure pattern and a deterministic decision-engine remove the model from the regulated content path.
---

Hallucination, the tendency of language models to produce plausible content that is not grounded in fact, is the single most material risk for any consumer-facing finance product. In the [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/) it shows up in two places: **LLM06 Sensitive Information Disclosure** (the model produces regulated content that is wrong or leaks data) and **LLM09 Overreliance** (the operator trusts the output without verification). Lending Agent treats both as architectural problems, not prompt-tuning problems.

The architectural answer is straightforward: never let the model compose regulated content.

## The verbatim disclosure pattern

Every regulated text the customer sees (the adequate explanation, the pre-contract information, the SECCI, the in-life duties) is stored verbatim in [`lib/disclosures.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/disclosures.ts) under a stable id.

When the conversation reaches the point where one of these documents needs to be presented, the model emits a `present_disclosure` event tag with the id. The parser in [`lib/parser.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/parser.ts) validates that the id is one the registry knows about. The UI then renders the body straight from the registry, character for character.

The model never writes the words the customer reads. It can refer to them, summarise them in conversational language, and answer questions about them, but the canonical text is fixed in source and addressed by id.

The benefits are concrete:

- **A wording change is a code change.** It goes through review, version control, and CI. It does not depend on a prompt.
- **An audit can compare what was shown.** The audit log records the disclosure id and the engine version, and the disclosure registry is a file you can diff.
- **Hallucination cannot reach the document body.** The worst the model can do is refer to a disclosure that has not been triggered yet, and the reconciliation pass would reject that.

## Numbers come from the engine

Indicative quote, monthly payment, APR, and total payable are computed by the deterministic decision-engine. The engine is a code path; it does not consult the model. The model is told the numbers as part of a structured payload and narrates them.

This matters because numerical hallucination is a known LLM failure mode. Anthropic's own [research programme](https://www.anthropic.com/research) on alignment, interpretability, and constitutional classifiers is in part about understanding when and why models produce confident-but-wrong outputs. The defence here is to ensure none of those numbers originated in the model's generation in the first place.

If the model misquotes a number in narration, the same number is present in the structured UI panel rendered by code. The UI is the source of truth the customer sees.

## Why "the model is the controller" is rejected

A common pattern is to give the model tools that perform actions and let it orchestrate. That pattern collapses the trust boundary: a hallucination becomes a state change. Lending Agent rejects this pattern for the regulated parts of the journey. The model's role is bounded to:

1. Eliciting information conversationally
2. Narrating the application state and the engine's outputs
3. Emitting structured event tags that signal customer intent

Everything that affects the regulated record passes through the deterministic state machine. See the [fail-safe state machine](/safety/fail-safe-state-machine) page.

## Empirical measurement: the replay engine

Architectural defences are necessary but not sufficient. We also measure.

The replay engine is a deterministic scenario suite that runs against any candidate model and prompt combination. It exercises the journey end-to-end, asserts on the resulting event-tag stream, the audit log, and the UI-visible state. A regression in model behaviour (the model decides to summarise a disclosure rather than present it, the model invents a counter-offer) shows up as a test failure with a diff against the recorded baseline.

This is a per-deployment evaluation suite in the sense the [NIST AI RMF Measure function](https://www.nist.gov/itl/ai-risk-management-framework) calls for. It is an empirical answer to the question "did the model behave the way we expect?" rather than a vibe check.

The full design is on the [model evaluations](/safety/model-evaluations) page.

## What the system prompt does (and does not) do

The system prompt in [`lib/system-prompts.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/system-prompts.ts) explicitly tells the model:

- It must not invent or paraphrase regulated content; it must request a `present_disclosure` by id.
- It must not state numbers it has not been given by the engine.
- It must not infer eligibility or affordability conclusions.

This is a backup. The architecture would still hold if the prompt were missing, because the parser, reconciliation pass, and verbatim rendering do not depend on the model's compliance. The prompt makes failures rarer; the architecture makes them survivable.

## What about chat-only hallucination?

The model can still hallucinate in conversational replies. A customer asks "what's the difference between APR and interest rate" and the model gives a flawed analogy. This is a quality issue but not a regulated-outcome issue: the customer is not deciding anything yet, no money has moved, and the disclosure (when it is presented) will be the canonical text.

The replay engine includes scenarios that probe these conversational answers and flag drift between deployments. The standard for the chat surface is "does not mislead" rather than "is regulator-quality prose"; regulator-quality prose lives in the disclosure registry.

## Where to look in the code

- [`lib/disclosures.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/disclosures.ts): the verbatim registry.
- [`lib/parser.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/parser.ts): id validation.
- [`lib/system-prompts.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/system-prompts.ts): the model's bounds.
- [`lib/audit.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/audit.ts): the trail that lets a reviewer reconstruct what was actually shown.
