---
title: "Data Sub-Processors & Third-Party Services"
slug: "sub-processors"
jurisdiction: "India + United States"
updated: "2026-07-08"
summary: "A transparency list of the third-party service providers SetMyCareer relies on to run its service, what each one does, the personal data it may handle, and where it processes that data."
---

# Data Sub-Processors & Third-Party Services

To run SetMyCareer, we rely on a small number of trusted third-party service providers ("sub-processors") who process personal data **on our behalf and under our instructions**. This page tells you who they are, what they do, what data they may handle, and where. We publish it so you always know who is in the loop.

**Last updated: 8 July 2026**

This page is issued by **Loratis SetMyCareer.Net India Private Limited** ("**SetMyCareer**", "**we**", "**us**") [CONFIRM: exact registered name] [CIN: to be confirmed] and supplements our Privacy Policy. Under the Digital Personal Data Protection Act, 2023 (India) we act as a **Data Fiduciary** and these providers act as our **Data Processors**; under GDPR/UK terms we are the **controller** and they are our **processors** or **sub-processors**; under US privacy laws they are our **service providers / processors / contractors**. In each case they are bound by contract to use the data only to provide their service to us, to keep it secure, and not to sell it.

---

## 1. How we choose and govern sub-processors

- We share **only the personal data necessary** for each provider to perform its function (data minimisation).
- Each provider is engaged under a written contract (a data processing agreement or equivalent terms) requiring appropriate **security safeguards**, confidentiality, breach notification, and use of the data **solely** to provide services to us.
- We **do not sell** your personal data, and we do not permit these providers to use it for their own independent purposes or to "sell" or "share" it as those terms are defined under US privacy laws.
- Where a provider processes data **outside India** or outside your country, we rely on appropriate safeguards and transfer mechanisms permitted under applicable law (see Section 4).
- Some providers also process **children's/minors'** data (for example, when a student takes an assessment or attends a session). We apply additional care and, where required, verifiable parental consent, consistent with the DPDP Act (under 18) and COPPA (under 13).

---

## 2. Current sub-processors and third-party services

The table below lists our current sub-processors by category. "Data shared" describes the categories of personal data each provider may process on our behalf; the exact data depends on how you use SetMyCareer.

> **Note:** Company legal names, corporate groups and hosting regions are indicated to the best of our knowledge and **[CONFIRM: exact legal entity name, contracting entity and data-hosting region for each provider]**. Some providers process data in multiple regions.

| # | Category | Provider | Purpose | Personal data shared | Processing region |
|---|---|---|---|---|---|
| 1 | **Payments** | **Razorpay** (Razorpay Software Private Limited) [CONFIRM] | Processing payments for packages, assessments and sessions in India; order creation and payment verification; refunds | Name, email, phone, billing details, transaction/order IDs, payment status. Card/UPI/bank details are handled by Razorpay as a PCI-DSS-compliant processor — **we do not store full card numbers** | India |
| 2 | **Card processing (US)** | **[CONFIRM: US card processor / gateway, e.g. Stripe or equivalent]** | Processing card payments for US users | Name, email, billing details, transaction IDs, payment status; card data handled by the processor (PCI-DSS) | United States [CONFIRM] |
| 3 | **Live video / voice sessions** | **LiveKit** (LiveKit, Inc.) [CONFIRM] | Real-time infrastructure that powers live video/voice counselling sessions and the live AI voice agent | Audio and video streams during a session, connection/session metadata, participant identifiers | United States / global edge infrastructure [CONFIRM] |
| 4 | **Session recording & transcription** | **Recall.ai** (Recall AI, Inc.) [CONFIRM] | Capturing the **recording and transcript** of counselling sessions (audio/video + AI transcript), which you keep alongside your report and counsellor notes | Session audio/video recordings, transcripts, participant identifiers, timestamps | United States [CONFIRM] |
| 5 | **AI — coach, voice & report generation** | **Groq** (Groq, Inc.) [CONFIRM] | AI inference that powers the AI career coach (text and voice) and helps generate AI career reports | Prompts and conversation content you provide, assessment inputs, and context needed to generate a response/report. **[CONFIRM: whether inputs are excluded from provider model training under our contract]** | United States [CONFIRM] |
| 6 | **AI — model routing / report generation** | **OpenRouter** (OpenRouter, Inc.) [CONFIRM] | Routes AI requests to underlying language-model providers for the AI coach and report generation | Prompts and conversation/assessment content necessary to produce a response; routed to downstream model providers under contract. **[CONFIRM: list of downstream model providers and their training-exclusion terms]** | United States / global [CONFIRM] |
| 7 | **Application data storage** | **Supabase** (Supabase, Inc.) [CONFIRM] | Primary database, authentication and file storage for the app (accounts, assessments, reports, chats, session records) | Account and profile data, contact details, assessment responses and results, reports, chat history, session metadata, and related records | [CONFIRM: hosting region — e.g. Singapore / US / EU] |
| 8 | **Cloud hosting & delivery** | **Vercel** (Vercel, Inc.) [CONFIRM] | Hosting and serving the SetMyCareer website and web app; serverless backend functions | Data in transit for requests you make (e.g. IP address, request metadata, and any content submitted through the app) | Global edge network; primary region [CONFIRM] |
| 9 | **Analytics & advertising** | **Google** (Google LLC — Google Analytics, Google Ads) [CONFIRM] | Website/app analytics and measuring and delivering marketing/advertising | Online identifiers, cookie/device IDs, IP address, pages viewed, and usage/interaction events. Subject to your **cookie and consent choices** | United States / global |

Additional common infrastructure — such as our **email/communications provider** for transactional and support emails, and **SMS/OTP delivery** for login and notifications — may also process limited contact data (name, email, phone) on our behalf. **[CONFIRM: name the specific email and SMS/OTP providers and their regions.]**

---

## 3. What we do *not* do

- We do **not sell** your personal data to anyone.
- We do **not** allow sub-processors to use your data for their **own** marketing or purposes.
- We do **not** share session recordings, transcripts, reports or assessment results with third parties **except** the sub-processors above (each acting only to provide its service to us), your assigned counsellor/expert, and anyone **you** direct us to share with — or where the law requires it.

---

## 4. International data transfers

Several providers listed above process data **outside India** (and outside the US or your home country). Where that happens:

### India (DPDP Act, 2023)

We transfer personal data outside India only as permitted under the Digital Personal Data Protection Act, 2023 and any restrictions the Central Government may notify. We remain accountable to you as the **Data Fiduciary** regardless of where processing takes place. [CONFIRM: any country-specific transfer restrictions once notified under the DPDP framework.]

### United States (California residents — CCPA/CPRA)

Providers that process the personal information of California residents are engaged as **service providers / contractors** under written terms that prohibit selling or sharing the information and restrict use to the specified business purposes. This is **not** a "sale" of personal information.

### EU / UK (GDPR / UK GDPR)

For visitors from the EU or UK, transfers to providers outside the EEA/UK are made under an appropriate safeguard (such as the European Commission's **Standard Contractual Clauses**, the UK **International Data Transfer Addendum**, or an adequacy decision), together with any supplementary measures required. [CONFIRM: which mechanism applies per provider.]

---

## 5. Retention

Each sub-processor holds data only for as long as needed to provide its service and as directed by us. Overall retention of your reports, transcripts, recordings, assessments and account data is governed by our **Privacy Policy** and by your account settings and legal requirements. You can ask us to access, correct, export or delete your data as described in our Privacy Policy and Grievance Redressal Policy.

---

## 6. Changes to this list

Our sub-processors may change as our service evolves — we may add, replace or remove providers. **This list may change, and we will provide notice of material changes** by updating this page (with a new "Last updated" date) and, where required by law or contract, by notifying you or the relevant customer directly. B2B customers who require advance notice of new sub-processors should refer to their agreement with us. We encourage you to check this page periodically.

If you have questions, or want to object to a specific sub-processor, contact our Data Protection Officer:

- **Email:** grievance@setmycareer.com [CONFIRM]
- **General support:** info@setmycareer.com [CONFIRM] · +91-9108510058 · Mon–Sun 09:00–20:00 IST
- **Post:** Data Protection Officer, Loratis SetMyCareer.Net India Private Limited, No. 14/595, 1st Floor, Nanjappa Reddy Layout, Koramangala 8th Block, Bengaluru, Karnataka 560095, India

**Governing law:** This page is governed by the laws of India, and the courts at **Bengaluru, Karnataka** have jurisdiction, without prejudice to the data-protection rights available to you where you live (including in the United States, the EU and the UK).
