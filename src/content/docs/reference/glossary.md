---
title: Glossary
description: The terms used across the documentation, in one place.
---

Domain-specific terms used throughout the docs. UK consumer-credit context unless stated otherwise.

## A

**Agent**. The AI surface talking to the customer (or installer). Implemented as Claude Sonnet 4.6 with a structured-event protocol.

**`<agent-event>`**. The structured event tag the agent embeds in its prose. See [Event protocol](/architecture/event-protocol/).

**Application details**. Step in the customer journey where personal and financial facts are captured in a single form. Also called the "Information Request gate".

**Audit log**. The chronological record of every state-mutating event in a case. Surfaced at `/audit/[sessionId]`. See [Audit & replay](/product/audit-and-replay/).

**Awaiting counter decision**. State the case enters when a downstream lender has counter-offered and the customer is choosing whether to accept.

## B

**Broker**. The FCA-regulated credit broker that arranges consumer credit through a panel of lenders. Holds the regulatory permission. Distinct from the **retailer** (introducer) and the **lender** (decisioning).

**Broker-controlled surface**. A page rendered on the broker's own infrastructure, used for low-trust user agents to render verbatim regulated content. See [Trust gradient](/product/trust-gradient/).

## C

**`CaseState`**. The TypeScript type representing the journey's source of truth. See [State types](/reference/types/).

**`case_outcome`**. Terminal event recording how a case ended. See [Withdraw and outcomes](/product/withdraw-and-outcomes/).

**Case Outcome Kind**. One of `selected`, `declined`, `ineligible`, `withdrawn`, `completed`.

**CONC**. The FCA Handbook's Consumer Credit sourcebook. See [CONC](/regulatory/conc/).

**Consumer Duty**. FCA rules (PS22/9, FG22/5) requiring firms to deliver good outcomes for retail customers. Four outcomes: products and services, price and value, consumer understanding, consumer support. See [Consumer Duty](/regulatory/consumer-duty/).

**Counter-offer**. A lender approving an application at terms different from the requested ones (e.g. higher APR, longer term). See [Counter-offer mechanics](/implementation/lenders/counter-offers/).

## D

**Decision API**. A lender's HTTP/MCP/REST surface for receiving an application and returning an `approved_as_requested | approved_with_counter | declined` decision. Mocked in `lib/decision-engine.ts`. See [Decision API adapter](/implementation/lenders/decision-api/).

**Direct events**. Events dispatched by the UI directly (button clicks, form submissions) without going through the model. Always deterministic. Distinct from **model events**.

**Disclosure**. Verbatim regulated content presented to the customer. The demo has three: `service_status`, `credit_search_consent`, `pre_contract_summary`. Stored in `lib/disclosures.ts`.

**DPIA**. Data Protection Impact Assessment. ICO guidance requires one for processing involving novel technology, automated decision-making, or special category data. See [DPIA](/privacy/dpia/).

## E

**Eligibility check**. Four-yes-no-question gate that runs before any credit search. Failing eligibility takes the customer to the ineligible path with no application made.

## F

**FCA**. Financial Conduct Authority, the UK regulator for consumer credit.

**FG21/1**. FCA Finalised Guidance on the fair treatment of vulnerable customers. See [Vulnerable customers](/regulatory/vulnerable-customers/).

**FG22/5**. FCA Finalised Guidance on Consumer Duty. See [Consumer Duty](/regulatory/consumer-duty/).

## I

**Indicative quote**. The pre-application loan figure shown to the customer based on the prime lender's rate card. Subject to which lender actually approves them.

**Information Request gate**. The protocol's term for a single structured form that captures multiple facts at once. The demo's "Application details" card is one. Distinct from conversational data gathering.

**Installer**. The retailer's representative on the customer's doorstep. Uses the installer surface to capture project facts and customer contact, then hands off to the customer's phone.

**Introducer**. The retailer in the regulated sense: the firm that introduces the customer to the broker. Doesn't hold the FCA permission itself.

## L

**Lender**. The firm making the credit decision and providing the funding. Sits on the broker's panel.

**Lender adapter**. Per-lender code that wraps the lender's decision API behind a uniform `LenderAdapter` interface for the waterfall to call.

## M

**Model events**. Events the model emits as inline `<agent-event>` tags. Probabilistic; the deterministic side ([reconciliation](/architecture/reconciliation/)) closes any gaps.

## P

**PECR**. Privacy and Electronic Communications Regulations. Governs SMS, email, cookies. See [PECR & cookies](/privacy/pecr-and-cookies/).

**Pre-contract summary**. The disclosure asking the customer to confirm the information they've given is true and complete, before the application is submitted to the lender panel.

**Prime / Prime 2 / Sub-prime**. Lender tiers in the demo's mock waterfall. Prime is the first lender called; subsequent lenders cover progressively higher-risk customers.

**PRIN**. The FCA Handbook's Principles for Businesses. See [Principles & SMCR](/regulatory/principles-smcr/).

## R

**Reconciliation**. The pure function in `lib/reconcile.ts` that closes cross-cutting gaps the model leaves open. Three rules: ack on consent, present pre-contract on consent, run waterfall when all gates pass. See [Reconciliation](/architecture/reconciliation/).

**Replay engine**. The component that re-runs each disclosure N times against the agent to produce a per-disclosure compliance pass rate. See [Replay & evidence](/regulatory/replay-and-evidence/).

**Retailer**. The firm whose installer is on the customer's doorstep. Introduces the customer to the broker. Doesn't hold the FCA permission.

## S

**Seed**. A base64-encoded snapshot of case state and transcript that travels in the URL or request body. Lets cold serverless instances recover the full session state. See [Cold-start recovery](/architecture/cold-start-recovery/).

**`select_offer` / `accept_counter_offer` / `refuse_counter_offer`**. Events dispatched by the customer's accept/refuse buttons during the waterfall.

**Service status disclosure**. The opening regulated content presented to the customer, explaining who the broker is, that they're not the lender, and what's about to happen.

**SMCR**. Senior Managers and Certification Regime. Allocates personal accountability for AI-related decisions in regulated firms. See [Principles & SMCR](/regulatory/principles-smcr/).

## T

**Trust gradient**. The protocol concept that high-trust user agents can render regulated content inline, while low-trust user agents have to send the customer to a broker-controlled surface. See [Trust gradient](/product/trust-gradient/).

## U

**UK GDPR**. The UK's data-protection regulation, derived from EU GDPR but distinct in some respects post-Brexit. See [UK GDPR](/privacy/uk-gdpr/).

**User agent**. The AI surface talking to the customer. Could be the broker's own (high-trust) or a third-party assistant (low-trust).

## V

**Verbatim**. Regulated content that must be rendered exactly as published, with no paraphrasing by the model. The demo's disclosure pattern (model emits `present_disclosure`, UI renders body verbatim) is what makes this enforceable.

**Vulnerability indicators**. The five-checkbox card asking the customer to self-disclose vulnerability factors. Always optional, never penalised. See [Vulnerable customer protection](/safety/vulnerable-customer-protection/).

## W

**Waterfall**. Sequential lender panel: lender 1 first, then 2, then 3, etc. Each can approve as requested, counter-offer at different terms, or decline. See [Waterfall protocol](/implementation/lenders/waterfall-protocol/).

**Withdraw**. The customer's option to leave the journey at any point. Triggered by the "Leave for now" link in the page header. See [Withdraw and outcomes](/product/withdraw-and-outcomes/).
