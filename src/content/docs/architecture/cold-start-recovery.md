---
title: Cold-start recovery
description: How the seed pattern keeps state coherent across stateless serverless function instances.
---

Vercel's serverless functions don't share memory across cold instances. The customer's session might land on instance A for one turn and instance B for the next. Without a recovery mechanism, that means lost state.

The demo's recovery mechanism is a **URL-borne seed**: a base64-encoded snapshot of case state and transcript that travels with the request.

## The shape

Every server response includes a `seed` field:

```ts
{
  case: CaseState,
  customerMessages: ChatMessage[],
  seed: "eyJjYXNlIjp7InNlc3Npb25JZCI6Ij..."   // base64-encoded JSON
}
```

The customer page stores the seed as `liveSeed` in component state and includes it in the URL (`?seed=...`) and in the body of the next chat-route POST.

When the chat route receives a request with a seed, it `hydrateFromSeed` first:

```ts
if (seed) hydrateFromSeed(sessionId, seed);
```

After hydration, the in-memory `Map<sessionId, ServerSession>` is populated with the case state from the seed. Subsequent reads see the same data the previous instance produced.

## Building a seed

[`buildCaseSeed`](https://github.com/bgood11/lending-agent/blob/main/lib/server-store.ts) takes the current session, picks the messages we want to include (customer or installer side), and base64-url-encodes the JSON:

```ts
const json = JSON.stringify({
  case: s.case,
  customerMessages: s.customerMessages
});
return Buffer.from(json, "utf8")
  .toString("base64")
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/, "");
```

The encoding is URL-safe so the seed can travel as a query parameter. Typical seed sizes range from 2KB (early in the journey) to 8KB (after a few turns of conversation). The demo doesn't compress; if URL length became an issue, gzip-then-base64 would be the next step.

## Hydration semantics

`hydrateFromSeed` is **authoritative when the seed has at least as many turns as memory on either side of the conversation**:

```ts
const seedIsAuthoritative =
  !existing ||
  seedCustomerCount >= memCustomerCount ||
  seedInstallerCount >= memInstallerCount;

if (!seedIsAuthoritative) return existing.case;
```

Three things to notice in that condition:

1. The `||` between the two side comparisons is intentional. If the seed has more customer turns OR more installer turns than memory, the seed wins the whole session (case + both message lists). One side being more recent is enough to declare the seed authoritative.
2. The comparison is `>=`, not `>`. A seed with exactly the same number of turns wins, which means a stale-but-equal seed can overwrite memory. In practice the case-state field in the seed is also recent, so this is acceptable; the seed is rarely older than memory at equal turn count.
3. There's no signature or HMAC check. A malformed seed fails JSON parse and returns `null`; a valid-shaped but wrong-session seed is rejected by the `parsed.case.sessionId !== sessionId` check earlier in the function. Tampering with the case state itself is not detected in the demo and would need a signed seed in production.

This is messy. In production you'd swap to a real store and the seed would be a recovery mechanism, not the primary source of truth. See [Production hardening](/deploy/production-hardening/).

## Two sources of truth, reconciled

The demo runs with both an in-memory `Map` (per-instance, lasts as long as the function instance lives) and the URL-borne seed (request-borne, always available). Reconciling them is what makes the journey resilient:

| Scenario | Behaviour |
| --- | --- |
| Warm instance, no seed | Reads from memory |
| Cold instance, no seed | 404 (session doesn't exist) |
| Cold instance, seed provided | Hydrates from seed |
| Warm instance, seed provided | Reconciles: seed wins if it has more turns |

The customer page never relies on memory alone. It always passes the seed. This is what makes the demo demo-able: anyone with a customer URL can pick up the journey from a fresh instance.

## What's NOT in the seed

A few things deliberately stay out:

- **Anthropic API key.** Server-side only.
- **Internal Vercel state.** Function instance ID, region, etc.
- **The audit replay results.** Computed on demand, not part of case state.

The seed is a snapshot of the **journey state and transcript**: nothing else.

## Privacy considerations

The seed contains personal data: name, email, mobile, DOB, address, income, outgoings, vulnerability indicators. It's URL-encoded, which means it ends up in:

- Browser history
- Server logs (if not stripped)
- Referrer headers (if the customer leaves the site mid-journey)
- Anyone who can see the URL bar over the customer's shoulder

The demo accepts this trade-off because the alternative (lost state) is worse for a demo. **In production, do not use the seed pattern for production data.** Swap it for a real store with a session ID in the URL and the data behind authentication.

See [Privacy: data flow](/privacy/data-flow/) and [Privacy: data minimisation](/privacy/data-minimisation/) for the full picture.

## Every state-reading route hydrates

Five routes accept a seed:

- `POST /api/chat/customer`, accepts seed in body
- `POST /api/chat/installer`, accepts seed in body
- `GET /api/audit/[sessionId]?seed=...`, accepts seed in query string
- `POST /api/audit/[sessionId]/replay`, accepts seed in body
- `GET /api/session/[sessionId]?seed=...`, accepts seed in query string
- `POST /api/session/[sessionId]/seed`, accepts seed in body and only hydrates (no read-side reconciliation)

Plus `POST /api/session` to create new sessions, which never accepts a seed because the caller hasn't been given one yet.

This uniformity is on purpose. Any route that reads state must be able to recover from a cold instance. Any route that doesn't would be a bug-in-waiting.

## Adding a new route

When adding a new state-reading server route, the pattern is:

```ts
export async function GET(req: Request, ctx) {
  const { sessionId } = await ctx.params;
  const seed = new URL(req.url).searchParams.get("seed");
  if (seed) hydrateFromSeed(sessionId, seed);

  // Read-only reconciliation (don't auto-submit on inspection)
  reconcileSession(sessionId, { allowSubmit: false });

  const session = ensureSession(sessionId);
  return NextResponse.json({ case: session.case });
}
```

If you forget the hydration step, the route works on warm instances and breaks on cold ones. There's no test that catches this currently; it shows up as "the audit page is empty when shared".
