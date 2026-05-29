# Deployment Guide

## Required Environment Variables

Set these in Vercel Project Settings -> Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GROQ_API_KEY=
```

Notes:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public browser-safe Supabase values.
- `GROQ_API_KEY` is server-only. Do not prefix it with `NEXT_PUBLIC_`.
- Gmail access tokens are not stored as environment variables. They are created through Google OAuth and stored in the user's Supabase session plus an HttpOnly app cookie.

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Enable Google as an auth provider in Supabase Auth.
4. Add production site URLs in Supabase Auth URL settings:
   - Site URL: `https://YOUR-VERCEL-DOMAIN.vercel.app`
   - Redirect URL: `https://YOUR-VERCEL-DOMAIN.vercel.app/auth/callback`
   - Local redirect URL for development: `http://localhost:3000/auth/callback`
5. Make sure each authenticated user has a matching `users_profile.id` row if foreign keys are enforced against `public.users_profile`.

## Google OAuth Setup

In Google Cloud Console:

1. Create or select a project.
2. Configure OAuth consent screen.
3. Create OAuth Client ID for a Web Application.
4. Add Authorized JavaScript origins:
   - `https://YOUR-VERCEL-DOMAIN.vercel.app`
   - `http://localhost:3000`
5. Add Authorized redirect URIs:
   - `https://YOUR-SUPABASE-PROJECT.supabase.co/auth/v1/callback`
   - Supabase handles the Google callback first, then redirects the app to `/auth/callback`.
6. Copy the Google Client ID and Client Secret into Supabase's Google provider settings.

## Gmail API Setup

In Google Cloud Console:

1. Enable Gmail API.
2. OAuth consent screen must include these scopes:
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
3. If the Google OAuth app is in Testing mode, add test users.
4. Users may need to reconnect Gmail after scope changes.

## Groq API Setup

1. Create a Groq API key.
2. Add it to Vercel as `GROQ_API_KEY`.
3. The app uses `llama-3.3-70b-versatile`.

## Vercel Deploy Steps

1. Push the project to GitHub.
2. Import the repo into Vercel.
3. Set Framework Preset to Next.js.
4. Add all required environment variables.
5. Deploy.
6. After deployment, update Supabase Auth URLs and Google OAuth settings with the final Vercel domain.
7. Test in production:
   - Login with Google
   - Connect Gmail
   - Sync emails
   - Classify emails
   - Extract trade details
   - Generate drafts
   - Approve draft
   - Send only after confirmation

## Production Callback URLs

Use these patterns:

```text
App callback:
https://YOUR-VERCEL-DOMAIN.vercel.app/auth/callback

Supabase Google callback:
https://YOUR-SUPABASE-PROJECT.supabase.co/auth/v1/callback

Local app callback:
http://localhost:3000/auth/callback
```

## Production Safety Checks

The app fails safely when required config is missing:

- Missing Supabase URL/key redirects protected routes to login or returns `missing_supabase_config`.
- Missing `GROQ_API_KEY` returns `missing_groq_api_key` from AI routes.
- Missing Gmail OAuth token returns `gmail_not_connected` from Gmail fetch/send routes.
- Server-only secrets are not exposed to client code. Only `NEXT_PUBLIC_*` values are readable in the browser.
