---
title: Disclosure publishing
description: How to version, publish, and approve regulated disclosures so the audit log can prove what was presented and when.
---

A regulated disclosure is the broker's load-bearing piece of compliance text. It is the artefact the FCA looks at when asking "what did the firm tell its customers." Lending Agent's audit log records every disclosure presentation and acknowledgement. For that record to be defensible, the disclosure body has to be versioned, the version has to be recorded, and the publishing flow has to be approval-gated.

This page describes the production lifecycle. The demo (`lib/disclosures.ts`) is a simplification; the production swap-out is bigger than for the lender adapters.

## What the demo does

The demo stores three disclosures inline as TypeScript constants:

- `service_status`: the introducer-and-broker-role disclosure (CONC introducer rule).
- `credit_search_consent`: the soft-search consent text.
- `pre_contract_summary`: the pre-contract information confirmation.

Each has an `id`, a `title`, an expected response type, and a `body`. The agent presents them by emitting `present_disclosure` events with the disclosure id; the customer's UI renders the body and an acknowledge action; the model emits `acknowledge_disclosure` on the customer's tap.

The audit log records the id, the presented timestamp, and the acknowledged timestamp. It does not record the body or the version. For a demo that is fine. For production it is not.

## What production needs

A production disclosure registry has four properties the demo lacks:

1. **Stable id, mutable body, immutable history.** The id (`credit_search_consent`) is the broker's commitment to "we will always present this kind of disclosure at this point in the journey." The body is the words the customer read. The body changes over time as legal interpretation, panel composition, or regulatory guidance shifts. Old bodies cannot be lost.
2. **Versioning.** Each body has a stable version (a monotonic integer or a content hash). The current version of `credit_search_consent` might be v7. Any version 1-6 is referenced by audit records of older cases.
3. **Approval workflow.** A new version of a regulated disclosure goes live only after the broker's compliance lead has signed off. The approval is recorded against the version; the audit log can later show "version 7 was approved by [name] on [date]."
4. **Content-addressed audit.** When a disclosure is presented, the audit log records both the id and the version (or the content hash). When a complaint surfaces months later, the broker can reproduce the exact wording the customer saw.

## The data model

A reasonable production schema:

```ts
interface DisclosureRecord {
  id: string;                          // stable across versions, e.g. "credit_search_consent"
  version: number;                     // monotonic per id
  contentHash: string;                 // SHA-256 of the rendered body
  title: string;
  body: string;                        // markdown or structured nodes
  responseExpectation: "acknowledge" | "consent_yes_no";
  approvedBy: string;
  approvedAt: string;                  // ISO timestamp
  effectiveFrom: string;
  effectiveTo: string | null;          // null = current
  retiredAt: string | null;
}

interface DisclosurePresentationRecord {
  sessionId: string;
  disclosureId: string;                // stable id
  version: number;                     // version that was actually presented
  contentHash: string;                 // matched against DisclosureRecord
  presentedAt: string;
  acknowledgedAt: string | null;
  acknowledgementDurationMs: number | null;
}
```

The two records bind together: the presentation record points at a specific version, and the disclosure record holds the body for that version. Reconstructing a customer's experience six months later is a single join.

## The audit-log change

`buildAuditTimeline` in `lib/audit.ts` produces a `disclosure_presented` entry today with payload `{ id }`. Production needs payload `{ id, version, contentHash }`. The body is not in the audit log, but the hash is, which is enough to detect tampering and to look up the body from the disclosure registry.

Cross-link to [/regulatory/replay-and-evidence/](/regulatory/replay-and-evidence/) and [/privacy/retention/](/privacy/retention/). The audit log retention period is set by CONC and SYSC obligations and runs to several years; the disclosure registry must outlive it.

## The approval workflow

The publishing flow:

1. **Drafting.** A compliance officer drafts a new version of an existing disclosure (or a brand new disclosure) in a staging area. The system produces the new content hash.
2. **Diff review.** The system surfaces a side-by-side diff against the current live version. The reviewer reads the change.
3. **Test corpus.** The replay scorer (see [/implementation/brokers/audit-integration/](/implementation/brokers/audit-integration/)) runs against a corpus of representative cases using the new disclosure. The pass rate is recorded.
4. **Compliance signoff.** The compliance lead approves the version, with a recorded reason. Two-person rule: the drafter cannot also be the approver.
5. **Effective date.** The new version becomes effective at a chosen timestamp, usually the next business day. Old versions are marked `retiredAt = effectiveFrom` of the new version.
6. **Publication.** The agent picks up the new version on its next call to the registry. Cases mid-flight at the moment of cutover continue to see the version they started with (more on this below).

In code, the registry exposes:

```ts
interface DisclosureRegistry {
  getCurrent(id: string): Promise<DisclosureRecord>;
  getVersion(id: string, version: number): Promise<DisclosureRecord>;
  listVersions(id: string): Promise<DisclosureRecord[]>;
  publish(draft: DisclosureDraft, approver: User): Promise<DisclosureRecord>;
}
```

`getCurrent` returns the version effective at the call time. `getVersion` is for audit replay.

## Mid-flight cases

When a new version of a disclosure goes live, what happens to a case where the agent has already presented v6 of `credit_search_consent` but the customer has not yet acknowledged?

The cleanest rule: **a presentation locks the version**. Once a `present_disclosure` event fires for v6, the rest of that case sees v6, even if v7 goes live before the customer taps acknowledge. The presentation record holds the version.

If the case is still in intake (no `present_disclosure` event yet), the next presentation uses the new current version.

This rule keeps the audit log internally consistent: the body the customer saw is the body recorded.

## Replacing `lib/disclosures.ts`

In production the agent loads disclosures from the registry, not from a TypeScript constant. The shape of `getDisclosure(id)` becomes async and returns a `DisclosureRecord` rather than a static body.

The `present_disclosure` agent event grows a `version` field:

```ts
{ type: "present_disclosure", data: { id: "credit_search_consent", version: 7 } }
```

The case store's `applyEvents` for `present_disclosure` records the version on the case's disclosure list. The audit log emits it. Everything downstream stays the same.

The agent's system prompt should not interpolate the disclosure body. The agent emits the event; the UI fetches the body from the registry and renders it. This separation means a body change does not invalidate any cached agent outputs and does not require a model retrain or prompt re-issue.

## What lives in a CMS, what does not

A common temptation is to put the disclosure registry behind a generic CMS. This is dangerous. Most CMS products do not enforce two-person approval, do not produce content hashes, do not preserve old versions correctly, and do not give the engineering team a tested API for fetching a specific version.

The disclosure registry should be a small, purpose-built service. The schema fits in a single Postgres table plus a versions table. The approval workflow is two endpoints. The content rendering is markdown or a small structured node tree. Build it in two weeks; do not spend three months bolting governance onto a CMS that resists it.

What can live in a generic CMS without risk: the agent's non-regulated voice (greetings, transitions, FAQ answers, the retailer's product noun). Those are not load-bearing for compliance and benefit from a marketing team's editing UI.

## Cross-links

- [/regulatory/conc/](/regulatory/conc/) for the disclosures CONC requires.
- [/regulatory/replay-and-evidence/](/regulatory/replay-and-evidence/) for how the audit log is used as evidence.
- [/privacy/retention/](/privacy/retention/) for how long disclosure presentation records have to live.
- [/implementation/brokers/audit-integration/](/implementation/brokers/audit-integration/) for the broker's compliance evidence pipeline.
