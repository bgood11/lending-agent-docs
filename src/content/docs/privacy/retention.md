---
title: Retention
description: How long data is kept, why, and how the audit log interacts with the right to erasure.
---

Retention sits at the intersection of two regimes that pull in opposite directions. UK GDPR Article 5(1)(e) (storage limitation) tells you to keep personal data no longer than necessary. The FCA's record-keeping rules tell you to keep evidence of regulated activities for years. Lending Agent's retention design is the result of resolving that tension at the level of individual data fields.

## The two governing instruments

- **UK GDPR Article 5(1)(e)** requires that personal data be kept "in a form which permits identification of data subjects for no longer than is necessary". The ICO's [storage limitation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/the-principles/storage-limitation/) guidance treats this as a positive obligation: you must define and document retention, not just promise to delete eventually.
- **FCA SYSC 9.1** requires firms to "arrange for orderly records to be kept of its business and internal organisation". Records are to be retained "for as long as is relevant for the purposes for which they are made". For consumer credit specifically, the [CONC sourcebook](https://www.handbook.fca.org.uk/handbook/CONC/) sets out additional record-keeping obligations including retained creditworthiness assessments, customer communications, and consent records.

Where these regimes overlap, the FCA's expected retention determines the **maximum** that you can justify under UK GDPR; the GDPR principle determines the **minimum** that you should design for.

## Default retention windows for credit broking

The widely accepted default in the UK consumer credit industry is a six-year retention period for application and decision records, aligned with the limitation period for contractual claims under the Limitation Act 1980. Some firms extend to seven years to cover tax-related obligations. The agent's retention table reflects this.

| Data class | Default retention | Source / rationale |
| --- | --- | --- |
| URL seed | Single navigation, then discarded | Minimisation, no record-keeping basis |
| In-memory case state | Session, then discarded if not submitted | Minimisation |
| Conversation transcript | 90 days | Operational debugging window; not a regulatory record |
| Structured application data | 6 years from end of customer relationship | FCA limitation-period default |
| Decisioning evidence | 6 years | CONC creditworthiness obligations |
| Consent records (CRA, marketing) | 6 years | Demonstrability under UK GDPR Article 7(1) |
| Vulnerability indicators (counts) | 6 years | Aligns with the application record |
| Vulnerability free-text disclosures | 90 days unless escalated | Minimisation; only retain longer where contractually necessary |
| Audit log entries | 6 years | SYSC 9 record-keeping |
| Pre-contract documents (PCCI / SECCI) | 6 years | CONC 4 evidential requirement |
| Marketing-related personal data | Until objection or 24 months of inactivity, whichever sooner | PECR + minimisation |

Each window must be set and documented by the broker controller. The defaults above are a starting point, not legal advice; calibrate to the firm's regulatory permissions and product mix.

## The audit log: long retention by design, but not "long retention of everything"

The audit log is the durable, append-only record of what the agent did and what the customer did. It is the artefact you produce in a regulator's investigation or a court case. The retention story for the audit log is the most contested piece of any agentic system, so it deserves a few specifics.

- **What is in the audit log**: gate transitions, structured field commits, tool calls and their structured outcomes, decisions, hashed customer identifiers, consent timestamps, hashes of issued documents.
- **What is *not* in the audit log**: the raw chat transcript, raw free-text disclosures, screenshots, model context windows.
- **Why this split is justified**: the regulatory record-keeping purpose is satisfied by knowing that a particular event happened at a particular time involving a particular structured field. It does not require the conversational chrome that surrounded it. By splitting them, you can keep the durable artefact for six years and let the conversational tail expire after 90 days.
- **Storage form**: hashed identifiers, with raw resolution behind an audited unseal step. This means an audit log entry six years old does not directly expose the customer; it links to a record that, if it has been deleted under retention or erasure, can no longer be re-identified.

## Right to erasure and how it interacts with the audit trail

UK GDPR Article 17 gives the data subject a right to erasure "without undue delay". The right is not absolute. It does not apply to the extent that processing is necessary "for compliance with a legal obligation" (Article 17(3)(b)) or "for the establishment, exercise or defence of legal claims" (Article 17(3)(e)).

For Lending Agent the practical position is:

- **Before submission**: erasure is straightforward. The case state is purged, the transcript is queued for accelerated deletion, and only a minimal "session ended without submission" marker remains.
- **After submission, before regulatory retention expires**: the FCA's record-keeping obligations and the limitation period for contract claims provide the legal basis to refuse erasure of the structured application record and the audit log. The right is not extinguished; it is **deferred** until those obligations expire. The customer should be told this in the response.
- **After regulatory retention expires**: erasure becomes a positive obligation again. The retention scheduler should sweep records out automatically rather than wait for a request.
- **Throughout**: ancillary data that is **not** required for record-keeping (the conversation transcript, marketing preferences, telemetry) can and should be erased on request even when the structured record is retained.

The art is in answering "no, but with reasons" cleanly. A response to an erasure request should specify which data is being deleted now, which data is being retained on which legal basis, and when that retention expires.

## A practical retention review

Run a retention review at least annually. Walk the table above against your live data, confirm that scheduled deletions are happening, sample-test the unseal process, and check that the privacy notice still reflects reality. Retention failures are the single most common ICO finding in the financial services sector and are the easiest to detect from outside.
