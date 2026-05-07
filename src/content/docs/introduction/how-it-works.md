---
title: How it works
description: The journey from installer voice intake to lender decision, screen by screen, with the regulated gates that govern each step.
---

The journey is a sequence of regulated gates. Each gate produces structured evidence. The model narrates pacing and prose; the deterministic side decides what's happened.

## 1. Installer voice intake

The installer opens the agent on a tablet and speaks naturally:

> *"Seventeen and a half thousand pounds solar plus battery, ten percent deposit, customer is Sarah, sarah at example dot com, oh seven seven hundred nine hundred one two three."*

The agent extracts:

- **Project**: gross value £17,500, deposit £1,750 (10%), product spec `panels_battery`
- **Contact**: first name `Sarah`, email `sarah@example.com`, mobile `07700 900 123`

Mobile is a hard requirement before the customer link is generated. If the installer hasn't said one, the agent asks for it as a one-word follow-up.

## 2. Customer link generated

Once contact is complete, the agent emits `generate_customer_link` and `installer_handoff_complete`. The installer sees a card with the customer URL and a copy button. In production this would also fire a webhook to the retailer's CRM and SMS the link to the customer.

## 3. Status disclosure

The customer opens the link on their phone. The agent greets them by first name, references the project, and tells them what's coming. The first card on screen is the **service status disclosure**: verbatim copy explaining who the broker is, that the broker is not the lender, and what's about to happen. There's an "I understand" button. The customer cannot continue without acknowledging.

## 4. Eligibility check

A four-question structured card:

- Are you 18 or over?
- Are you a UK resident?
- Do you own (or have a mortgage on) the property where the install will be?
- Are you currently employed, self-employed, or retired with regular income?

All four must be Yes to proceed. Any No takes the customer straight to the ineligible path with a plain explanation of which criterion failed and what alternatives exist.

## 5. Indicative quote configurator

The customer sees the loan amount (project minus deposit), term-length chips (typically 84 / 120 / 144 / 180 months), and an indicative monthly payment at the best available rate. Picking a term emits `record_provisional_quote`.

This is **one indicative quote**: not a panel of offers. The customer chooses the term they want at the best APR. Which lender actually approves them at that rate is determined by the [waterfall](/implementation/lenders/waterfall-protocol/) later.

## 6. Email opt-in

A single Yes/No card asking whether the customer wants the quote and cash terms emailed to them. The email field is pre-filled. This step is optional and never blocks the journey.

## 7. Application details (Information Request gate)

A single structured card collects everything else the application needs:

- **About you**: full name, date of birth, mobile if missing
- **Where you live**: postcode (with address picker), property type, residential status
- **Money**: employment status, gross annual income, monthly outgoings, existing commitments

The customer fills the form and taps submit. The UI dispatches `record_personal_facts` + `record_financial_facts` (and `record_customer_contact` for mobile if needed) in one batch.

## 8. Vulnerability check (Consumer Duty)

A short, optional card with five indicators (financial difficulty, long-term health condition, recent significant life event, English not first language, support needed before signing) plus an optional free-text note. The customer can also tick "None of these" or skip entirely.

If anything is flagged, the agent acknowledges plainly and offers a follow-up route. It never pushes for details, never penalises a flag. See [Vulnerable customer protection](/safety/vulnerable-customer-protection/).

## 9. Credit search consent

The agent emits `present_disclosure` with id `credit_search_consent`. The UI renders the verbatim text and Grant / Refuse buttons. If granted, the agent moves on. If refused, the agent explains plainly that without consent the panel can't run a check, and asks if the customer wants to stop or think about it.

## 10. Pre-contract confirmation

After consent, the agent presents the **pre-contract summary**: a verbatim statement that the information given will be used by the lender panel, that the customer must confirm it's true and complete, and that knowingly providing false information may be a criminal offence. The customer taps "I confirm" or "I'd like to amend".

## 11. Submission and sequential waterfall

With consent and pre-contract confirmation in, the agent submits the application to the lender panel. The waterfall is **sequential**: not parallel. Lender 1 (the prime) is asked first. If they decline, the application moves to lender 2, who may decline OR may approve at different terms (a counter-offer). If lender 2 declines or the customer refuses their counter, the application moves to lender 3.

The agent narrates each step in plain language as it happens.

## 12. Counter-offer or decline path

**Counter-offer**: the customer sees a card showing the new APR, monthly, and total payable, with two buttons: "Accept this offer" or "Try the next lender".

**Decline (waterfall exhausted)**: the agent acknowledges plainly that the panel couldn't arrange finance this time. It names the lenders that were tried, doesn't push for retries, and signposts free, independent debt advice (StepChange, Citizens Advice).

## 13. Acceptance and audit

When the customer accepts, the agent confirms the next step (signing the agreement with the chosen lender) and emits `case_complete`. A discreet "View compliance audit log" link appears on every terminal state. It opens the [audit dashboard](/product/audit-and-replay/) with a full timeline and replay engine.
