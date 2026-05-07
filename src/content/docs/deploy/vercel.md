---
title: Vercel deployment
description: Deploy your own copy to Vercel. Production-ready in 10 minutes.
---

The demo runs on Vercel's free tier. The Vercel CLI takes care of build, deploy, and domain configuration.

## Steps

### 1. Fork or clone the repo

```bash
gh repo fork bgood11/lending-agent --clone
cd lending-agent
```

Or clone directly if you don't need a fork:

```bash
git clone https://github.com/bgood11/lending-agent
cd lending-agent
```

### 2. Install the Vercel CLI

```bash
pnpm install -g vercel
```

### 3. Link to a Vercel project

```bash
vercel link
```

You'll be asked which scope (personal or team) and which project (or to create a new one). Choose your preferred scope and let it create a new project named `lending-agent` (or whatever you prefer).

This creates a `.vercel/project.json` file linking your local checkout to the Vercel project. It's gitignored.

### 4. Set the API key as a production environment variable

```bash
vercel env add ANTHROPIC_API_KEY production
```

Paste your Anthropic API key when prompted. The CLI will encrypt and store it server-side.

### 5. Deploy

```bash
vercel deploy --prod
```

The first deploy takes 1-2 minutes (build + edge propagation). You'll get a URL like `https://lending-agent-yourname.vercel.app`.

Open it. Walk a journey to confirm.

## Auto-deploys on push

Vercel can auto-deploy on every push to your fork's main branch. To enable:

```bash
vercel git connect
```

This connects the Vercel project to your GitHub fork. After connecting, every push to `main` triggers a production deploy. Pushes to other branches create preview deploys at `https://lending-agent-git-<branch>-yourname.vercel.app`.

## Cost expectations

Per customer journey:

- ~10-20 model calls (each ~£0.001 at current Sonnet 4.6 rates)
- Total: roughly £0.02 per completed journey

The replay engine adds calls on demand. A 5-run replay across 3 disclosures = 15 model calls = ~£0.015 per replay run.

For a demo deployment with low traffic, expect monthly costs in pounds, not pence and not tens of pounds.

For higher-traffic deployments, the cost driver is model calls. Caching and batching strategies can reduce this; see [Production hardening](/deploy/production-hardening/).

## Vercel's "personal" vs "team" scopes

Vercel has two scope types: personal (free hobby tier) and team. The demo runs fine on personal.

If you want commercial use (custom domains beyond personal-account limits, enhanced support, more aggressive caching), upgrade the project's scope to a team. The CLI flow is:

```bash
vercel teams add lending-agent
vercel link --scope your-team-name
```

## Build configuration

Out of the box, Vercel detects Next.js and configures the build automatically. No `vercel.json` needed.

If you want to customise:

- `buildCommand`: defaults to `pnpm build`
- `installCommand`: defaults to `pnpm install`
- `outputDirectory`: defaults to `.next`
- `framework`: detected as `nextjs`

Vercel's TypeScript config (`vercel.ts`) is supported. The demo doesn't ship one because the defaults are correct.

## Logs and monitoring

The Vercel dashboard surfaces:

- **Function logs**: every server-side request, with status codes and durations
- **Runtime logs**: console output from server functions
- **Build logs**: per-deploy build output
- **Analytics**: traffic, top pages, top function invocations (paid tier)

For debugging the agent specifically: open a customer URL with `?demo=1`, walk a journey, and check Function logs for `/api/chat/customer` invocations. The chat route logs Anthropic call failures with stack traces.

## Custom domain

Once you've got a working deploy, add a custom domain:

```bash
vercel domains add yourdomain.co.uk
```

The CLI prints the DNS records you need to add (typically a CNAME for `www` and an A record or ALIAS for the apex). Follow the instructions for your DNS provider; most updates propagate in a few minutes.

See [Custom domain](/deploy/custom-domain/) for the full DNS configuration.

## CI

Vercel's auto-deploy is enough CI for a demo. For production:

- **Linting and type-checking on PR**: GitHub Actions running `pnpm lint && pnpm build` before merge.
- **Replay regression**: a corpus of historical cases stored in CI, replayed against any model or prompt change. See [Audit & replay integration](/implementation/brokers/audit-integration/).
- **Smoke tests on staging**: deploy to a preview, run `bash scripts/smoke.sh BASE=$PREVIEW_URL`, gate prod promotion on the result.

## Rolling back

If a deploy breaks something:

```bash
vercel rollback
```

Vercel maintains the previous production deploy as a hot standby. Rollback is instant. The bad deploy is still archived; you can inspect it via the dashboard.

For more controlled rollouts (canary deploys, gradual rollout), Vercel's Rolling Releases feature handles this; the demo is too small to need it.
