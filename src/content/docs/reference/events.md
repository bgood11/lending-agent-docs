---
title: Event taxonomy
description: Every agent-event type with its data shape and effect on case state.
---

The full `AgentEvent` discriminated union from [`lib/types.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/types.ts). Every event has a `type` and an optional `data` payload.

## Project & contact (installer side)

### `record_project_facts`

```ts
{
  type: "record_project_facts",
  data: {
    projectValue?: number;
    depositAmount?: number;
    depositPct?: number;
    productSpec?: "panels_only" | "panels_battery" | "panels_battery_ev" | "panels_battery_ev_other";
    systemKwp?: number;
    batteryKwh?: number;
    retailerName?: string;
  }
}
```

**Effect**: merges into `case.project`. Computes deposit % from amount and vice versa.

### `record_customer_contact`

```ts
{
  type: "record_customer_contact",
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    mobile?: string;
  }
}
```

**Effect**: merges into `case.contact`.

### `generate_customer_link`

```ts
{ type: "generate_customer_link", data: {} }
```

**Effect**: sets `case.status = "awaiting_customer"`.

### `installer_handoff_complete`

```ts
{ type: "installer_handoff_complete", data: {} }
```

**Effect**: sets `case.installerHandoffComplete = true`, `case.status = "awaiting_customer"`.

## Customer journey

### `record_eligibility`

```ts
{
  type: "record_eligibility",
  data: {
    isOver18: boolean;
    isUkResident: boolean;
    isHomeowner: boolean;
    isEmployed: boolean;
  }
}
```

**Effect**: stores eligibility, sets status to `quote_ready` (all yes) or `ineligible` (any no).

### `record_provisional_quote`

```ts
{ type: "record_provisional_quote", data: { termMonths: number } }
```

**Effect**: computes the indicative quote at the prime rate via `getIndicativeQuote()`.

### `record_email_preference`

```ts
{
  type: "record_email_preference",
  data: { wantsEmailCopy: boolean; email?: string }
}
```

**Effect**: stores email opt-in choice.

### `record_personal_facts`

```ts
{
  type: "record_personal_facts",
  data: {
    fullName?: string;
    dateOfBirth?: string;
    postcode?: string;
    addressLine1?: string;
    addressLine2?: string;
    town?: string;
    county?: string;
    propertyType?: string;
    residentialStatus?: string;
  }
}
```

**Effect**: merges personal facts. Transitions status to `customer_active` if needed.

### `record_financial_facts`

```ts
{
  type: "record_financial_facts",
  data: {
    employmentStatus?: string;
    annualIncome?: number;
    monthlyOutgoings?: number;
    existingCommitments?: string;
  }
}
```

**Effect**: merges financial facts.

### `record_vulnerability_indicators`

```ts
{
  type: "record_vulnerability_indicators",
  data: { indicators: string[]; note?: string }
}
```

**Effect**: stores Consumer Duty flags + free-text note in `case.financial`.

## Disclosures and consents

### `present_disclosure`

```ts
{
  type: "present_disclosure",
  data: { id: "service_status" | "credit_search_consent" | "pre_contract_summary" }
}
```

**Effect**: records that a disclosure has been shown to the customer with a timestamp.

### `acknowledge_disclosure`

```ts
{ type: "acknowledge_disclosure", data: { id: string } }
```

**Effect**: records the customer's I-understand / I-confirm response with a timestamp.

### `capture_consent`

```ts
{
  type: "capture_consent",
  data: {
    consentType: "credit_search" | "data_sharing" | "marketing";
    granted: boolean;
  }
}
```

**Effect**: records explicit consent. Replaces any prior consent of the same `consentType` (the store filters out the older record before pushing the new one). Triggers reconciliation rules R1 and R2 when `consentType === "credit_search"` and `granted === true` (auto-ack the linked disclosure, auto-present pre-contract). The demo only emits `credit_search`; the other two values exist in the type union for future expansion.

## Application + waterfall

### `submit_application`

```ts
{ type: "submit_application", data: {} }
```

**Effect**: sets status to `submitting`. The route handler runs the waterfall.

### `accept_counter_offer`

```ts
{ type: "accept_counter_offer", data: {} }
```

**Effect**: only fires if `caseState.waterfall.awaitingCounterDecision` is true. Calls `acceptCounter(waterfall)` to mark the latest counter-offer step as accepted, sets `case.selectedOfferId` from `waterfall.acceptedOffer.id`, and transitions `status` to `selected`.

### `refuse_counter_offer`

```ts
{ type: "refuse_counter_offer", data: {} }
```

**Effect**: clears `waterfall.awaitingCounterDecision`, sets `status = "waterfall_running"`. The route handler then re-runs `runWaterfall` with `fromIndex = waterfall.steps.length`, picking up at the next lender on the panel.

### `select_offer`

```ts
{ type: "select_offer", data: { offerId: string } }
```

**Effect**: legacy parallel-offers flow. Marks an offer as selected.

## Lifecycle

### `withdraw`

```ts
{ type: "withdraw", data: { reason?: string } }
```

**Effect**: sets `case.status = "withdrawn"`, records `case.caseOutcome` with the reason.

### `case_outcome`

```ts
{
  type: "case_outcome",
  data: {
    kind: "selected" | "declined" | "ineligible" | "withdrawn" | "completed";
    reason?: string;
  }
}
```

**Effect**: records the terminal case outcome.

### `case_complete`

```ts
{ type: "case_complete", data: {} }
```

**Effect**: a no-op if the case is already in `declined`, `ineligible`, or `withdrawn`. Otherwise sets `status = "complete"` and, if no `caseOutcome` is set, records a fallback `{ kind: "completed", recordedAt }`. The agent emits this at the end of any path that didn't already lock to a more specific terminal state.

## Direct events vs model events

Every event in this taxonomy can be emitted by either:

- **The model**: as inline `<agent-event>` tags in its prose
- **The UI**: as `directEvents` in the chat route's request body

Both go through the same `applyEvents` function. The UI uses direct events for regulated commitments (eligibility answers, consent, application details, vulnerability flag). The model emits events for narrative pacing (greeting, signposting which disclosure to present next).

See [Event protocol](/architecture/event-protocol/) for parsing details.
