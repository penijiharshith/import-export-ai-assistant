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

const aiRoutes = [
  "src/app/api/ai/classify-emails/route.ts",
  "src/app/api/ai/compare-suppliers/route.ts",
  "src/app/api/ai/extract-trade-details/route.ts",
  "src/app/api/ai/generate-drafts/route.ts",
  "src/app/api/ai/hs-code/route.ts",
  "src/app/api/ai/landed-cost/route.ts",
  "src/app/api/ai/market-price-estimate/route.ts",
  "src/app/api/ai/suggest-actions/route.ts",
];

test("Groq client validates server-only API key and wraps provider failures safely", () => {
  const groq = source("src/lib/ai/groq.ts");

  assert.match(groq, /process\.env\.GROQ_API_KEY\?\.trim\(\)/);
  assert.match(groq, /throw new AiConfigurationError\(\)/);
  assert.match(groq, /AI service configuration is invalid/);
  assert.match(groq, /AI service is temporarily unavailable/);
  assert.match(groq, /AI provider returned an empty response/);
  assert.doesNotMatch(groq, /NEXT_PUBLIC_.*GROQ/);
  assert.doesNotMatch(groq, /NEXT_PUBLIC_.*OPENAI/);
});

test("AI API routes return sanitized JSON for missing API key before provider calls", () => {
  for (const routePath of aiRoutes) {
    const route = source(routePath);

    assert.match(route, /aiConfigurationErrorBody/);
    assert.match(route, /isAiConfigured\(\)/);
    assert.match(route, /jsonWithCookies|NextResponse\.json/);
  }
});

test("AI API routes do not forward raw provider error messages to the frontend", () => {
  const providerRoutes = aiRoutes.filter((routePath) => !routePath.includes("classify-emails"));

  for (const routePath of providerRoutes) {
    const route = source(routePath);

    assert.doesNotMatch(route, /message:\s*suggestionError\.message/);
    assert.doesNotMatch(route, /message:\s*calculationError\.message/);
    assert.doesNotMatch(route, /message:\s*estimateError\.message/);
    assert.doesNotMatch(route, /message:\s*comparisonError\.message/);
    assert.match(route, /aiConfigurationErrorBody\(\)|AI_PROVIDER_ERROR_MESSAGE|aiProviderErrorBody\(\)/);
  }
});

test("AI frontend handlers read text before parsing JSON and handle empty bodies", () => {
  const helper = source("src/lib/api-response.ts");

  assert.match(helper, /await response\.text\(\)/);
  assert.match(helper, /if \(!body\.trim\(\)\)/);
  assert.match(helper, /JSON\.parse\(body\)/);
  assert.match(helper, /catch\s*{/);

  for (const componentPath of [
    "src/components/emails/classify-emails-button.tsx",
    "src/components/emails/extract-trade-details-button.tsx",
    "src/components/emails/suggest-next-actions-button.tsx",
    "src/components/drafts/generate-drafts-button.tsx",
  ]) {
    const component = source(componentPath);

    assert.match(component, /readJsonResponse\(response\)/);
    assert.match(component, /getUserFacingApiError/);
    assert.doesNotMatch(component, /await response\.json\(\)/);
  }
});

test("AI routes include successful JSON envelopes", () => {
  for (const routePath of aiRoutes) {
    assert.match(source(routePath), /ok:\s*true|ok:\s*errors\.length === 0/);
  }
});
