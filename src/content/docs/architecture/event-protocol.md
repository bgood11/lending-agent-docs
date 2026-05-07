---
title: Event protocol
description: The agent-event tag, how it's parsed, and how direct events from the UI use the same shape.
---

The agent and the UI both speak the same event language. Different channels, same payloads.

## The tag

The agent embeds events in its prose using a self-closing tag:

```
<agent-event type="EVENT_TYPE" data='JSON_PAYLOAD' />
```

Three rules:

- **Self-closing.** Always `<agent-event ... />`, never `<agent-event>...</agent-event>`.
- **Single-quoted JSON** in the `data` attribute, so JSON's double quotes don't need escaping.
- **End-of-message.** Events appear after the prose, on their own line(s).

Multiple events allowed in one turn. Each is parsed and applied in order.

## How a turn flows

```
model output:
  "Got it. Sending Sarah a link now.
   <agent-event type="record_customer_contact" data='{"mobile":"07700 900 123"}' />
   <agent-event type="generate_customer_link" data='{}' />"

parser:
  display = "Got it. Sending Sarah a link now."
  events  = [
    { type: "record_customer_contact", data: { mobile: "07700 900 123" } },
    { type: "generate_customer_link",   data: {} }
  ]

server:
  applyEvents(sessionId, events)         // mutates case state
  reconcileSession(sessionId)            // closes any gate-rule gaps
  appendCustomerMessage(sessionId, display)  // transcript bubble
```

## Direct events

The UI dispatches events directly when buttons are clicked or forms submitted. These don't go through the model:

```ts
// Customer page submitting eligibility
fetch("/api/chat/customer", {
  method: "POST",
  body: JSON.stringify({
    sessionId,
    seed: liveSeed,
    directEvents: [{
      type: "record_eligibility",
      data: {
        isOver18: true,
        isUkResident: true,
        isHomeowner: true,
        isEmployed: true
      },
    }],
  }),
});
```

The chat route applies direct events **before** calling the model. So by the time the model sees the conversation, the state is already correct, and the model just narrates what just happened.

This is the protocol-aligned pattern: **regulated moments use deterministic UI events, conversational moments use the model**.

## Parser semantics

[`lib/parser.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/parser.ts) provides:

- `AgentStreamParser`, streaming parser. Call `feed(chunk)` as text arrives, get back `{ displayText, events }` for what's been fully parsed in that chunk. Buffers partial tags across chunks.
- `stripEventTags(text)`, convenience function for non-streaming uses. Returns `{ display, events }` for a complete model output.

JSON extraction uses brace-balancing rather than regex, so apostrophes in values (names like "John's") don't break parsing. There's a real bug in the codebase history where a regex-based parser truncated JSON at the first apostrophe; the brace-walker is the fix.

## Streaming-friendly

The parser handles tags split across stream chunks. Example:

```
chunk 1: "Hi Sarah. Got it. <agent-event type=\"reco"
chunk 2: "rd_customer_contact\" data='{\"mobile\":\"07700 900 123"
chunk 3: "\"}' />"
```

The parser holds back the partial tag in chunk 1, sees the rest in chunks 2 and 3, and only emits the parsed event when the closing `/>` lands. The visible text is yielded as it arrives so the customer sees it streaming.

## Event taxonomy

Full type definition in [`lib/types.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/types.ts) (`type AgentEvent`). Brief summary:

| Group | Events |
| --- | --- |
| Project & contact | `record_project_facts`, `record_customer_contact`, `generate_customer_link`, `installer_handoff_complete` |
| Customer journey | `record_eligibility`, `record_provisional_quote`, `record_email_preference`, `record_personal_facts`, `record_financial_facts`, `record_vulnerability_indicators` |
| Disclosures and consents | `present_disclosure`, `acknowledge_disclosure`, `capture_consent` |
| Application | `submit_application`, `accept_counter_offer`, `refuse_counter_offer`, `select_offer` |
| Lifecycle | `withdraw`, `case_outcome`, `case_complete` |

See [Event taxonomy](/reference/events/) for full payload shapes.

## The "events with no prose" case

A turn can legitimately consist of nothing but events:

```
"<agent-event type=\"acknowledge_disclosure\" data='{\"id\":\"service_status\"}' />"
```

The events apply. But the display text is empty. The customer route detects this, applies the events, and **does not** persist a transcript turn for this. There's no ghost message in the chat history that could later be sent back to the API as an empty content block (which the API rejects).

See [Empty-turn protection](/safety/empty-turn-protection/).

## Why structured events not function calls

The Anthropic API offers a tool-use feature. The demo doesn't use it. Why:

1. **Streaming UX.** Tool use forces the model into a non-streaming turn. With inline event tags, the prose streams in real time and events are extracted as they arrive.
2. **Simpler parser.** A streaming tag parser is ~150 lines. A robust tool-use handler with retries, partial responses, and recovery is more.
3. **Matches the protocol.** The agentic credit broking protocol describes structured events as the model's surface, not function calls.

Both approaches would work. Inline events fit better with the streaming, prose-first agent UX.

## Adding new events

When you need a new event type:

1. Add to the `AgentEvent` discriminated union in [`lib/types.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/types.ts).
2. Add a `case` to the `applyEvents` switch in [`lib/server-store.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/server-store.ts).
3. If it should trigger cross-cutting follow-ons, add a rule to [`lib/reconcile.ts`](/architecture/reconciliation/).
4. If the model needs to emit it, document it in [`lib/system-prompts.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/system-prompts.ts) under "Available events".
5. If the UI emits it directly, dispatch it from the relevant button or form handler.

The discipline: events are how state mutates. Add events when you need a new state mutation; otherwise use existing ones.
