---
title: Replay and evidence
description: The §7.7 replay protocol, what the audit log proves, and the open methodological questions.
---

## Why replay

The Consumer Duty asks firms to monitor outcomes. The Principles ask firms to take reasonable care. The SMCR asks named senior managers to take reasonable steps. The FCA's AI Update asks firms to evidence explainability, governance, and monitoring. None of these obligations is satisfied by an attestation that the firm tested its agent before deployment. They require ongoing evidence that the deployed agent behaves as expected on real cases.

Replay is the demonstrator's answer to that requirement. The §7.7 protocol (set out in the [reference protocol pages](../reference/protocol/)) defines a deterministic format for journey transcripts and a scoring rubric that can be re-applied against any version of the agent. Statistical replay then produces, for each deployed version, an outcome distribution that can be compared against the configuration's pre-deployment evaluation set and against historical baselines.

## What the audit log captures

Every step in the journey emits a typed event. The schema includes:

- **Step type**: status, eligibility, indicative quote, application details, vulnerability, consent, pre-contract, submission, decision.
- **Timestamps**: client-rendered and server-acknowledged for each event.
- **Verbatim agent output**: the exact text rendered to the customer, before any client-side formatting.
- **Verbatim customer input**: where the customer typed or selected, the captured input, including modifications.
- **State transitions**: the journey state before and after the step.
- **Configuration version**: the agent build, the prompt version, the rubric version, the lender adapter version.
- **Lender adapter inputs and outputs**: every payload sent to a lender adapter and every response received.

The log is append-only. Events are signed with a per-deployment key so that a tampered log can be detected. The customer's data inside the log is subject to the firm's retention and minimisation rules under UK GDPR and the [ICO's AI guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/guidance-on-ai-and-data-protection/).

## What the audit log proves

The log proves four things. It does not prove a fifth thing that is sometimes claimed for it.

1. **What the customer was shown**. The verbatim agent output is in the log; reviewers can reconstruct the customer's view of the journey deterministically.
2. **What the customer did**. The customer's inputs are in the log; reviewers can see whether the customer scrolled to the end of the SECCI, paused at the vulnerability step, or withdrew before submission.
3. **What the agent decided**. State transitions are explicit; reviewers can see why the journey advanced, halted, or branched at any step.
4. **What was sent to the lender**. The lender adapter payloads are in the log; reviewers can verify that the lender received the customer's data in the form the customer confirmed.

The log does not prove that the agent's response on a specific turn was the optimal response. That requires scoring against a rubric, which is where replay enters.

## Statistical replay and FCA-grade evidence

Replay re-executes a stored journey transcript against a current or historical agent build, then scores the resulting outputs against a versioned rubric. The output is a per-case score and a population distribution.

There are three replay modes:

- **Regression replay**: re-score historical cases against the current agent build, to detect whether a new build degrades behaviour on previously good cases.
- **Drift replay**: re-score current cases against a held-out historical rubric, to detect whether the agent's behaviour has drifted relative to the rubric it was deployed against.
- **Counterfactual replay**: re-execute a historical case with a perturbed input (a different vulnerability disclosure, a different income figure) to test specific behavioural properties.

For each mode, the replay produces a numeric score per case and a confidence interval per build. A firm using the demo's pattern can present a supervisor with: "for builds A through F deployed in the period under review, here is the per-case score distribution against rubric R, with the rubric's own version history".

That is the sense in which replay produces FCA-grade evidence. It is reproducible (the inputs are versioned), auditable (the rubric is human-readable and versioned), and continuous (the cost of running replay over the next month's cases is the same as running it over last month's).

## Evidence integrity: what survives challenge

A regulator or a complainant can challenge the audit log on three vectors. Each has a mitigation in the demo's design.

- **The log was tampered with**. Mitigation: per-deployment signing keys held outside the application's runtime; signed events are verifiable independent of the application.
- **The log is incomplete**. Mitigation: events are emitted synchronously with state transitions; a missing event means the transition did not happen, which is itself detectable.
- **The verbatim record is misleading because the model was non-deterministic**. Mitigation: temperature is fixed for the deterministic disclosures; for generated layers, the seed and the model version are logged, so a re-execution can in principle reproduce the original output within the bounds of the underlying model's determinism guarantees.

The third mitigation is the weakest. Frontier models do not offer hard determinism even with seed and temperature pinned. The honest position is that the audit log captures the verbatim output once, and the replay regime catches behavioural drift across builds; perfect re-execution of a single historical turn is not always achievable.

## Methodology open questions

Several methodological questions in the demo are open.

- **Scoring threshold**: the rubric assigns a numeric score per case. The demo uses an interim threshold derived from a small held-out evaluation set scored by human reviewers; a production firm would need to calibrate against its own customer population, vulnerability distribution, and product mix. There is no FCA-published number for "good enough".
- **Drift detection**: how fast should drift be flagged? The trade-off is between false positives (flagging benign run-to-run variation) and false negatives (missing real regression). The demo runs replay nightly, but this is a working assumption.
- **Version pinning**: the demo pins agent build, prompt version, rubric version, and lender adapter version. It does not pin foundation-model weights, because providers do not expose stable weight identifiers; mitigations include using providers that publish model snapshots and freezing on a snapshot for the duration of a deployed build.
- **Rubric calibration**: the rubric encodes what "good" looks like. The demo treats the rubric as a versioned artefact under the named senior manager's accountability, but review cadence, sign-off, and change control are firm-specific.

## How this connects to the rest of the section

Replay is the spine that lets the [Consumer Duty](./consumer-duty/) outcomes be measured at population scale, lets [CONC](./conc/) compliance be evidenced beyond sampling, and gives the [FCA AI strategy](./fca-ai-strategy/) expectations on monitoring something operationally tractable. It is not a substitute for the underlying authorisation, the named senior manager's accountability under [SMCR](./principles-smcr/), or the firm's vulnerability framework under [FG21/1](./vulnerable-customers/). It is the layer that turns those obligations from policy statements into measurable outcomes.
