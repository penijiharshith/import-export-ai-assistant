import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("OAuth callback exchanges the code and persists Supabase cookies on the redirect response", () => {
  const callback = source("src/app/auth/callback/route.ts");

  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.match(callback, /createSupabaseServerClient\(\)/);
  assert.match(callback, /error\s*\|\|\s*!data\.session/);
  assert.match(callback, /NextResponse\.redirect\(redirectUrl\)/);
});

test("OAuth callback defaults missing next to dashboard", () => {
  const callback = source("src/app/auth/callback/route.ts");

  assert.match(callback, /const nextPath = requestUrl\.searchParams\.get\("next"\) \?\? "\/dashboard"/);
  assert.match(callback, /new URL\(safeNextPath,\s*request\.url\)/);
});

test("OAuth callback allows only safe internal next paths", () => {
  const callback = source("src/app/auth/callback/route.ts");

  assert.match(callback, /function getSafeNextPath/);
  assert.match(callback, /nextPath\.startsWith\("\/"\)/);
  assert.match(callback, /!nextPath\.startsWith\("\/\/"\)/);
  assert.match(callback, /return "\/dashboard"/);
});

test("OAuth callback failure redirects safely to login without raw errors", () => {
  const callback = source("src/app/auth/callback/route.ts");

  assert.match(callback, /\/login\?error=oauth_callback_failed/);
  assert.match(callback, /console\.warn\("oauth_callback_exchange_failed",\s*getSafeAuthErrorDetails\(error\)\)/);
  assert.doesNotMatch(callback, /error\.message/);
  assert.doesNotMatch(callback, /console\.(log|error)/);
  assert.doesNotMatch(callback, /request\.url.*console|requestUrl.*console|code.*console|cookies.*console/i);
});

test("middleware preserves refreshed auth cookies when it redirects", () => {
  const middleware = source("src/middleware.ts");

  assert.match(middleware, /function redirectWithCookies/);
  assert.match(middleware, /response\.cookies\.getAll\(\)\.forEach/);
  assert.match(middleware, /redirectResponse\.cookies\.set\(cookie\)/);
  assert.match(middleware, /redirectWithCookies\(request,\s*response,\s*"\/login"/);
  assert.match(middleware, /redirectWithCookies\(request,\s*response,\s*"\/dashboard"\)/);
});

test("middleware does not intercept the OAuth callback route", () => {
  const middleware = source("src/middleware.ts");

  assert.doesNotMatch(middleware, /auth\/callback/);
});

test("middleware protects all app routes and redirects login users to dashboard", () => {
  const middleware = source("src/middleware.ts");

  assert.match(middleware, /"\/dashboard"/);
  assert.match(middleware, /"\/emails"/);
  assert.match(middleware, /"\/drafts"/);
  assert.match(middleware, /"\/settings"/);
  assert.match(middleware, /"\/supplier-comparison"/);
  assert.match(middleware, /"\/follow-ups"/);
  assert.match(middleware, /matcher:\s*\[/);
  assert.match(middleware, /"\/supplier-comparison\/:path\*"/);
  assert.match(middleware, /"\/follow-ups\/:path\*"/);
  assert.match(middleware, /redirectWithCookies\(request,\s*response,\s*"\/dashboard"\)/);
});

test("login button sends OAuth users back through callback with dashboard next", () => {
  const auth = source("src/lib/auth.ts");

  assert.match(auth, /signInWithOAuth\(\{/);
  assert.match(auth, /provider:\s*"google"/);
  assert.match(auth, /`\$\{window\.location\.origin\}\/auth\/callback\?next=\/dashboard`/);
});

test("root page redirects authenticated users to dashboard", () => {
  const page = source("src/app/page.tsx");

  assert.match(page, /createSupabaseServerClient\(\)/);
  assert.match(page, /supabase\.auth\.getUser\(\)/);
  assert.match(page, /if \(\s*user\s*\)/);
  assert.match(page, /redirect\("\/dashboard"\)/);
  assert.match(page, /redirect\("\/login"\)/);
});

test("browser helper uses Supabase SSR createBrowserClient", () => {
  const helper = source("src/lib/supabase.ts");

  assert.match(helper, /import \{ createBrowserClient \} from "@supabase\/ssr"/);
  assert.match(helper, /createBrowserClient\(supabaseUrl!,\s*supabaseAnonKey!\)/);
  assert.doesNotMatch(helper, /from "@supabase\/supabase-js"/);
});

test("server helper uses Supabase SSR createServerClient with cookie bridge", () => {
  const helper = source("src/lib/supabase-server.ts");

  assert.match(helper, /import \{ createServerClient \} from "@supabase\/ssr"/);
  assert.match(helper, /import \{ cookies \} from "next\/headers"/);
  assert.match(helper, /const cookieStore = await cookies\(\)/);
  assert.match(helper, /createServerClient\(supabaseUrl,\s*supabaseAnonKey/);
  assert.match(helper, /getAll\(\)\s*{\s*return cookieStore\.getAll\(\)/);
  assert.match(helper, /setAll\(cookiesToSet\)/);
  assert.match(helper, /cookieStore\.set\(name,\s*value,\s*options\)/);
});
