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
  | "quote_ready"
  | "submitting"
  | "waterfall_running"
  | "awaiting_counter_decision"
  | "selected"
  | "declined"
  | "ineligible"
  | "withdrawn"
  | "complete";
```

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
  dateOfBirth?: string;
  postcode?: string;
  addressLine1?: string;
  addressLine2?: string;
  town?: string;
  county?: string;
  propertyType?: string;
  residentialStatus?: string;
}

interface FinancialFacts {
  employmentStatus?: string;
  annualIncome?: number;
  monthlyOutgoings?: number;
  existingCommitments?: string;
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
  amount: number;              // loan amount in pence-free GBP
  termMonths: number;
  indicativeAprPct: number;    // typed as percent, e.g. 12.9
  monthlyPayment: number;
  totalPayable: number;
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
  aprPct: number;
  termMonths: number;
  monthlyPayment: number;
  totalPayable: number;
  // ... other lender-specific fields
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
  type: "credit_search" | string;
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
  outcome: WaterfallStepOutcome;
}

type WaterfallStepOutcome =
  | { kind: "approved_as_requested"; offer: Offer }
  | { kind: "approved_with_counter"; offer: Offer }
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
  | { type: "generate_customer_link"; data: {} }
  | { type: "installer_handoff_complete"; data: {} }
  | { type: "record_eligibility"; data: Omit<EligibilityFacts, "capturedAt"> }
  | { type: "record_provisional_quote"; data: { termMonths: number } }
  | { type: "record_email_preference"; data: { wantsEmailCopy: boolean; email?: string } }
  | { type: "record_personal_facts"; data: Partial<PersonalFacts> }
  | { type: "record_financial_facts"; data: Partial<FinancialFacts> }
  | { type: "record_vulnerability_indicators"; data: { indicators: string[]; note?: string } }
  | { type: "present_disclosure"; data: { id: string } }
  | { type: "acknowledge_disclosure"; data: { id: string } }
  | { type: "capture_consent"; data: { consentType: string; granted: boolean } }
  | { type: "submit_application"; data: {} }
  | { type: "accept_counter_offer"; data: {} }
  | { type: "refuse_counter_offer"; data: {} }
  | { type: "select_offer"; data: { offerId: string } }
  | { type: "withdraw"; data: { reason?: string } }
  | { type: "case_outcome"; data: { kind: CaseOutcomeKind; reason?: string } }
  | { type: "case_complete"; data: {} }
  | { type: "request_decision"; data: {} };  // legacy
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
