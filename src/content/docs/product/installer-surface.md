---
title: Installer surface
description: Voice-first intake on the doorstep. The structured boundary between installer-side and customer-side data capture.
---

The installer surface is one screen. It exists to do one thing: capture project facts and customer contact in seconds, then hand off.

## The intake

The installer opens the agent on a tablet during the appointment. They speak into the microphone. The agent extracts everything it needs from a single utterance, asks for anything missing as a one-word follow-up, and generates the customer link.

A canonical interaction:

> *"Seventeen and a half thousand pounds solar plus battery, ten percent deposit, customer is Sarah, sarah at example dot com, oh seven seven hundred nine hundred one two three."*

Extracted:

```ts
record_project_facts({
  projectValue: 17500,
  depositAmount: 1750,
  depositPct: 10,
  productSpec: "panels_battery"
})
record_customer_contact({
  firstName: "Sarah",
  email: "sarah@example.com",
  mobile: "07700 900 123"
})
generate_customer_link({})
installer_handoff_complete({})
```

## What the installer can capture

| Field | Required | Notes |
| --- | --- | --- |
| `projectValue` | Yes | Gross install cost in GBP |
| `depositAmount` or `depositPct` | Yes | Either one; the agent computes the other |
| `productSpec` | Yes | One of `panels_only`, `panels_battery`, `panels_battery_ev`, `panels_battery_ev_other` |
| `systemKwp` | No | If mentioned (e.g. "6kW system" → 6.0) |
| `batteryKwh` | No | If mentioned (e.g. "10kWh battery" → 10) |
| `firstName` | Yes | Customer's first name |
| `email` | Yes | Customer's email |
| `mobile` | Yes | UK mobile, hard requirement |

The mobile is a hard gate. If the installer hasn't said one in their first utterance, the agent's only follow-up is "Mobile?". The customer link cannot be generated without it because in production the link is sent via SMS.

## The structured boundary

The installer can NOT capture: date of birth, postcode, address, employment status, income, outgoings, residential status, vulnerability indicators, consent.

This is deliberate. The structured boundary between installer-side and customer-side capture is what makes the journey FCA-compliant:

- The retailer is the **introducer**. They don't hold the regulatory permission.
- The installer is on the doorstep. They're not allowed to give credit advice or capture credit-decisioning data.
- Personal financial data goes from the customer's phone, directly to the broker's panel. The retailer never sees it.

If the installer tries to volunteer more, the agent declines and explains that those questions belong on the customer's phone. The system prompt is explicit:

> *"Do NOT ask the customer's date of birth, postcode, address, income, employment status, or any other personal financial information. Those belong to the customer-side conversation and the installer is not the right person to provide them. The structured boundary matters."*

## Voice intake mechanics

The browser-native [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) is what powers the microphone. There's no third-party speech-to-text dependency. This matters for two reasons:

1. **No transcript leaves the browser.** The voice never reaches the server until it's transcribed by the browser.
2. **No vendor lock-in.** Any modern browser supports it. Brave can sometimes block it, in which case the UI falls back to a typed input.

If voice is unavailable for any reason, the installer can type the same utterance. The extraction is identical.

## After handoff

Once `installer_handoff_complete` fires:

1. The installer sees a card with the customer URL and a **Copy link** button.
2. In production, the same event would trigger an SMS to the customer's mobile.
3. In production, the same event would post a webhook to the retailer's CRM with case ID, customer first name, and project value.

The installer's part is over. They can pack up and leave. The customer takes the journey from there on their phone.

## Audit trail

Every installer-side event lands in the audit log with a timestamp:

- `case_created`
- `record_project_facts` (one or more)
- `record_customer_contact` (one or more)
- `generate_customer_link`
- `installer_handoff_complete`

The customer never sees the installer's transcript. The audit log can be filtered by side. See [Audit & replay](/product/audit-and-replay/).
