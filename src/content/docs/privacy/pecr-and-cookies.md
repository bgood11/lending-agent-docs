---
title: PECR and cookies
description: How PECR applies to the SMS link, the email opt-in, and the storage analysis for the customer surface.
---

The Privacy and Electronic Communications Regulations 2003 (PECR) sit alongside UK GDPR and govern several aspects of a customer journey that UK GDPR alone does not. For Lending Agent the relevant areas are the SMS link that delivers the customer to the surface, the optional email-copy of the application, and the storage analysis on the customer surface itself. The ICO's [direct marketing and PECR](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/) hub is the authoritative reference.

## PECR for the SMS link

The retailer or the broker sends an SMS containing the customer's link to the agent surface. Whether that SMS is "marketing" under PECR depends on its content and purpose, not on the channel.

- **Service messages** are messages necessary for the performance of a service that the customer has requested. A finance application link sent in response to the customer's "I'd like to apply for finance" at the till is a service message: it carries information needed to complete the transaction the customer has initiated.
- **Marketing messages** are messages whose purpose is to promote the firm's products, services, aims or ideals. An unsolicited "we noticed you didn't complete your application, finance is still available" sent days later is harder to justify as a service message and starts to look like marketing.

The ICO's [electronic mail marketing](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/) guidance treats SMS as electronic mail for these purposes. The boundary between service and marketing is content-driven: a single message that contains both ("here's your link, and by the way our other products...") becomes a marketing message in its entirety.

The recommended posture for Lending Agent deployments:

- Keep the initial SMS strictly transactional. Subject, link, identifying retailer, time-of-day expectation, and a clear sender identity. No upsell.
- Document the lawful basis for sending. For a service message issued at the customer's request the basis is typically Article 6(1)(b) (contract or pre-contractual steps).
- Do not send a follow-up reminder unless you have a separate basis (consent, or the soft opt-in for an existing customer).
- Always provide an opt-out instruction in the SMS and honour it within 28 days as PECR requires for marketing.

## Email opt-in: when the soft opt-in helps

The agent offers an optional emailed copy of the application and the pre-contract documents. Sending that email is not marketing if it is the document the customer has just asked for. Sending later marketing emails to that address is, and PECR Regulation 22 applies.

PECR's "soft opt-in" allows a firm to send marketing email to an existing customer about its own similar products **without prior specific consent**: provided that:

- the email address was obtained in the course of a sale or negotiations for a sale to that person;
- the marketing relates to similar products;
- a clear and free opt-out was offered at the point of collection and is offered in every subsequent message.

The ICO's [direct marketing using electronic mail](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-electronic-mail/) guidance is the working source. The soft opt-in is the right route for repeat-sale finance products where the customer has already taken a finance agreement; it is **not** available for prospects who started but did not complete an application.

A practical rule:

- The receipted-document email is a service email; rely on Article 6(1)(b).
- A "did you know" follow-up to a completed customer can rely on the soft opt-in if the conditions are met.
- Anything to a non-customer needs prior specific consent.

## Cookies and similar technologies on the customer surface

PECR Regulation 6 governs storage of, and access to, information on a user's device. It applies to cookies and to **similar technologies**: localStorage, sessionStorage, IndexedDB, fingerprinting, pixel tags. The rule is the same: the user must be told what the technology does, and must consent, unless the storage is **strictly necessary** for the service the user has requested.

Lending Agent's customer surface is engineered to minimise non-essential storage:

- **The seed parameter is in the URL, not in a cookie**. This avoids triggering the cookie regime for the basket-level identifiers; the parameter sits in the navigation rather than in device storage. PECR Regulation 6 is concerned with what the site stores or reads on the device, not with what travels in a URL.
- **A short-lived session token in `sessionStorage`** is used to keep the conversation coherent across page reloads. This is strictly necessary: without it the customer has to start over on every refresh. Strictly necessary storage does not require consent under PECR Regulation 6(4).
- **No analytics cookies by default**. Adding analytics requires a consent banner that meets the ICO's [cookies and similar technologies](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/online-tracking/) bar: prior, specific, informed, freely given, and as easy to refuse as to accept.
- **No advertising or marketing cookies**. The customer surface has no business serving advertising. If a deployment introduces them later, they are not strictly necessary and must be behind consent.

The "strictly necessary" exemption is narrower than firms often assume. The test is whether the service the user has explicitly requested can function without the storage. Convenience for the operator is not strict necessity.

## A note on the URL itself

The URL is not in cookie scope, but it is still personal data. Two consequences:

- The privacy notice should explain what the URL contains and why.
- The URL should not contain anything you would not be content to see in a server access log. The seed contents in [data minimisation](./data-minimisation) are bounded with that in mind.

## A short PECR checklist for deployments

1. Document the SMS template, classify it (service vs marketing), and pin the lawful basis.
2. Decide whether follow-up SMS will be sent and on what basis. Default to "no".
3. Treat the receipted-document email as a service email.
4. If you send marketing email, document whether you rely on consent or soft opt-in for each cohort.
5. Keep the customer surface free of non-essential storage by default. If you add it, add a compliant consent flow at the same time.
6. Maintain a register of cookies and similar technologies used, the purpose of each, and the legal basis.
