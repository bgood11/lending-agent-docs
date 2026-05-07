---
title: State types
description: The TypeScript types that define case state and the shapes the journey produces.
---

The full type surface from [`lib/types.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/types.ts). Source code is the authoritative version.

## CaseState

The journey's source of truth.

```ts
interface CaseState {
  sessionId: string;
  retailerName: string;
  status: CaseStatus;

  project: ProjectFacts;
  contact: CustomerContact;
  personal: PersonalFacts;
  financial: FinancialFacts;

  eligibility?: EligibilityFacts;
  provisionalQuote?: ProvisionalQuote;
  emailPreference?: EmailPreference;

  disclosures: DisclosureRecord[];
  consents: ConsentRecord[];

  waterfall?: WaterfallResult;
  selectedOfferId?: string;
  caseOutcome?: CaseOutcomeRecord;

  installerHandoffComplete: boolean;
  createdAt: string;   // ISO timestamp
  updatedAt: string;   // ISO timestamp

  decision?: DecisionResult;   // legacy parallel-offers; not used in new flow
}

type CaseStatus =
  | "intake"
  | "awaiting_customer"
  | "customer_active"
  | "eligibility_check"            // declared but not currently set by applyEvents
  | "quote_ready"
  | "application_data"             // declared but not currently set by applyEvents
  | "submitting"
  | "waterfall_running"
  | "awaiting_counter_decision"
  | "selected"
  | "declined"
  | "ineligible"
  | "withdrawn"
  | "complete";
```

Two of the values (`eligibility_check`, `application_data`) are present in the union but not currently emitted by `applyEvents`. They were carried forward from an older flow shape; treat them as reserved for now. The ten values that the live state machine actually transitions through are documented in [State machine](/architecture/state-machine/).

## Subtypes

### Facts

```ts
interface ProjectFacts {
  projectValue?: number;
  depositAmount?: number;
  depositPct?: number;
  netLoanAmount?: number;       // computed: projectValue - depositAmount
  productSpec?: ProductSpec;
  systemKwp?: number;
  batteryKwh?: number;
}

type ProductSpec =
  | "panels_only"
  | "panels_battery"
  | "panels_battery_ev"
  | "panels_battery_ev_other";

interface CustomerContact {
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
}

interface PersonalFacts {
  fullName?: string;
  dateOfBirth?: string;             // ISO YYYY-MM-DD
  postcode?: string;
  addressLine1?: string;
  addressLine2?: string;
  town?: string;
  county?: string;
  propertyType?: "Detached" | "Semi-detached" | "Terraced" | "Flat" | "Bungalow";
  residentialStatus?: "Owner" | "Mortgaged" | "Tenant" | "Other";
}

interface FinancialFacts {
  employmentStatus?: "Employed" | "Self-employed" | "Retired" | "Unemployed" | "Other";
  annualIncome?: number;
  monthlyOutgoings?: number;
  existingCommitments?: string;     // free-text in the demo; production may want a structured shape
  vulnerabilityIndicators?: string[];
  vulnerabilityNote?: string;
  vulnerabilityCapturedAt?: string;
}

interface EligibilityFacts {
  isOver18: boolean;
  isUkResident: boolean;
  isHomeowner: boolean;
  isEmployed: boolean;
  capturedAt: string;
}
```

### Quote and offers

```ts
interface ProvisionalQuote {
  amount: number;              // loan amount in whole-£ GBP (matches netLoanAmount)
  termMonths: number;
  indicativeAprPct: number;    // typed as percent, e.g. 12.9. Best-available (Prime 1) rate.
  monthlyPayment: number;
  totalPayable: number;
  estimatedMonthlySolarSavings?: number;
  capturedAt: string;
}

interface EmailPreference {
  wantsEmailCopy: boolean;
  email?: string;
  capturedAt: string;
}

interface Offer {
  id: string;
  lender: string;
  position: "Prime Priority 1" | "Prime Priority 2" | "Sub-Prime 1" | "Sub-Prime 2";
  productCode: "IFC" | "BNPL" | "IBC";
  aprPct: number;
  termMonths: number;
  monthlyPayment: number;
  totalPayable: number;
  netLoanAmount: number;
  estimatedMonthlySolarSavings?: number;
  netCostPerMonth?: number;          // monthlyPayment - estimatedMonthlySolarSavings, if both known
}
```

### Disclosures and consents

```ts
interface DisclosureRecord {
  id: string;                  // e.g. "service_status"
  presentedAt: string;
  acknowledgedAt?: string;
}

interface ConsentRecord {
  type: "credit_search" | "data_sharing" | "marketing";
  granted: boolean;
  capturedAt: string;
}

interface DisclosureContent {
  id: string;
  title: string;
  body: string;
  responseExpectation: "acknowledge" | "grant_or_refuse" | "affirm_or_deny";
}
```

### Waterfall

```ts
interface WaterfallResult {
  requestedQuote: ProvisionalQuote;
  steps: WaterfallStep[];
  acceptedOffer?: Offer;
  awaitingCounterDecision: boolean;
  exhausted: boolean;
  updatedAt: string;
}

interface WaterfallStep {
  lender: string;
  position: string;
  outcome: WaterfallStepOutcome;
}

type WaterfallStepOutcome =
  | { kind: "approved_as_requested"; offer: Offer }
  | { kind: "approved_with_counter"; offer: Offer; reason: string }
  | { kind: "declined"; reason: string };
```

### Lifecycle

```ts
interface CaseOutcomeRecord {
  kind: CaseOutcomeKind;
  reason?: string;
  recordedAt: string;
}

type CaseOutcomeKind =
  | "selected"
  | "declined"
  | "ineligible"
  | "withdrawn"
  | "completed";
```

### Messages

```ts
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
}
```

## AgentEvent

The discriminated union for all events. Full per-event payloads in [Event taxonomy](/reference/events/).

```ts
type AgentEvent =
  | { type: "record_project_facts"; data: Partial<ProjectFacts> }
  | { type: "record_customer_contact"; data: Partial<CustomerContact> }
  | { type: "generate_customer_link"; data?: Record<string, never> }
  | { type: "installer_handoff_complete"; data?: Record<string, never> }
  | { type: "record_personal_facts"; data: Partial<PersonalFacts> }
  | { type: "record_financial_facts"; data: Partial<FinancialFacts> }
  | { type: "present_disclosure"; data: { id: string } }
  | { type: "acknowledge_disclosure"; data: { id: string } }
  | { type: "capture_consent"; data: { consentType: ConsentRecord["type"]; granted: boolean } }
  | { type: "record_eligibility";
      data: { isOver18: boolean; isUkResident: boolean; isHomeowner: boolean; isEmployed: boolean } }
  | { type: "record_provisional_quote"; data: { termMonths: number } }
  | { type: "record_email_preference"; data: { wantsEmailCopy: boolean; email?: string } }
  | { type: "submit_application"; data?: Record<string, never> }
  | { type: "accept_counter_offer"; data?: Record<string, never> }
  | { type: "refuse_counter_offer"; data?: Record<string, never> }
  | { type: "request_decision"; data?: Record<string, never> }     // legacy
  | { type: "select_offer"; data: { offerId: string } }            // legacy parallel-offers
  | { type: "record_vulnerability_indicators"; data: { indicators: string[]; note?: string } }
  | { type: "withdraw"; data?: { reason?: string } }
  | { type: "case_outcome"; data: { kind: CaseOutcomeKind; reason?: string } }
  | { type: "case_complete"; data?: Record<string, never> };
```

## Audit types

```ts
interface AuditTimelineEntry {
  ts: string;
  kind:
    | "case_created"
    | "disclosure_presented"
    | "disclosure_acknowledged"
    | "consent_recorded"
    | "eligibility_recorded"
    | "quote_recorded"
    | "email_preference_recorded"
    | "personal_facts_recorded"
    | "financial_facts_recorded"
    | "vulnerability_recorded"
    | "submission"
    | "waterfall_step"
    | "counter_decision"
    | "selected"
    | "withdrawn"
    | "completed"
    | "message";
  summary: string;
  payload?: Record<string, unknown>;
}

interface ComplianceSummary {
  disclosuresPresentedCount: number;
  disclosuresAcknowledgedCount: number;
  allDisclosuresAcknowledged: boolean;
  consentsCount: number;
  explicitConsents: boolean;
  vulnerabilityProbed: boolean;
  vulnerabilityIndicatorsCount: number;
  waterfallSteps: number;
  finalOutcome: string;
  durations: {
    sessionMs: number | null;
    fromConsentToSubmissionMs: number | null;
  };
}

interface AuditPayload {
  sessionId: string;
  case: CaseState;
  timeline: AuditTimelineEntry[];
  compliance: ComplianceSummary;
  customerMessages: ChatMessage[];
}

interface ReplayResult {
  disclosureId: string;
  runs: number;
  passed: number;
  failed: number;
  passRate: number;
  failures: Array<{ runIndex: number; snippet: string }>;
}

interface ReplaySummary {
  sessionId: string;
  disclosures: ReplayResult[];
  overallPassRate: number;
  totalRuns: number;
}
```

These are the shapes a broker integrating with the demo would consume. Stable across versions; additions are non-breaking.
