---
title: Branding and white-labelling
description: How to make the customer journey feel like the retailer's brand without compromising the broker's compliance surface.
---

The customer should experience Lending Agent as a finance journey from the retailer they just met on the doorstep. The broker is named where regulation requires it (the introducer disclosure, the privacy notice, the audit page) but the visual identity, the language register, and the sender ID on the SMS all belong to the retailer.

This page covers what is configurable, where the configuration lives in code, and what stays uniform across every deployment.

## What is configurable per retailer

Per-retailer branding tokens fall into four groups:

1. **Identity.** Retailer name (used in disclosures and the agent's introduction), logo (light and dark variants), favicon.
2. **Palette.** Primary, primary-foreground, accent, accent-foreground, background, foreground, muted, muted-foreground. The build uses Tailwind 4 CSS variables defined in `app/globals.css`.
3. **Typography.** Display font (used for headings) and body font (used for chat). Loaded via `next/font` and aliased to CSS variables.
4. **Voice.** Retailer-specific snippets the agent can interpolate: the company name, how the company refers to its own product (panels, system, install), and the SMS template wording.

Things that are **not** per-retailer:

- The verbatim text of regulated disclosures. Those are the broker's responsibility (see [/implementation/brokers/disclosure-publishing/](/implementation/brokers/disclosure-publishing/)).
- The waterfall protocol or lender panel.
- The vulnerability flow.
- The audit log shape.
- The privacy notice content (the broker is the data controller for the application data).

## Where to swap brand tokens in code

The repo ships with a single brand applied at build time. Productionising for multiple retailers means resolving the brand at request time.

### `app/globals.css`

The palette lives as CSS custom properties:

```css
@theme {
  --color-brand-primary: oklch(0.61 0.18 250);
  --color-brand-primary-foreground: oklch(0.99 0 0);
  --color-brand-accent: oklch(0.83 0.16 90);
  --color-brand-bg: oklch(0.99 0 0);
  --color-brand-fg: oklch(0.18 0.02 250);
  /* ... */
}
```

For multi-tenant use, replace the static `@theme` block with a runtime-injected `<style>` element that sets these variables based on the resolved retailer. The cleanest pattern is to read the retailer slug from the URL path or subdomain in the root layout, look up the brand record, and emit the token block in the document head.

### `components/brand-frame.tsx`

`BrandFrame` is the wrapper that draws the retailer's logo, the company name, and the small "powered by [broker]" introducer line that satisfies the CONC introducer disclosure (see [/regulatory/conc/](/regulatory/conc/)). For multi-tenant use:

```tsx
export function BrandFrame({ retailer, children }: {
  retailer: RetailerBrand;
  children: React.ReactNode;
}) {
  return (
    <div data-retailer={retailer.slug} style={cssVarsFromBrand(retailer)}>
      <header className="flex items-center gap-3 p-4">
        <img src={retailer.logoUrl} alt={retailer.name} className="h-8" />
        <span className="text-sm text-muted-foreground">
          Finance arranged by {retailer.brokerName}, an FCA-authorised credit broker.
        </span>
      </header>
      {children}
    </div>
  );
}
```

The introducer line is mandatory and must not be removed at the retailer's request. It is regulatory content, not branding.

### Agent system prompt

The agent's system prompt (in `lib/system-prompts.ts`) interpolates the retailer name. For multi-tenant use, pass the retailer record into the prompt builder rather than reading it from a constant. The prompt should be the same shape across retailers; only the named entities change. This keeps replay scoring (see [/implementation/brokers/audit-integration/](/implementation/brokers/audit-integration/)) comparable across the whole estate.

## Resolving the retailer at request time

Two viable patterns:

### Path-based

`https://broker.example.com/r/sunhaven/c/<sessionId>` resolves to the Sunhaven Solar brand. Simpler for a single broker domain, requires the URL to carry the retailer slug.

### Subdomain-based

`https://sunhaven.broker.example.com/c/<sessionId>` resolves the brand from the host. Better for retailers who want to point a vanity hostname at the broker (`finance.sunhavensolar.co.uk` via CNAME). Requires wildcard TLS.

Either way, the resolved brand is loaded once per request and threaded through the rendering layer. The brand record itself is a small object:

```ts
interface RetailerBrand {
  slug: string;
  name: string;
  brokerName: string;
  logoUrl: string;
  logoDarkUrl?: string;
  faviconUrl: string;
  palette: Record<string, string>; // CSS variable name -> value
  fonts: { display: string; body: string };
  smsTemplate: string;
  productNoun: string; // "panels", "system", "boiler", etc.
}
```

Store these records in a small per-broker config table keyed by slug. Cache the lookup; the brand changes rarely.

## Per-retailer disclosure customisation

This is a sharp edge. The temptation is to let retailers tweak disclosure wording to match their brand voice. The broker should not allow this.

Disclosures are regulated content. They are the broker's responsibility under CONC and SYSC. The version that was presented is recorded in the audit log, and the broker has to be able to defend that wording to the FCA. If retailers can edit them, the broker loses control of its own compliance evidence.

If a retailer needs different language for a regulated point, raise it with the broker's compliance lead, who decides whether a new version of the disclosure (with a new id) is warranted. See [/implementation/brokers/disclosure-publishing/](/implementation/brokers/disclosure-publishing/) for the version-and-approval flow.

The agent's general patter (greetings, transitions, "shall we move on?") is **not** regulated content and can carry retailer voice through prompt-level interpolation. The verbatim disclosure body cannot.

## Multi-retailer deployment pattern

A broker running Lending Agent across multiple retailers should structure deployment as:

- One broker domain (`broker.example.com`) hosting the customer-facing app.
- One brand registry (a small Postgres table or KV store) keyed by retailer slug.
- One disclosure registry, owned by the broker, version-controlled and approval-gated.
- Per-retailer webhook subscriptions pointing at the retailer's CRM.
- Per-retailer SMS sender configuration (handed back to the retailer's SMS pipeline; see [/implementation/retailers/integration-patterns/](/implementation/retailers/integration-patterns/)).

For a small estate (under five retailers) a single Vercel project per retailer is acceptable, with brand baked at build time. Above that, multi-tenant resolution is operationally necessary.

## What the customer sees

Hard rule: a customer should never see the broker's brand in the chat surface, only the retailer's. The broker appears in two places:

1. The introducer line in `BrandFrame` ("Finance arranged by [broker]...").
2. The privacy notice, linked from the chat footer.

Everywhere else (chat avatars, page chrome, SMS sender ID, application form headings) is retailer-branded. This matches the regulatory model: the retailer introduces, the broker arranges. The customer's mental model and the regulatory model line up.

## Brand QA checklist

Before turning a retailer live, walk through:

- Logo renders cleanly on light and dark surfaces.
- Palette passes WCAG AA contrast (the chat surface is read on phones in sunlight; aim for AAA on body text).
- The introducer line is visible above the fold on the customer landing page.
- The SMS sender ID is the retailer, not the broker.
- The agent's first message uses the retailer's product noun ("your panels", "your boiler") rather than a generic placeholder.
- The favicon updates per retailer (small detail, big tell).
- Per-retailer audit pages are still accessible to the broker's compliance team but not to other retailers.

The next page on adoption ([/implementation/retailers/pilot-playbook/](/implementation/retailers/pilot-playbook/)) covers how to run a controlled pilot before scaling brand work across the whole installer base.
