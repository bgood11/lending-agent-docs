---
title: Custom domain
description: Wiring your own domain to a Vercel deploy. DNS records, HTTPS, redirects.
---

The Vercel auto-generated URL (`lending-agent-yourname.vercel.app`) works for a demo. For anything you'd send to a stakeholder, a real domain reads better.

## Add the domain

```bash
vercel domains add yourdomain.co.uk
```

The CLI prints the DNS records you need to add. Two typical patterns:

**Apex domain (`yourdomain.co.uk`)**: an A record pointing to Vercel's IP, or an ALIAS / ANAME if your DNS provider supports it.

```
Type    Name    Value
A       @       76.76.21.21
```

**Subdomain (`docs.yourdomain.co.uk`)**: a CNAME pointing to `cname.vercel-dns.com`.

```
Type    Name    Value
CNAME   docs    cname.vercel-dns.com
```

## DNS propagation

DNS changes take anywhere from a few minutes to a few hours to propagate. Most modern DNS providers (Cloudflare, Namecheap, GoDaddy) update within 5-10 minutes. You can check propagation with:

```bash
dig yourdomain.co.uk
```

Or any of the online "DNS checker" tools.

## HTTPS

Vercel automatically provisions a Let's Encrypt certificate as soon as the DNS is configured. No action needed. The certificate auto-renews.

Within a few minutes of DNS propagating, `https://yourdomain.co.uk` will serve your deploy with a valid HTTPS certificate.

## www vs apex

Most setups want both `yourdomain.co.uk` and `www.yourdomain.co.uk` to work. Add both:

```bash
vercel domains add yourdomain.co.uk
vercel domains add www.yourdomain.co.uk
```

In the Vercel dashboard, set one as primary and the other as a 308 redirect to it. Either direction is valid; what matters is consistency.

## Subdomain strategy

If you're running multiple environments or services on the same domain:

| Subdomain | Purpose |
| --- | --- |
| `yourdomain.co.uk` | Marketing site / landing |
| `app.yourdomain.co.uk` | The customer journey deploy |
| `docs.yourdomain.co.uk` | This documentation site |
| `audit.yourdomain.co.uk` | The audit dashboard, behind broker SSO |

The demo doesn't enforce any particular split. In production, splitting the customer journey from the audit dashboard makes the SSO requirements simpler (the audit subdomain has authentication, the customer journey doesn't).

## Redirects

If you've got an existing domain with traffic and you're switching to a Vercel deploy, set up redirects from the old paths to the new ones. For a Next.js project, the canonical place is `next.config.ts`:

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/old-path", destination: "/new-path", permanent: true },
      { source: "/legacy-finance/:path*", destination: "/finance/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
```

`vercel.json` accepts the same shape if you would rather declare redirects at the platform layer.

## Domain ownership

If your domain is registered with a third-party registrar (e.g. 123-reg, GoDaddy, Cloudflare Registrar) and your DNS is hosted there, the Vercel CLI gives you the records to add at the registrar's DNS panel.

If your DNS is hosted at Vercel (you've delegated nameservers to Vercel), the CLI manages everything for you.

Most demo deployments use the registrar-managed DNS pattern. Vercel-managed DNS is simpler if you want one-stop management.

## A real-world example

The Lending Agent demo's primary URL is `lending-agent.vercel.app`. The author owns `lendingagent.co.uk` separately. Adding the custom domain is a one-liner:

```bash
vercel domains add lendingagent.co.uk
```

Then add the DNS records the CLI prints. After propagation, the same deploy is reachable at both URLs.

## What to do with the old URL

After adding a custom domain, the original `lending-agent-yourname.vercel.app` URL still works. It can either redirect to the custom domain (recommended for cleanliness) or stay accessible (useful for testing without DNS in the loop).

To redirect, use the `has` matcher in `next.config.ts` to scope the rule to the Vercel-generated host:

```ts
// next.config.ts
async redirects() {
  return [
    {
      source: "/:path*",
      has: [{ type: "host", value: "lending-agent-yourname.vercel.app" }],
      destination: "https://yourdomain.co.uk/:path*",
      permanent: true,
    },
  ];
}
```

## Multiple domains, one deploy

A single Vercel deploy can serve multiple domains. Useful for white-labelled deployments where one broker runs multiple retailer-branded versions of the journey:

```bash
vercel domains add finance.acme-solar.co.uk
vercel domains add finance.beta-installs.co.uk
vercel domains add finance.gamma-renewables.co.uk
```

The codebase reads the request hostname and applies the matching retailer brand. Implementation: a server-side header check at the top of the layout component.

This isn't built into the demo. It would be a productisation step. See [Branding & white-label](/implementation/retailers/branding/).
