---
title: Trust gradient
description: Inline disclosures for high-trust user agents, broker-hosted disclosures for low-trust ones, with the same underlying journey.
---

The agentic credit broking protocol describes a "trust gradient" between user agents (the AI surface talking to the customer). High-trust user agents can render regulated content inline. Low-trust user agents have to send the customer to a broker-controlled surface for the same content.

The demo implements both. You can switch between them with a URL parameter.

## High-trust mode (default)

Disclosures render inline in the customer chat. The customer sees a card with the verbatim text and an "I understand" / "Grant / Refuse" / "I confirm" button. Clicking dispatches the relevant event.

This works because the demo's user agent is trusted: the broker has audited it, knows what it presents, knows what it doesn't. In production this is the typical case for a broker's own white-labelled surface.

## Low-trust mode

Append `?trust=low` to the customer URL. Disclosures still flow through the same gates and emit the same events, but the rendering changes:

- The inline disclosure card is replaced with a **broker-handoff card**: "Open on the broker's secure page →"
- Clicking opens a separate broker-branded page (`/broker/disclosure/[sessionId]/[disclosureId]`) in a new tab.
- The customer reads the disclosure on the broker surface and clicks the same button.
- The broker page posts the relevant event back to the case.
- The customer chat polls the session every 2 seconds. When the disclosure is acknowledged, the chat continues.

The broker-hosted page has its own visual identity (a deeper amber + slate, with "Broker secure surface" in the header) so it visibly looks different from the inline surface. The customer should be able to tell that they've been sent to a different surface.

## Why this matters

The protocol's §7.3 and §7.4 describe two patterns:

- **High-trust user agent + verbatim inline rendering** = compliant, on the basis that the broker has audited the user agent and trusts it not to corrupt the regulated content.
- **Low-trust user agent + broker-controlled surface** = compliant on the basis that the regulated content is rendered by a surface the broker fully controls, even though the surrounding journey runs through an untrusted user agent.

The same journey can support both. New user agents (third-party AI assistants the broker hasn't audited yet) start as low-trust and get promoted to high-trust after audit.

## The two modes side by side

Best demo move: open the same session in two browser tabs, one with `?trust=high` and one with `?trust=low`. Walk a stakeholder through them in parallel. They'll see:

- Same eligibility check on both
- Same indicative quote on both
- Same application details form on both
- **Different disclosure rendering** at the status, credit-search-consent, and pre-contract gates
- Same audit log at the end, with the same events recorded regardless of which surface the customer used

The demo controls bar (`?demo=1`) has a Trust dropdown for switching mid-journey.

## Implementation note

The broker-hosted page is at [`/broker/disclosure/[sessionId]/[disclosureId]/page.tsx`](https://github.com/bgood11/lending-agent/blob/main/app/broker/disclosure/%5BsessionId%5D/%5BdisclosureId%5D/page.tsx). It's standalone, doesn't import the customer chat, has its own colour palette via `styled-jsx`. In production it would live on a separate domain owned and operated by the broker.

The polling pattern in the customer chat (`every 2s when trust === "low" && there's an open disclosure`) is the simplest possible synchronisation. In production this would be a server-sent event or websocket subscription instead.

## Customer experience

From the customer's perspective:

- High-trust: "I'm reading a disclosure inline, I tap I understand, the chat continues."
- Low-trust: "I'm being sent to the broker's secure page in a new tab, I read the disclosure there, I tap I understand, I close the tab and the chat continues automatically."

The low-trust mode is slightly more friction for the customer (a tab switch). The trade-off is that the broker has full control of how the regulated content is rendered, which is the requirement when the user agent is unknown.

## When to choose which

| User agent | Recommendation |
| --- | --- |
| Broker's own white-labelled customer journey | High-trust |
| Audited third-party user agent on a published allowlist | High-trust |
| New third-party user agent in pilot | Low-trust until audit |
| Customer's general-purpose AI assistant (e.g. someone asking a chatbot for a loan and being routed) | Low-trust |
| Voice-first surface (Alexa, Siri integrations) | Low-trust, with audio-rendered version of broker-hosted page |

The demo doesn't try to dictate the policy. It demonstrates that both modes work end-to-end with the same underlying state machine.

See [Adoption path for brokers](/implementation/brokers/adoption-path/) for the policy considerations.
