# Import Export AI Assistant

Full-stack AI workspace for import/export teams to review Gmail messages, extract trade details, classify email intent, generate reply drafts, and manage supplier follow-ups with human approval.

## Live Demo

Live app: https://import-export-ai-assistant-psi.vercel.app

## Problem

Import/export workflows often happen inside email threads: suppliers send quotes, buyers ask for updates, and shipment details are scattered across messages. Manually reading each email, extracting product and pricing details, drafting replies, and tracking follow-ups is slow and easy to miss.

## Solution

Import Export AI Assistant connects a Next.js dashboard to Supabase, Gmail, and Groq-powered AI routes. It syncs Gmail messages, classifies trade emails, extracts structured trade details, suggests next actions, generates reply drafts, compares supplier quotes, and keeps a human approval step before sending any email.

## Key Features

- Google sign-in through Supabase Auth with Gmail provider-token handling.
- Gmail message fetch and sync routes that store messages in Supabase.
- AI email classification for import/export business messages.
- Trade detail extraction for product, supplier, pricing, shipment, and follow-up context.
- Reply draft generation with review, approval, revision, and send workflows.
- Human-in-the-loop approval before Gmail send actions.
- Follow-up list with dismiss and done actions.
- HS-code suggestions, landed-cost estimates, market-price estimates, and supplier comparisons.
- Supplier quote listing and deletion.
- Quotation PDF generation with `jsPDF` and `jspdf-autotable`.
- Route-level tests for auth callback, AI JSON handling, RLS/security assumptions, suggestions, and rate-limit behavior.

## Tech Stack

- **Frontend:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes
- **Auth and database:** Supabase Auth, Supabase Postgres
- **AI:** Groq SDK using `llama-3.3-70b-versatile`
- **Email integration:** Gmail API via Google OAuth provider token
- **PDF export:** `jsPDF`, `jspdf-autotable`
- **Testing:** Node test runner with `.mjs` route/helper tests

## Architecture and Workflow

1. A user signs in with Google through Supabase Auth.
2. The auth callback exchanges the OAuth code and stores the Gmail provider token in an HttpOnly cookie.
3. Gmail API routes fetch or sync messages into Supabase.
4. AI routes classify emails, extract trade details, generate drafts, suggest actions, estimate costs, suggest HS codes, and compare suppliers.
5. The dashboard displays emails, drafts, follow-ups, supplier comparisons, and trade insights.
6. Drafts must be reviewed and approved before the send route uses Gmail to send a reply.

## Setup

```bash
git clone <repo-url>
cd import-export-ai-assistant
cp .env.example .env.local
npm install
```

Create a Supabase project, apply `supabase/schema.sql`, and configure Google as a Supabase Auth provider with Gmail scopes.

## Environment Variables

Use `.env.example` as the template:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL used by browser and server clients. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key used by browser and server clients. |
| `GROQ_API_KEY` | Yes | Groq API key for AI classification, extraction, drafts, and trade helpers. |
| `GROQ_MODEL` | Optional | Model name; defaults are handled in the AI helper code. |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Present in the template for future admin workflows; current code primarily uses user-scoped Supabase clients. |
| `GOOGLE_CLIENT_ID` | No | Configure this in the Supabase Google provider dashboard. |
| `GOOGLE_CLIENT_SECRET` | No | Configure this in the Supabase Google provider dashboard. |
| `NEXTAUTH_SECRET` | No | Legacy placeholder; the current app uses Supabase Auth. |

## Run Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run lint
npm run build
node --test tests/*.mjs
```

## Project Structure

```text
src/app/                 Next.js pages and API routes
src/app/api/ai/          Groq-backed trade intelligence routes
src/app/api/gmail/       Gmail fetch and sync routes
src/app/api/drafts/      Draft review, update, approval, and send routes
src/components/          Dashboard, email, draft, follow-up, and supplier UI
src/lib/                 Supabase, Gmail, AI, dashboard, draft, and PDF helpers
supabase/                Schema and migration SQL files
tests/                   Node test-runner coverage for core route behavior
public/                  Static assets
```

## API Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/ai/classify-emails` | Classify stored emails. |
| `POST` | `/api/ai/extract-trade-details` | Extract trade details from email content. |
| `POST` | `/api/ai/generate-drafts` | Generate reply drafts. |
| `POST` | `/api/ai/suggest-actions` | Suggest next actions. |
| `POST` | `/api/ai/hs-code` | Suggest HS-code guidance. |
| `POST` | `/api/ai/landed-cost` | Estimate landed-cost details. |
| `POST` | `/api/ai/market-price-estimate` | Estimate market pricing context. |
| `POST` | `/api/ai/compare-suppliers` | Compare supplier quotes. |
| `GET` | `/api/gmail/messages` | Fetch Gmail messages using the provider token. |
| `POST` | `/api/gmail/sync` | Sync Gmail messages into Supabase. |
| `PATCH` | `/api/drafts/:id` | Update draft content or status. |
| `POST` | `/api/drafts/:id/approve` | Mark a draft as approved. |
| `POST` | `/api/drafts/:id/needs-revision` | Mark a draft for revision. |
| `POST` | `/api/drafts/:id/send` | Send an approved draft through Gmail. |
| `GET` | `/api/follow-ups` | List follow-up items. |
| `POST` | `/api/follow-ups/:id/done` | Mark a follow-up done. |
| `POST` | `/api/follow-ups/:id/dismiss` | Dismiss a follow-up. |
| `GET` | `/api/supplier-quotes` | List supplier quotes. |
| `DELETE` | `/api/supplier-quotes/:id` | Delete a supplier quote. |

## Screenshots and Demo

Screenshots are not committed yet. Recommended additions:

- Dashboard showing synced trade emails and classification labels.
- Draft review page showing approve / needs-revision workflow.
- Supplier comparison view.
- Short GIF showing Gmail sync to AI-generated draft.

## Challenges Solved

- Handling Gmail provider-token access securely through the auth callback.
- Keeping AI responses structured enough for UI workflows.
- Adding human approval before any email send action.
- Sanitizing AI quota and error behavior so users do not see raw provider details.
- Keeping trade-specific AI helpers separated by purpose instead of one large endpoint.

## What I Learned

- How to combine Supabase Auth, Gmail OAuth, and Next.js server routes.
- How to design AI workflows that assist users without skipping approval.
- How to structure trade-specific AI features around real business tasks.
- How to test route behavior around auth, AI parsing, and rate-limit edge cases.

## Future Improvements

- Add committed screenshots and a short demo GIF.
- Add more integration tests around Gmail sync and draft send workflows.
- Add richer filtering and search for synced emails and supplier quotes.
- Add deployment notes for Supabase schema setup and Google OAuth redirect URLs.

## Interview Explanation

**Problem:** Import/export email workflows are manual, repetitive, and detail-heavy.

**Solution:** I built a full-stack AI dashboard that syncs Gmail messages, extracts trade details, classifies emails, generates drafts, and keeps a human approval step before sending.

**My role:** I designed and implemented the Next.js app, Supabase data flow, Gmail integration, AI routes, draft workflow, and tests.

**Tech stack:** Next.js, React, TypeScript, Supabase, Gmail API, Groq, Tailwind CSS, Node test runner.

**Main features:** Gmail sync, AI classification, detail extraction, reply drafts, follow-ups, supplier comparison, PDF quotation export.

**Challenges:** OAuth provider-token handling, safe draft approval flow, structured AI output parsing, route-level error handling, and quota-safe AI behavior.

**Output/demo:** A deployed app is available at https://import-export-ai-assistant-psi.vercel.app.

## License

MIT
