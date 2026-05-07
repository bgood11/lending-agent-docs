---
title: Empty-turn protection
description: How Lending Agent guards against malformed conversation histories that would otherwise produce broken model output.
---

The Anthropic Messages API has a documented constraint: every turn in the conversation must contain non-empty content, and roles must alternate (user, assistant, user, assistant, ...). A history that violates either constraint is rejected at the API boundary, and worse, a history that is technically valid but semantically degenerate (an assistant turn with whitespace-only text, two consecutive user turns, an empty list of content blocks) can produce poor or unpredictable model output even when the API accepts it.

This page describes why this is a safety issue and the three layers of defence we apply.

## Why this is a safety issue

It is tempting to file empty-turn handling as a reliability concern. It is also a safety concern. The reasoning is short:

A poisoned conversation history is one of the most reliable ways to push a language model into low-quality output. If the assistant turn is empty, the next assistant turn is generated under unusual conditioning. If consecutive user turns are concatenated, the model sees something it has never been trained on. The output in these regimes is often confidently wrong, off-topic, or echoes adversarial fragments back as facts. From a regulated-journey perspective that means the model can produce text the customer reads as guidance, generated under conditions where its prior training assurances do not hold.

The defence is therefore not just "make the API call succeed". It is "ensure the model is always conditioned on a clean, well-formed conversation".

## The three layers of defence

### Layer 1: do not append empty assistant turns

The chat route builds the assistant's response from the model's output and any structured tags it produced. If the response is empty (the model returned no usable text and no actionable tags), we do not append a placeholder turn. Instead, the route surfaces the failure to the UI as a retry-able state and leaves the history at "user spoke last".

This avoids creating the empty-assistant-turn footgun in the first place.

### Layer 2: filter on history build

When the next user turn arrives, we rebuild the message list that goes to the model. The build step filters out:

- Turns with empty or whitespace-only content
- Turns whose content blocks are all empty
- Stale assistant turns left over from a prior failed call

This is a belt-and-braces filter. Layer 1 should mean we never insert these. Layer 2 means a leftover from any source (a serialisation round trip, a migration of stored history) is removed before the model sees it.

### Layer 3: collapse consecutive same-role turns

If, after filtering, two same-role turns sit next to each other, we collapse them into one. The user's two messages become one user turn with both pieces of content, in order. The same applies to the rare assistant case.

This preserves alternation, which the API requires and the model expects.

## Synthesised user turn at history end

After the three filters, the history must end with a user turn for the model to respond. A history that would otherwise end on assistant (because the customer triggered a server-side event without typing) gets a synthesised, content-bearing user turn that describes what happened. For example, on cold-start hydration we synthesise a turn that says, in essence, "the application has been restored to this checkpoint".

The synthesis is explicit and short. It is logged in the audit trail so a reviewer can see exactly what was injected and why. It is never empty.

## How the layers compose

The layers are independent and the order matters. Layer 1 prevents pollution at the source. Layer 2 catches anything that got in anyway. Layer 3 normalises shape. The synthesis step then guarantees the model has something to respond to.

The combination is intentionally redundant. Each layer would be sufficient under a stronger assumption about the others. Together they make the safety property robust to changes in any single layer.

## Why we treat this as part of the [fail-safe state machine](/safety/fail-safe-state-machine)

If history protection failed silently (the model received a malformed history and produced strange output), the user would see strange output. They might also infer something about their application that is not true. The reconciliation pass still prevents an unauthorised state change, but the customer experience could include misleading text. That is the kind of conduct outcome the [FCA Consumer Duty](https://www.fca.org.uk/firms/ai-financial-services) framework asks us to avoid: communications that are not clear, not fair, and not non-misleading.

We therefore treat empty-turn protection as adjacent to the regulated state machine, not separate from it. A reviewer thinking about overall conduct risk should think of the three layers as complementary to the three rules in [`lib/reconcile.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/reconcile.ts).

## Operational signals

Three signals tell us the layers are working:

- **Zero rejected calls** at the Anthropic API boundary for empty-content reasons. Any rejection is logged and treated as a Layer 1 escape.
- **Replay-suite stability**. The replay engine ([model evaluations](/safety/model-evaluations)) includes a scenario where a stale assistant turn is injected. The expected behaviour is that the next turn proceeds cleanly.
- **Audit trail completeness**. Every synthesised user turn is recorded, with its trigger and timestamp.

## Where to look in the code

The history-build step lives alongside the chat route at [`app/api/chat/customer/route.ts`](https://github.com/bgood11/lending-agent/blob/main/app/api/chat/customer/route.ts). The filters and the collapse logic are in helpers in the same path. Audit hooks for synthesised turns are in [`lib/audit.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/audit.ts).
