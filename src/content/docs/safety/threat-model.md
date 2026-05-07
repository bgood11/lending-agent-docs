---
title: Threat model
description: Adversaries, attack surfaces, and residual risk for an AI-mediated consumer credit broking journey.
---

This page enumerates the adversaries Lending Agent has been designed against, the surfaces they can touch, the mitigations in place, and the residual risk that remains. It is intended to support a security review by a broker risk team or retailer infosec function. It complements the [overview](/safety/overview) and feeds into the [prompt injection](/safety/prompt-injection) and [fail-safe state machine](/safety/fail-safe-state-machine) pages.

The framing follows the broad shape of the [NIST AI RMF Map function](https://www.nist.gov/itl/ai-risk-management-framework) and references the [MITRE ATLAS](https://atlas.mitre.org/) tactic taxonomy where relevant. ATLAS catalogues adversarial techniques against AI systems and is the canonical reference for "what can go wrong with the model itself" as opposed to general application security.

## Trust boundaries

The agent sits at the intersection of three trust zones:

1. **Customer browser**: untrusted input. Anything sent over the chat input, postcode field, or email field originates here.
2. **Application server**: trusted code. The chat route ([`app/api/chat/customer/route.ts`](https://github.com/bgood11/lending-agent/blob/main/app/api/chat/customer/route.ts)), reconciliation, parser, decision-engine, disclosure registry, and audit log all live here.
3. **Model provider**: semi-trusted. The Anthropic API receives prompts and returns text. We assume the provider is honest but the channel is not a privileged execution surface.

Regulated state changes are produced only by trusted code. The model's text output is treated as untrusted user content right up to the point the parser validates it.

## Adversary 1: malicious customer

A customer who tries to game the journey. The most plausible attempts:

- Forge an application by sending crafted text that the model echoes as a "fact"
- Pretend to consent to disclosures they have not seen
- Re-run the journey with different inputs to extract counter-offer behaviour
- Exfiltrate other applicants' data via the chat surface

**Mitigations.** The model cannot write to the application record from prose. Consent is recorded only when the model emits a structured event tag and the reconciliation rule fires. The pre-contract disclosure is rendered by the UI from the verbatim text in [`lib/disclosures.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/disclosures.ts), so a customer cannot trick the model into "presenting" something different. There is no cross-applicant query path; the route is keyed by the one-time application id and audit logs are append-only.

**Residual risk.** A customer can still abandon and return; the seed-based hydration ([fail-safe state machine](/safety/fail-safe-state-machine)) is authoritative on what they have actually been shown. Free-text fields (employer name, address line) accept arbitrary text by definition; the decision-engine does not condition on them in ways the customer can usefully exploit.

## Adversary 2: compromised retailer

A retailer staff member, or a compromise of the retailer environment, could intercept the one-time customer link, change quote inputs at the point of sale, or impersonate the customer at the start of the journey.

**Mitigations.** The application identifier is single-use and bound to the retailer-broker channel. Every state transition writes to the audit log via [`lib/audit.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/audit.ts) with timestamps and the inputs in scope at that moment. Eligibility and price come from the deterministic engine; a retailer cannot inject a "better" offer through the chat.

**Residual risk.** A retailer with full access to the customer's device or session can in principle drive the conversation. This is an out-of-band attack, not an AI risk; it is mitigated operationally (link delivery, session controls) and is no different in shape from an attacker with a customer's banking credentials.

## Adversary 3: prompt injection from injected user content

Direct or indirect prompt injection against the model. This is the [OWASP LLM01](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) risk and corresponds to the ATLAS technique catalogue under "LLM Prompt Injection". The detailed treatment is on the [prompt injection page](/safety/prompt-injection); the summary here is that user-controlled text reaches the model through the chat input, postcode lookup output, and email field, and could in principle attempt to coerce the model into emitting unauthorised event tags.

**Mitigations.** The [parser](https://github.com/bgood11/lending-agent/blob/main/lib/parser.ts) validates tag shape, disclosure ids, and arity. The reconciliation pass enforces the state machine independent of model output. The model has no tool that submits an application, only the rules in [`lib/reconcile.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/reconcile.ts) do.

**Residual risk.** A successful injection can degrade conversational quality (the model says something silly) but cannot move the customer past a gate they have not actually cleared.

## Adversary 4: model provider compromise

A breach at the model provider, or an unannounced model behaviour change, could cause the model to emit unexpected output.

**Mitigations.** Output is validated, not trusted. The replay engine ([model evaluations](/safety/model-evaluations)) lets us re-run a representative scenario suite against any new model version before promoting it. Prompts are pinned in [`lib/system-prompts.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/system-prompts.ts) and version-controlled.

**Residual risk.** Availability risk is real (the provider can have an outage) but does not map to an unsafe outcome; the journey simply cannot progress.

## Adversary 5: supply chain compromise

A malicious update to the Anthropic SDK or another dependency could try to exfiltrate prompts or alter responses in transit.

**Mitigations.** Standard supply chain hygiene: pinned versions, lockfile, dependabot-style review, and an SBOM. The application contains no PCI or banking credentials in scope to exfiltrate; the most sensitive content is the customer's stated personal data.

**Residual risk.** This is a generic web-app supply-chain risk and is best treated by the broker's existing third-party risk programme. It is called out here for completeness and aligns with [OWASP LLM05 Supply Chain](https://owasp.org/www-project-top-10-for-large-language-model-applications/).

## What is explicitly out of scope

Network-level attacks, denial of service, and account-takeover are handled by the hosting platform and the broker's identity stack. They are not specific to the AI surface. The safety design here assumes the application server is healthy and reachable.
