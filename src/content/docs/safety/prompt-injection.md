---
title: Prompt injection
description: How Lending Agent defends against OWASP LLM01 in the context of consumer credit broking.
---

Prompt injection is the most-cited risk for any LLM application. The [OWASP LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) entry distinguishes direct injection (user input crafted to subvert the model) from indirect injection (malicious content reaching the model via tool output, retrieved documents, or third-party data). Both apply here in principle. This page describes the customer-side surfaces, the demo's defences, and the residual risk.

## Surfaces where customer text reaches the model

There are three channels through which untrusted text can flow into the prompt:

1. **Chat input.** The customer types freely. This is the canonical direct-injection surface.
2. **Postcode lookup output.** The address-lookup service returns address candidates. A motivated attacker could in principle register an address line containing instruction-shaped text. This is an indirect-injection surface.
3. **Email field and other application free-text.** Employer name, address line, and similar fields accept arbitrary input.

The chat route in [`app/api/chat/customer/route.ts`](https://github.com/bgood11/lending-agent/blob/main/app/api/chat/customer/route.ts) assembles the conversation history and forwards it to the model, with the system prompt from [`lib/system-prompts.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/system-prompts.ts) at the top. Untrusted content sits inside the user-turn payload.

## Why the standard injection escalation does not work here

A successful prompt injection in a typical agent results in the model either disclosing data it should not, or invoking a tool it should not. Lending Agent's design removes both of these payoffs.

**The model has no tool that performs a regulated action.** It does not write the application record. It does not call the decision-engine. It does not submit. It emits text and structured event tags. Tools exist only in the loosest sense: the parser interprets tags, and the reconciliation pass in [`lib/reconcile.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/reconcile.ts) decides whether the tag has any effect.

**The model cannot author regulated content.** When the model wants to show a disclosure, it emits a `present_disclosure` tag with an id. The UI looks the id up in [`lib/disclosures.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/disclosures.ts) and renders the verbatim body. An injection that asks the model to "present a different disclosure" still produces the disclosure registered under that id, or fails the parser if the id is unknown.

**The model cannot fake consent through prose.** Consent is recorded only when a `consent_acknowledged` tag is emitted *and* the reconciliation rule fires *and* the gate is at the appropriate state. A model that has been talked into saying "you have agreed" without the tag changes nothing. The state machine, not the model's narration, is the source of truth.

**The parser treats model output as untrusted.** [`lib/parser.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/parser.ts) validates tag names, disclosure ids, and argument arity before any side effect. Malformed tags are dropped, not papered over.

This is what the OWASP guidance calls "constraining model behaviour" and "validating output formats" applied at the architecture level rather than as a runtime filter.

## What an injection in the application free-text fields could do

A natural reviewer question is whether a determined attacker could pollute, say, the employer-name field with instructions and reach the model that way. The answer in this design is that the impact is small.

The decision-engine is deterministic and does not condition on the conversational interpretation of these fields. If the model is fooled into reading employer-name as an instruction, the worst plausible outcome is a confusing chat reply. Eligibility, price, and approval are computed from the structured application record by code that does not consult the model.

The model also cannot move the journey forward. If an injection tries to convince the model to present the SECCI without first presenting the adequate explanation, the reconciliation pass will refuse: the adequate-explanation gate has not cleared, so the SECCI presentation rule does not fire.

## Layers in plain terms

For a security review the defence-in-depth layers are:

- **Architecture**: the model is a narrator, not the controller (see [fail-safe state machine](/safety/fail-safe-state-machine)).
- **Output validation**: the parser rejects malformed tags and unknown disclosure ids.
- **Reconciliation**: the state machine, not the model, decides whether a tag has effect.
- **Verbatim rendering**: regulated text is fixed in source, addressed by id, and rendered by the UI.
- **Audit**: every accepted tag is logged with the input that produced it ([`lib/audit.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/audit.ts)).

## Residual risk and acceptable failure modes

Some failure modes are acceptable. A poorly-handled injection might cause the agent to produce a strange or incoherent reply. The customer reads it, finds it unhelpful, and moves on. The reply did not change the state of the application. The audit log records what happened. The reviewer can replay the conversation.

The unacceptable failure mode would be a state change the customer did not actually authorise. The architecture makes that path require simultaneous failures in the parser, the reconciliation rules, and the disclosure registry. None of those is exposed to the model's prose.

## Where to look in the code

- [`lib/parser.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/parser.ts): tag schema and validation.
- [`lib/reconcile.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/reconcile.ts): the three rules (consent ack, present pre-contract, run waterfall) and the order they fire.
- [`lib/system-prompts.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/system-prompts.ts): the model's instructions, including the explicit prohibition on inferring or composing regulated content.
- [`lib/disclosures.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/disclosures.ts): the verbatim disclosure registry the UI reads from.
