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

test("Groq rate limits are typed, retry-aware, and do not use SDK auto-retries", () => {
  const groq = source("src/lib/ai/groq.ts");

  assert.match(groq, /RateLimitError/);
  assert.match(groq, /class AiRateLimitError extends Error/);
  assert.match(groq, /readonly retryAfterSeconds/);
  assert.match(groq, /retry-after-ms/);
  assert.match(groq, /retry-after/);
  assert.match(groq, /new Groq\(\{ apiKey, maxRetries: 0, timeout: 30_000 \}\)/);
  assert.match(groq, /throw new AiRateLimitError\(parseRetryAfterSeconds/);
  assert.doesNotMatch(groq, /NEXT_PUBLIC_.*GROQ/);
});

test("classification stops immediately on 429 and preserves unprocessed email categories", () => {
  const route = source("src/app/api/ai/classify-emails/route.ts");

  assert.match(route, /isAiRateLimitError\(classificationError\)/);
  assert.match(route, /const unprocessed = emailRows\.length - results\.length/);
  assert.match(route, /classification_status:\s*"retry"/);
  assert.match(route, /return jsonWithCookies\(/);
  assert.match(route, /partial:\s*true/);
  assert.match(route, /rateLimited:\s*true/);
  assert.match(route, /retryAfterSeconds/);
  assert.doesNotMatch(route, /category:\s*"other" as const/);
});

test("extract and suggest return sanitized quota messages without raw provider details", () => {
  for (const routePath of [
    "src/app/api/ai/extract-trade-details/route.ts",
    "src/app/api/ai/suggest-actions/route.ts",
  ]) {
    const route = source(routePath);

    assert.match(route, /isAiRateLimitError/);
    assert.match(route, /aiRateLimitErrorBody/);
    assert.match(route, /\{ status: 429 \}/);
    assert.doesNotMatch(route, /rate_limit_exceeded/);
    assert.doesNotMatch(route, /tokens-per-day/i);
    assert.doesNotMatch(route, /provider.*headers/i);
  }
});
