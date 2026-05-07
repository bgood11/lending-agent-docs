---
title: API routes
description: Every server route in the demo with its method, body shape, and response.
---

The demo's server surface is small. Eight routes. Every one runs on Vercel's Node.js function runtime.

## Sessions

### `POST /api/session`

Create a new session. No body required.

Response:

```ts
{
  sessionId: string;
  case: CaseState;          // empty case
}
```

Used by the installer page on first load.

### `GET /api/session/[sessionId]?seed=...`

Read session state. Optional `seed` query parameter for cold-start hydration.

Response:

```ts
{
  sessionId: string;
  case: CaseState;
  installerMessages: ChatMessage[];
  customerMessages: ChatMessage[];
}
```

Calls [reconciliation](/architecture/reconciliation/) read-only at the top.

### `POST /api/session/[sessionId]/seed`

Hydrate a session from a seed.

Body:

```ts
{ seed: string }
```

Response:

```ts
{ case: CaseState; hydrated: true }
```

Used by the customer page when it lands on a cold instance with a seed in the URL.

## Chat

### `POST /api/chat/installer`

Installer-side chat turn.

Body:

```ts
{
  sessionId: string;
  userMessage?: string;
  isFirstTurn?: boolean;
  seed?: string;
  directEvents?: AgentEvent[];
}
```

Response:

```ts
{
  case: CaseState;
  assistantMessage: ChatMessage | null;
  events: AgentEvent[];          // events the model emitted
  installerMessages: ChatMessage[];
  seed: string;                   // refreshed seed for next call
}
```

### `POST /api/chat/customer`

Customer-side chat turn. The main route. Runs on `runtime: "nodejs"` with `maxDuration: 60` seconds. A single auto-retry (with 800ms backoff) absorbs transient Anthropic failures.

Body:

```ts
{
  sessionId: string;
  userMessage?: string;
  isFirstTurn?: boolean;
  demoScenario?: "auto" | "clean" | "counter" | "decline";
  seed?: string;
  /**
   * Loose-typed in the route handler (not narrowed to AgentEvent at the
   * boundary), then routed through applyEvents which validates per-case.
   */
  directEvents?: Array<{ type: string; data?: Record<string, unknown> }>;
}
```

Response:

```ts
{
  case: CaseState;
  assistantMessage: ChatMessage | null;   // null if model emitted only events
  events: AgentEvent[];
  customerMessages: ChatMessage[];
  seed: string;
}
```

The route's full pipeline:

1. Hydrate from seed if provided
2. Apply direct events
3. Pre-model reconciliation (read-only)
4. Build system notes for direct-event-driven nudges to the model
5. Append user message if provided
6. Build model history (filtered, collapsed, capped at user turn)
7. Call Anthropic
8. Parse model events, apply them
9. Post-model reconciliation (submit allowed)
10. Append assistant message (if non-empty)
11. Build refreshed seed
12. Return

See [`app/api/chat/customer/route.ts`](https://github.com/bgood11/lending-agent/blob/main/app/api/chat/customer/route.ts) for the implementation.

## Audit

### `GET /api/audit/[sessionId]?seed=...`

Build the full audit payload. Optional seed.

Response:

```ts
AuditPayload {
  sessionId: string;
  case: CaseState;
  timeline: AuditTimelineEntry[];
  compliance: ComplianceSummary;
  customerMessages: ChatMessage[];
}
```

Calls reconciliation read-only.

See [Audit & replay](/product/audit-and-replay/).

### `POST /api/audit/[sessionId]/replay`

Run statistical replay across the case's disclosures. Runs on `runtime: "nodejs"` with `maxDuration: 120` seconds (longer than the chat route because it makes up to `n` model calls per disclosure sequentially).

Body:

```ts
{
  n?: number;            // default 5, capped at 20
  seed?: string;
}
```

Returns 400 if the case has no recorded disclosures yet ("complete the journey first"). The route does not auto-submit; it always reads case state and replays against the recorded disclosure list.

Response:

```ts
ReplaySummary {
  sessionId: string;
  disclosures: ReplayResult[];
  overallPassRate: number;
  totalRuns: number;
}
```

Each run is a real Anthropic API call. Charge applies; see [Vercel deployment](/deploy/vercel/) for cost notes.

## Utility

### `POST /api/address-lookup`

Mock UK postcode lookup. Returns a list of addresses for a given postcode.

Body:

```ts
{ postcode: string }
```

Response:

```ts
{
  postcode: string;
  results: Array<{
    addressLine1: string;
    addressLine2?: string;
    town: string;
    county?: string;
  }>;
}
```

Mocked. Returns plausible addresses for any postcode in `lib/address-lookup.ts`'s `AREA_MAP`. In production this would call a real address-lookup API (e.g. Loqate, Ideal Postcodes).

## Authentication

**None.** All routes are unauthenticated in the demo. See [Production hardening](/deploy/production-hardening/) for the auth requirements.

## Rate limiting

**None.** The demo doesn't rate-limit anything. The replay route is the most expensive (each run is a model call); in production it should have at least IP-based rate limiting.

## Errors

All routes return JSON for both success and error responses. Errors come back with a non-2xx status code:

```ts
{ error: "human-readable error message", debug?: { ... } }
```

The chat route includes a `debug` field with `historyLength` and `historyRoles` when an Anthropic call fails after retry. Useful for diagnosing the empty-turn / wrong-role-end class of bug. See [Empty-turn protection](/safety/empty-turn-protection/).

## Adding new routes

The pattern for a new state-reading route:

```ts
import { hydrateFromSeed, ensureSession } from "@/lib/server-store";
import { reconcileSession } from "@/lib/reconcile";

export async function GET(req: Request, ctx) {
  const { sessionId } = await ctx.params;
  const seed = new URL(req.url).searchParams.get("seed");
  if (seed) hydrateFromSeed(sessionId, seed);

  reconcileSession(sessionId, { allowSubmit: false });

  const session = ensureSession(sessionId);
  return NextResponse.json({ /* your shape */ });
}
```

Skip the `hydrateFromSeed` step and the route will work on warm Vercel instances and break on cold ones.
