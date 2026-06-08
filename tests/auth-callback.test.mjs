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
  assert.match(callback, /request\.cookies\.set\(name,\s*value\)/);
  assert.match(callback, /response\.cookies\.set\(name,\s*value,\s*options\)/);
  assert.match(callback, /error\s*\|\|\s*!data\.session/);
  assert.match(callback, /NextResponse\.redirect\(dashboardUrl\)/);
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
