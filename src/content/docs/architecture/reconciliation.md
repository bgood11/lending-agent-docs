---
title: Reconciliation
description: One pure function with three rules that closes any gaps the model leaves open. The centralpiece of the architecture.
---

[`lib/reconcile.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/reconcile.ts) is the most important file in the codebase. It's the centralpiece of the architecture and the reason the journey recovers from any model-side confusion automatically.

## What it does

It runs three rules over the current `CaseState`. If a rule's preconditions are met but its consequence hasn't happened, it makes the consequence happen by emitting the necessary events.

```ts
export function reconcileSession(
  sessionId: string,
  opts: { scenario?: DemoScenario; allowSubmit?: boolean } = {}
): ReconciliationResult {
  // R1: consent granted → ack the linked disclosure
  // R2: consent granted → present pre-contract summary
  // R3: all gates passed → run the waterfall (if allowSubmit)
}
```

Each rule is a precondition check followed by a state mutation via `applyEvents` or `setWaterfall`. The function returns a list of which rules fired and any side data the chat route needs (like the waterfall narration block).

## The three rules

### R1: ack consent disclosure

If `credit_search` consent is granted but the `credit_search_consent` disclosure isn't yet acknowledged, fire `acknowledge_disclosure` for that disclosure ID.

Why: when the customer clicks Grant on the credit search consent card, the UI dispatches `capture_consent`. That single event records the consent. The disclosure-acknowledgement is a logical consequence (you can't grant consent without acknowledging the disclosure that explains what you're consenting to), but it's a separate event. If the model also forgets to emit `acknowledge_disclosure`, the audit log would show an unacked disclosure forever. Reconciliation closes this.

### R2: present pre-contract summary

If `credit_search` consent is granted but the `pre_contract_summary` disclosure hasn't been presented yet, fire `present_disclosure` for it.

Why: the journey ordering is fixed. After consent, the next gate is pre-contract. The agent should emit `present_disclosure` for it, but sometimes forgets. This rule guarantees the disclosure is presented regardless of what the model decides to say.

### R3: submit when all gates pass

If `pre_contract_summary` is acknowledged AND `credit_search` consent is granted AND personal facts are captured (`personal.fullName` is set) AND financial facts are captured (`financial.employmentStatus` is set) AND a quote was chosen (`provisionalQuote` is set) AND no waterfall has run yet (`waterfall` is undefined), then run the waterfall.

This rule only fires when `allowSubmit: true` is passed. Inspecting state (audit pages, session GETs) must NEVER auto-run the waterfall, because that would cause "viewing a stalled case" to "fund the application", which is a problem.

The chat route calls reconcile twice per turn:

```ts
// Pre-model: read-only reconciliation
reconcileSession(sessionId, { allowSubmit: false });

// ... apply direct events, append user message, build system notes ...

// ... call the model, parse and apply its events ...

// Post-model: submission allowed
const recon = reconcileSession(sessionId, { allowSubmit: true });
if (recon.waterfallRanNow) {
  // add waterfall narration to the next response
}
```

## Why centralised

The original codebase had reconciliation logic scattered across `applyEvents` (R1 and R2 used to be inline in the `capture_consent` case) and the chat route (R3 was inline). This was hard to reason about: when a gate didn't fire as expected, you had to grep for it across files.

Centralising in `reconcile.ts` means: when a gate doesn't fire, there's exactly one place to look. Adding a new gate is a one-line addition to one file.

The discipline carries forward: cross-cutting "if X has happened, also fire Y" rules live in reconcile, never in `applyEvents`.

## What reconciliation isn't

It's not a workflow engine. It doesn't know about the journey order in any meaningful way. Each rule is a local precondition check.

It's not async. No external calls. No model invocations. Pure synchronous state mutation.

It's not a place for "if the model said X, do Y". That's the chat route's job (the system notes mechanism). Reconciliation only looks at the case state, not at conversational signals.

## Invariants reconciliation enforces

After reconciliation runs, the following invariants hold:

- If `credit_search` consent is granted, the `credit_search_consent` disclosure has an `acknowledgedAt`.
- If `credit_search` consent is granted, the `pre_contract_summary` disclosure has a `presentedAt`.
- If all submission preconditions are met (and `allowSubmit: true`), `case.waterfall` is populated.

These are the invariants the rest of the system can rely on. The customer page can render its UI without worrying about partially-applied gate transitions.

## Read-only callers

Three routes call reconcile read-only (`allowSubmit: false`):

- `GET /api/audit/[sessionId]`, building the audit payload
- `GET /api/session/[sessionId]`, reading session state for the customer page
- `POST /api/audit/[sessionId]/replay`, running statistical replay

These routes can fix R1 and R2 (they're idempotent and harmless) but cannot fire R3.

The chat route is the only caller with `allowSubmit: true`, and it only sets it on the post-model pass. This means: a stuck case with all preconditions met will get its waterfall run on the next turn the customer (or an automation) sends, but never as a side-effect of someone reading the audit log.

## Real bug it fixes

During development the agent occasionally got confused after pre-contract confirmation: it would say something like *"I appreciate your patience. Let me make sure we've gone through each step properly..."* and try to restart from step 1, even though the case state was already at "all gates passed, ready to submit". The fix wasn't more prompt engineering. The fix was R3.

When the customer's next turn lands, reconciliation sees consent + pre-contract + personal + financial + quote and no waterfall, runs it, and tells the model: "the waterfall has just run, narrate the result". The model snaps out of the loop and narrates the lender outcomes.

This is the fail-safe property: state is the source of truth, the model is a narrator. See [Fail-safe state machine](/safety/fail-safe-state-machine/) for the safety implications.

## Adding a new rule

When a new cross-cutting "if X then Y" rule is needed:

1. Add the precondition check and the state mutation to `reconcileSession()`.
2. If the chat route needs to know about it (e.g. to add a system note for the model to narrate), return a tag from the function.
3. Add a corresponding test against a representative case state.

Don't add it to `applyEvents`. Don't add it to the chat route. Don't add it to the customer page. Reconciliation is the place.
