# Import Export AI Assistant
Import Export AI Assistant is a Next.js trade workspace for Gmail-connected import/export email review, AI classification, trade detail extraction, draft generation, follow-ups, supplier comparison, and quotation PDF export.

## Features
- Google sign-in through Supabase Auth with Gmail read/send scopes.
- Gmail message fetch and sync routes that store messages in Supabase.
- AI email classification, trade-detail extraction, reply draft generation, next-action suggestions, HS-code suggestions, landed-cost estimates, market-price estimates, and supplier comparisons.
- Draft review, approve, needs-revision, and send workflows.
- Follow-up listing, dismiss, and done actions.
- Supplier quote storage, comparison, and deletion.
- Quotation PDF generation with jsPDF.

## Auth Setup
1. Create a Supabase project and apply `supabase/schema.sql`.
2. Enable Google as a Supabase Auth provider.
3. In the Google OAuth client, add the app origin and the Supabase callback URL.
4. The browser starts login with `supabase.auth.signInWithOAuth({ provider: "google" })`.
5. The callback route at `/auth/callback` exchanges the code for a Supabase session and stores the Gmail provider token in an HttpOnly cookie named `gmail_provider_token`.
6. Gmail routes require the Supabase session and the provider token before fetching or syncing messages.

## Tech Stack
- Language: TypeScript
- Framework: Next.js 16, React 19
- Database: Supabase Postgres
- Ollama model: `qwen2.5-coder:7b`

## Prerequisites
- Node.js 20 or newer
- npm
- Supabase project with `supabase/schema.sql` applied
- Google OAuth credentials configured in Supabase Auth
- Ollama running locally
- `ollama pull qwen2.5-coder:7b`

## Setup
1. `git clone <repo> && cd import-export-ai-assistant`
2. `cp .env.example .env.local` - fill in your values
3. `npm install`
4. `ollama serve`
5. `npm run dev`

## Environment Variables
| Variable | Required | Description |
|---|---|---|
| `OLLAMA_MODEL` | Yes | Local Ollama model used by AI routes. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public Supabase project URL used by browser and server clients. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public Supabase anon key used by browser and server clients. |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Placeholder for server-side admin workflows; current source does not read it. |
| `GOOGLE_CLIENT_ID` | No | Configure this in the Supabase Google provider dashboard. |
| `GOOGLE_CLIENT_SECRET` | No | Configure this in the Supabase Google provider dashboard. |
| `NEXTAUTH_SECRET` | No | Placeholder for auth stacks that use NextAuth; current source uses Supabase Auth. |
| `NEXTAUTH_URL` | No | Local app URL placeholder; current source builds callback URLs from the request origin. |

## Project Structure
- `import-export-ai-assistant/LICENSE` - MIT license.
- `import-export-ai-assistant/postcss.config.mjs` - PostCSS config.
- `import-export-ai-assistant/supabase/` - Database schema.
- `import-export-ai-assistant/public/` - Static assets.
- `import-export-ai-assistant/.gitignore` - Git ignore rules.
- `import-export-ai-assistant/package.json` - Next.js scripts and dependencies.
- `import-export-ai-assistant/package-lock.json` - npm lockfile.
- `import-export-ai-assistant/DEPLOYMENT.md` - Deployment notes.
- `import-export-ai-assistant/tsconfig.json` - TypeScript config.
- `import-export-ai-assistant/.env.example` - Environment template.
- `import-export-ai-assistant/src/` - App source.
- `import-export-ai-assistant/src/app/` - Next.js pages and API routes.
- `import-export-ai-assistant/src/components/` - UI components.
- `import-export-ai-assistant/src/lib/` - Supabase, Gmail, AI, draft, dashboard, and PDF helpers.

## API Endpoints
| Method | Path | Description |
|---|---|---|
| POST | `/api/ai/classify-emails` | Classify stored emails. |
| POST | `/api/ai/compare-suppliers` | Compare selected supplier quotes. |
| POST | `/api/ai/extract-trade-details` | Extract product, price, shipment, and supplier details. |
| POST | `/api/ai/generate-drafts` | Generate email reply drafts. |
| POST | `/api/ai/hs-code` | Suggest an HS code for an email's product. |
| POST | `/api/ai/landed-cost` | Estimate landed cost for extracted trade details. |
| POST | `/api/ai/market-price-estimate` | Estimate competitive market pricing. |
| POST | `/api/ai/suggest-actions` | Generate next-action suggestions. |
| GET | `/api/auth/debug` | Return auth/session debugging data. |
| POST | `/api/auth/signout` | Sign out and clear auth cookies. |
| POST | `/api/drafts/:id/approve` | Mark a draft approved. |
| POST | `/api/drafts/:id/needs-revision` | Mark a draft as needing revision. |
| PATCH | `/api/drafts/:id` | Update draft content/status. |
| POST | `/api/drafts/:id/send` | Send an approved draft through Gmail. |
| POST | `/api/emails/:id/archive` | Archive an email. |
| GET | `/api/follow-ups` | List follow-ups. |
| POST | `/api/follow-ups/:id/dismiss` | Dismiss a follow-up. |
| POST | `/api/follow-ups/:id/done` | Mark a follow-up done. |
| GET | `/api/gmail/messages` | Fetch latest Gmail messages using the provider token. |
| POST | `/api/gmail/sync` | Sync Gmail messages into Supabase. |
| GET | `/api/supplier-quotes` | List supplier quotes. |
| DELETE | `/api/supplier-quotes/:id` | Delete one supplier quote. |

## License
MIT
