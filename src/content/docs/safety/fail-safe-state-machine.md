---
title: Fail-safe state machine
description: The reconciliation pattern that keeps the model out of the trust path. Three rules, one source of truth, recoverable from a seed.
---

The single most important architectural decision in Lending Agent is that the model does not control the regulated state machine. The model emits structured event tags, and a deterministic reconciliation pass decides whether anything actually changes. This page describes that pass and why it is the centre of the safety story.

## The principle: the model is a narrator

There are two patterns for combining a language model with a regulated workflow:

- **Model-as-controller**: the model decides what happens next and invokes tools to make it happen.
- **Model-as-narrator**: the workflow decides what happens next, and the model explains it conversationally and gathers structured input.

Lending Agent uses the second pattern. It rejects the first because the regulated trust boundary cannot live inside a probabilistic component. Hallucination becomes consequential the moment the model is the thing that submits the application.

The narrator pattern keeps regulated control flow in code. The model contributes natural-language quality and structured event tags. Both contributions are validated before they have any effect.

## The three rules in `lib/reconcile.ts`

[`lib/reconcile.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/reconcile.ts) is the centre of the reconciliation pass. It runs after every model turn, takes the parsed event tags as input, and decides which state transitions, if any, occur. Three rules cover the journey:

1. **Acknowledge consent.** When the model emits a `consent_acknowledged` tag for a gate that is currently the active gate, and the gate's preconditions are met, the consent is recorded against that gate. A tag for a gate that is not active is dropped; a tag without preconditions is dropped.

2. **Present the pre-contract document.** When the customer has cleared the upstream gates and the model emits a `present_disclosure` tag for the pre-contract id, the UI is instructed to render the verbatim document from [`lib/disclosures.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/disclosures.ts). A request to present a document out of order is dropped.

3. **Run the credit waterfall.** When every gate has cleared (identity confirmed, eligibility complete, adequate explanation acknowledged, pre-contract presented, application details captured), the deterministic decision-engine runs. The model has no say in whether it runs; it runs because the gates say it should.

These three rules are short. They fit in a single file by design: a reviewer can read the file end-to-end and convince themselves that no fourth path exists.

## What "fail-safe" means here

A fail-safe design fails into a state that is acceptable. For Lending Agent, the acceptable failure state is "no regulated change occurred". That is the default and it is what happens when:

- The model emits no tags
- The model emits malformed tags
- The model emits tags out of order
- The parser rejects a tag
- The reconciliation rule's preconditions are not met
- An exception is thrown anywhere in the chat route

The application sits in its current state. The customer can retry, ask a question, or close the tab. The audit log shows what was attempted. There is no path that fails into "submission".

Compare this to the model-as-controller approach. There, a failure could fail into "submitted with bad data", "submitted before disclosure", or "submitted twice". The recovery semantics are then about unwinding rather than retrying.

## Recovery semantics: the seed and the memory

State has two homes: the in-memory representation built up over the chat history, and the seed, a persisted record of the journey's authoritative state at known checkpoints. They should agree, but they can diverge for ordinary reasons (the customer reloads the page, the server restarts, the conversation history is truncated).

The rule is: the seed is authoritative. On cold start, the chat route hydrates from the seed and rebuilds the conversation context around it. If the model's apparent recollection (as inferred from the chat history) and the seed disagree, the seed wins and the model is given the seed-derived context.

This matters because a poisoned or truncated chat history can be made to look like the customer has cleared a gate they have not. The seed prevents that: the seed only records gates that cleared through the reconciliation rules in the first place.

## Why this is more than "validate the output"

A naive defence-in-depth design would say: validate the model's output against a schema and call it done. That is necessary, but it is not what makes Lending Agent safe.

The schema validation lives in [`lib/parser.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/parser.ts). It catches malformed tags. The reconciliation pass goes further: it knows the state machine and refuses to apply tags that are syntactically valid but semantically out of order. A `consent_acknowledged` tag for the SECCI is well-formed. If the SECCI has not been presented, reconciliation drops it. The state machine is the trust anchor, not the schema.

This is the [OWASP LLM01](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) recommendation taken to its conclusion: treat the model as untrusted input, then place all consequential decisions behind code that does not consult the model.

## How a reviewer can satisfy themselves

A reviewer who wants to be confident that the model cannot cause an unauthorised regulated outcome should:

1. Read [`lib/reconcile.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/reconcile.ts) and confirm there are exactly the three rules described.
2. Read [`lib/parser.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/parser.ts) and confirm tag schemas are total: every accepted tag has a known shape.
3. Read the chat route in [`app/api/chat/customer/route.ts`](https://github.com/bgood11/lending-agent/blob/main/app/api/chat/customer/route.ts) and confirm the reconciliation pass is the only writer to the application state.
4. Inspect the audit log shape in [`lib/audit.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/audit.ts) and confirm every state transition is recorded.

That sequence answers the only question that matters for AI safety in this design: can the model, alone or in collusion with a malicious customer, produce an outcome the rules would not produce? The answer should be no.
