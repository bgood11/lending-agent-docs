---
title: Local development
description: Clone, install, set the API key, run the dev server.
---

The local-development setup takes about 5 minutes from a fresh clone.

## Prerequisites

- Node 20+ (the demo is built and tested against Node 22 LTS; anything 20+ works)
- pnpm (`npm install -g pnpm`)
- An [Anthropic API key](https://console.anthropic.com/) with Claude Sonnet 4.6 access

## Clone and install

```bash
git clone https://github.com/bgood11/lending-agent
cd lending-agent
pnpm install
```

The install pulls Next.js 16, Tailwind CSS v4, the Vercel AI SDK, and a handful of UI components. Total install size is around 250MB.

## Set the API key

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-api03-...
```

That's the only required environment variable. The demo doesn't talk to any other external services.

## Run the dev server

```bash
pnpm dev
```

Then open <http://localhost:3000>.

You should see the landing page with two routes: I'm an installer / Resume a customer link. Click I'm an installer to start a journey.

## Verifying the install

A 30-second smoke test:

1. Click **I'm an installer**.
2. Type (or speak): *"Five thousand pounds solar panels, ten percent deposit, customer is Test, test at example dot com, oh seven seven hundred nine hundred one two three."*
3. The agent should extract facts and show the customer link card within 5 seconds.
4. Click **Open customer view** in a new tab.
5. The customer chat should open and the agent should greet "Test" within 5 seconds.

If any of those steps fail, check:

- The browser console for fetch errors. A 401 means the API key is wrong.
- The `pnpm dev` terminal for stack traces.
- The Network tab. The chat requests go to `/api/chat/customer` and `/api/chat/installer`.

## Voice input

The microphone uses the [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API). Browser support varies:

| Browser | Status |
| --- | --- |
| Chrome | Works |
| Safari | Works (might need `webkit-` prefix internally) |
| Firefox | Limited support |
| Brave | Often blocks the cloud-side speech recognition; the UI shows a clear error message |

If voice doesn't work, the input falls back to typing. The fact extraction is identical.

## Smoke test

A bash smoke test exercises the journey end-to-end via direct events:

```bash
BASE=http://localhost:3000 bash scripts/smoke.sh
```

It walks six gates plus the audit endpoint and reports pass/fail per step. Useful for verifying that local changes haven't broken the journey before pushing.

## File structure

```
app/                    Next.js App Router routes
  page.tsx              Landing
  installer/            Installer surface
  customer/             Customer surface
  audit/                Audit dashboard
  broker/disclosure/    Broker-hosted disclosure surface (low-trust mode)
  api/                  All server routes
components/             UI components
lib/
  types.ts              CaseState + AgentEvent
  server-store.ts       In-memory case store + seed
  reconcile.ts          Centralised gate reconciliation
  audit.ts              Audit timeline + compliance summary
  decision-engine.ts    Mock lender waterfall
  parser.ts             <agent-event> tag parser
  system-prompts.ts     Installer + customer system prompts
  disclosures.ts        Verbatim disclosure bodies
docs/                   Productisation documentation (in-repo)
scripts/                Smoke tests
```

## Editing the journey

Three files contain almost all of the journey behaviour:

- [`lib/system-prompts.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/system-prompts.ts), the agent's instructions
- [`lib/disclosures.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/disclosures.ts), verbatim regulated content
- [`lib/decision-engine.ts`](https://github.com/bgood11/lending-agent/blob/main/lib/decision-engine.ts), lender panel + waterfall logic

Modifying any of these is sufficient for most demo customisation (different vertical, different lender mix, different rate cards, different disclosure copy).

## Common issues

**Node version too old.** `pnpm dev` complains about an unsupported feature. Upgrade to Node 20+.

**API key not loading.** `.env.local` is in `.gitignore` (correctly). Make sure you've created it from `.env.example` and that the key has no quotes around it.

**Address lookup not working.** The demo uses a mocked postcode lookup. Try `NR1 1AA` for a Norwich address; that's the most reliable test postcode.

**The agent loops on "let me restart from the beginning".** This was a real bug fixed by adding rule R3 to reconciliation. If you see it on a fresh deploy, it means reconciliation isn't being called. Check that [`reconcileSession()`](/architecture/reconciliation/) is invoked at the top of `/api/chat/customer/route.ts`.
