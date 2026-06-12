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

test("suggestion parser accepts non-perfect provider JSON without throwing", () => {
  const suggester = source("src/lib/ai/suggest-next-action.ts");

  assert.match(suggester, /parseJsonObject\(content\)/);
  assert.match(suggester, /normalizeSuggestion\(parseJsonObject\(content\)\)/);
  assert.doesNotMatch(suggester, /JSON\.parse\(content\)/);
});

test("suggestion API returns clean no-op responses for non-trade and missing-detail cases", () => {
  const route = source("src/app/api/ai/suggest-actions/route.ts");

  assert.match(route, /NO_TRADE_MESSAGE/);
  assert.match(route, /NEED_MORE_DETAILS_MESSAGE/);
  assert.match(route, /suggestions:\s*\[\]/);
  assert.match(route, /hasUsefulTradeDetails/);
  assert.match(route, /skippedForDetails \+= 1/);
  assert.match(route, /payment_issue/);
  assert.match(route, /errors\.length \? \{ status: suggestions\.length > 0 \? 207 : 502 \} : undefined/);
});

test("suggestion frontend treats empty successful suggestions as valid UI state", () => {
  const button = source("src/components/emails/suggest-next-actions-button.tsx");

  assert.match(button, /readJsonResponse\(response\)/);
  assert.match(button, /suggestions\?: unknown\[\]/);
  assert.match(button, /data\?\.message \?\? "No trade-related action is required\."/);
  assert.doesNotMatch(button, /await response\.json\(\)/);
});
